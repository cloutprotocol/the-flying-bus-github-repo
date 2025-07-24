import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Security service for invitation claim process
 * Implements rate limiting, audit logging, and security validations
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class InvitationSecurityService {
  private static readonly RATE_LIMIT_WINDOW_MINUTES = 15;
  private static readonly MAX_TOKEN_VALIDATION_ATTEMPTS = 5;
  private static readonly MAX_CLAIM_ATTEMPTS = 3;
  private static readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 10;

  /**
   * Rate limiting for token validation attempts
   * Requirements: 6.1, 6.3
   */
  async checkTokenValidationRateLimit(ipAddress: string, token?: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    resetTime: Date;
    reason?: string;
  }> {
    try {
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - this.RATE_LIMIT_WINDOW_MINUTES);

      // Check attempts by IP address
      const { data: ipAttempts, error: ipError } = await supabase
        .from('security_audit_log')
        .select('id')
        .eq('ip_address', ipAddress)
        .eq('event_type', 'token_validation_attempt')
        .gte('created_at', windowStart.toISOString());

      if (ipError) {
        logger.error(LogSource.AUTH, 'Error checking IP rate limit', ipError);
        // Fail secure - deny if we can't check
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: new Date(Date.now() + this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000),
          reason: 'Unable to verify rate limit'
        };
      }

      const ipAttemptCount = ipAttempts?.length || 0;

      // Check attempts for specific token if provided
      let tokenAttemptCount = 0;
      if (token) {
        const { data: tokenAttempts, error: tokenError } = await supabase
          .from('security_audit_log')
          .select('id')
          .eq('token_hash', this.hashToken(token))
          .eq('event_type', 'token_validation_attempt')
          .gte('created_at', windowStart.toISOString());

        if (tokenError) {
          logger.error(LogSource.AUTH, 'Error checking token rate limit', tokenError);
          return {
            allowed: false,
            remainingAttempts: 0,
            resetTime: new Date(Date.now() + this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000),
            reason: 'Unable to verify token rate limit'
          };
        }

        tokenAttemptCount = tokenAttempts?.length || 0;
      }

      // Check if either limit is exceeded
      const ipLimitExceeded = ipAttemptCount >= this.MAX_TOKEN_VALIDATION_ATTEMPTS;
      const tokenLimitExceeded = token && tokenAttemptCount >= this.MAX_TOKEN_VALIDATION_ATTEMPTS;

      if (ipLimitExceeded || tokenLimitExceeded) {
        const resetTime = new Date(Date.now() + this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
        const reason = ipLimitExceeded ? 'IP rate limit exceeded' : 'Token rate limit exceeded';
        
        // Log suspicious activity
        await this.logSecurityEvent({
          eventType: 'rate_limit_exceeded',
          ipAddress,
          tokenHash: token ? this.hashToken(token) : undefined,
          details: { reason, attemptCount: Math.max(ipAttemptCount, tokenAttemptCount) },
          severity: 'high'
        });

        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime,
          reason
        };
      }

      const remainingAttempts = this.MAX_TOKEN_VALIDATION_ATTEMPTS - Math.max(ipAttemptCount, tokenAttemptCount);
      const resetTime = new Date(Date.now() + this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

      return {
        allowed: true,
        remainingAttempts,
        resetTime
      };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception checking rate limit', error);
      // Fail secure
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: new Date(Date.now() + this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000),
        reason: 'Security check failed'
      };
    }
  }

  /**
   * Rate limiting for invitation claim attempts
   * Requirements: 6.1, 6.3
   */
  async checkClaimRateLimit(ipAddress: string, email: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    resetTime: Date;
    reason?: string;
  }> {
    try {
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - this.RATE_LIMIT_WINDOW_MINUTES);

      // Check attempts by IP and email
      const { data: attempts, error } = await supabase
        .from('security_audit_log')
        .select('id')
        .or(`ip_address.eq.${ipAddress},email.eq.${email.toLowerCase()}`)
        .eq('event_type', 'invitation_claim_attempt')
        .gte('created_at', windowStart.toISOString());

      if (error) {
        logger.error(LogSource.AUTH, 'Error checking claim rate limit', error);
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: new Date(Date.now() + this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000),
          reason: 'Unable to verify rate limit'
        };
      }

      const attemptCount = attempts?.length || 0;

      if (attemptCount >= this.MAX_CLAIM_ATTEMPTS) {
        const resetTime = new Date(Date.now() + this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
        
        await this.logSecurityEvent({
          eventType: 'claim_rate_limit_exceeded',
          ipAddress,
          email: email.toLowerCase(),
          details: { attemptCount },
          severity: 'high'
        });

        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime,
          reason: 'Too many claim attempts'
        };
      }

      return {
        allowed: true,
        remainingAttempts: this.MAX_CLAIM_ATTEMPTS - attemptCount,
        resetTime: new Date(Date.now() + this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)
      };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception checking claim rate limit', error);
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: new Date(Date.now() + this.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000),
        reason: 'Security check failed'
      };
    }
  }

  /**
   * Validate token integrity and detect tampering
   * Requirements: 6.2, 6.4
   */
  async validateTokenIntegrity(token: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    try {
      // Basic format validation
      if (!token || typeof token !== 'string') {
        return { valid: false, reason: 'Invalid token format' };
      }

      // Check token length (should be base64url encoded 32 bytes = ~43 chars)
      if (token.length < 40 || token.length > 50) {
        return { valid: false, reason: 'Invalid token length' };
      }

      // Check for valid base64url characters
      const base64urlPattern = /^[A-Za-z0-9_-]+$/;
      if (!base64urlPattern.test(token)) {
        return { valid: false, reason: 'Invalid token characters' };
      }

      // Check for common tampering patterns
      const suspiciousPatterns = [
        /(.)\1{10,}/, // Repeated characters
        /^[0]+$/, // All zeros
        /^[1]+$/, // All ones
        /admin|test|debug|null/i // Suspicious keywords
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(token)) {
          return { valid: false, reason: 'Suspicious token pattern detected' };
        }
      }

      return { valid: true };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception validating token integrity', error);
      return { valid: false, reason: 'Token validation failed' };
    }
  }

  /**
   * Verify email ownership for account upgrades
   * Requirements: 6.4
   */
  async verifyEmailOwnership(email: string, token: string): Promise<{
    verified: boolean;
    requiresVerification: boolean;
    reason?: string;
  }> {
    try {
      // Check if user already exists and is verified
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email, email_verified')
        .eq('email', email.toLowerCase())
        .single();

      if (userError && userError.code !== 'PGRST116') {
        logger.error(LogSource.AUTH, 'Error checking existing user for email verification', userError);
        return {
          verified: false,
          requiresVerification: true,
          reason: 'Unable to verify email ownership'
        };
      }

      // If user exists and email is verified, no additional verification needed
      if (existingUser && existingUser.email_verified) {
        return {
          verified: true,
          requiresVerification: false
        };
      }

      // For new users or unverified emails, require verification
      if (!existingUser) {
        return {
          verified: false,
          requiresVerification: true,
          reason: 'New user requires email verification'
        };
      }

      return {
        verified: false,
        requiresVerification: true,
        reason: 'Email verification required'
      };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception verifying email ownership', error);
      return {
        verified: false,
        requiresVerification: true,
        reason: 'Email verification check failed'
      };
    }
  }

  /**
   * Detect and prevent replay attacks
   * Requirements: 6.5
   */
  async checkReplayAttack(token: string, ipAddress: string): Promise<{
    isReplay: boolean;
    reason?: string;
  }> {
    try {
      const tokenHash = this.hashToken(token);
      const recentWindow = new Date();
      recentWindow.setMinutes(recentWindow.getMinutes() - 5); // 5-minute window

      // Check for recent identical requests
      const { data: recentAttempts, error } = await supabase
        .from('security_audit_log')
        .select('id, created_at')
        .eq('token_hash', tokenHash)
        .eq('ip_address', ipAddress)
        .eq('event_type', 'token_validation_attempt')
        .gte('created_at', recentWindow.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        logger.error(LogSource.AUTH, 'Error checking replay attack', error);
        return { isReplay: false }; // Fail open for this check
      }

      if (!recentAttempts || recentAttempts.length === 0) {
        return { isReplay: false };
      }

      // Check for rapid repeated requests (potential replay)
      if (recentAttempts.length >= 3) {
        const timestamps = recentAttempts.map(a => new Date(a.created_at).getTime());
        const timeDiffs = [];
        
        for (let i = 1; i < timestamps.length; i++) {
          timeDiffs.push(timestamps[i-1] - timestamps[i]);
        }

        // If all requests are within 10 seconds of each other, likely replay
        const isRapidReplay = timeDiffs.every(diff => diff < 10000);
        
        if (isRapidReplay) {
          await this.logSecurityEvent({
            eventType: 'replay_attack_detected',
            ipAddress,
            tokenHash,
            details: { attemptCount: recentAttempts.length, timeDiffs },
            severity: 'critical'
          });

          return {
            isReplay: true,
            reason: 'Rapid repeated requests detected'
          };
        }
      }

      return { isReplay: false };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception checking replay attack', error);
      return { isReplay: false }; // Fail open
    }
  }

  /**
   * Log security events for audit trail
   * Requirements: 6.3
   */
  async logSecurityEvent(event: {
    eventType: string;
    ipAddress: string;
    email?: string;
    tokenHash?: string;
    userId?: string;
    invitationId?: string;
    details?: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_audit_log')
        .insert({
          event_type: event.eventType,
          ip_address: event.ipAddress,
          email: event.email?.toLowerCase(),
          token_hash: event.tokenHash,
          user_id: event.userId,
          invitation_id: event.invitationId,
          event_details: event.details,
          severity: event.severity,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error(LogSource.AUTH, 'Error logging security event', error);
      }

      // Log to application logger as well
      logger.info(LogSource.AUTH, `Security event: ${event.eventType}`, {
        severity: event.severity,
        ipAddress: event.ipAddress,
        details: event.details
      });

      // Send admin alerts for high/critical severity events
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.sendSecurityAlert(event);
      }
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception logging security event', error);
    }
  }

  /**
   * Send security alerts to administrators
   * Requirements: 6.3
   */
  private async sendSecurityAlert(event: {
    eventType: string;
    ipAddress: string;
    email?: string;
    severity: string;
    details?: any;
  }): Promise<void> {
    try {
      // Import admin notification service dynamically to avoid circular dependencies
      const { AdminNotificationService } = await import('./adminNotificationService');
      
      await AdminNotificationService.notifySecurityEvent({
        eventType: event.eventType,
        ipAddress: event.ipAddress,
        email: event.email,
        severity: event.severity,
        details: event.details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(LogSource.AUTH, 'Error sending security alert', error);
    }
  }

  /**
   * Check for suspicious activity patterns
   * Requirements: 6.3
   */
  async checkSuspiciousActivity(ipAddress: string): Promise<{
    isSuspicious: boolean;
    riskScore: number;
    reasons: string[];
  }> {
    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const { data: recentEvents, error } = await supabase
        .from('security_audit_log')
        .select('event_type, severity, created_at')
        .eq('ip_address', ipAddress)
        .gte('created_at', last24Hours.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(LogSource.AUTH, 'Error checking suspicious activity', error);
        return { isSuspicious: false, riskScore: 0, reasons: [] };
      }

      let riskScore = 0;
      const reasons: string[] = [];

      if (!recentEvents || recentEvents.length === 0) {
        return { isSuspicious: false, riskScore: 0, reasons: [] };
      }

      // High volume of requests
      if (recentEvents.length > this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        riskScore += 30;
        reasons.push(`High volume of requests (${recentEvents.length})`);
      }

      // Multiple high-severity events
      const highSeverityEvents = recentEvents.filter(e => e.severity === 'high' || e.severity === 'critical');
      if (highSeverityEvents.length > 2) {
        riskScore += 40;
        reasons.push(`Multiple high-severity security events (${highSeverityEvents.length})`);
      }

      // Rapid succession of different event types
      const eventTypes = new Set(recentEvents.map(e => e.event_type));
      if (eventTypes.size > 5) {
        riskScore += 20;
        reasons.push(`Multiple different event types (${eventTypes.size})`);
      }

      // Rate limit violations
      const rateLimitEvents = recentEvents.filter(e => e.event_type.includes('rate_limit'));
      if (rateLimitEvents.length > 0) {
        riskScore += 25;
        reasons.push(`Rate limit violations (${rateLimitEvents.length})`);
      }

      const isSuspicious = riskScore >= 50;

      if (isSuspicious) {
        await this.logSecurityEvent({
          eventType: 'suspicious_activity_detected',
          ipAddress,
          details: { riskScore, reasons, eventCount: recentEvents.length },
          severity: riskScore >= 75 ? 'critical' : 'high'
        });
      }

      return { isSuspicious, riskScore, reasons };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception checking suspicious activity', error);
      return { isSuspicious: false, riskScore: 0, reasons: [] };
    }
  }

  /**
   * Hash token for secure storage in logs
   * Requirements: 6.1, 6.3
   */
  private hashToken(token: string): string {
    // Use a simple hash for token identification in logs
    // This is not cryptographically secure but sufficient for logging
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get security statistics for admin dashboard
   * Requirements: 6.3
   */
  async getSecurityStatistics(days: number = 7): Promise<{
    data?: {
      totalEvents: number;
      highSeverityEvents: number;
      rateLimitViolations: number;
      suspiciousActivityDetections: number;
      uniqueIpAddresses: number;
      topEventTypes: Array<{ eventType: string; count: number }>;
    };
    error?: any;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: events, error } = await supabase
        .from('security_audit_log')
        .select('event_type, severity, ip_address')
        .gte('created_at', startDate.toISOString());

      if (error) {
        logger.error(LogSource.AUTH, 'Error fetching security statistics', error);
        return { error };
      }

      if (!events) {
        return {
          data: {
            totalEvents: 0,
            highSeverityEvents: 0,
            rateLimitViolations: 0,
            suspiciousActivityDetections: 0,
            uniqueIpAddresses: 0,
            topEventTypes: []
          }
        };
      }

      const totalEvents = events.length;
      const highSeverityEvents = events.filter(e => e.severity === 'high' || e.severity === 'critical').length;
      const rateLimitViolations = events.filter(e => e.event_type.includes('rate_limit')).length;
      const suspiciousActivityDetections = events.filter(e => e.event_type === 'suspicious_activity_detected').length;
      const uniqueIpAddresses = new Set(events.map(e => e.ip_address)).size;

      // Count event types
      const eventTypeCounts = events.reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topEventTypes = Object.entries(eventTypeCounts)
        .map(([eventType, count]) => ({ eventType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        data: {
          totalEvents,
          highSeverityEvents,
          rateLimitViolations,
          suspiciousActivityDetections,
          uniqueIpAddresses,
          topEventTypes
        }
      };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception fetching security statistics', error);
      return { error };
    }
  }
}

// Export singleton instance
export const invitationSecurityService = new InvitationSecurityService();