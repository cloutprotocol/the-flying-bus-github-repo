import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  id?: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  tokenValidationFailures: number;
  suspiciousActivity: number;
  recentThreats: SecurityEvent[];
}

class SecurityMonitoringService {
  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          ...event,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }

      // If it's a critical event, we might want to trigger immediate alerts
      if (event.severity === 'critical') {
        await this.handleCriticalEvent(event);
      }
    } catch (err) {
      console.error('Error logging security event:', err);
    }
  }

  /**
   * Handle critical security events
   */
  private async handleCriticalEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    // In a real implementation, this would trigger alerts, notifications, etc.
    console.warn('CRITICAL SECURITY EVENT:', event);
    
    // Could integrate with external alerting systems here
    // For now, we'll just log it prominently
  }

  /**
   * Log token validation failure
   */
  async logTokenValidationFailure(
    token: string,
    email?: string,
    reason?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'token_validation_failed',
      severity: 'medium',
      description: `Token validation failed: ${reason || 'Unknown reason'}`,
      metadata: {
        token_hash: this.hashToken(token),
        email,
        reason
      },
      user_agent: userAgent,
      ip_address: ipAddress
    });
  }

  /**
   * Log suspicious token enumeration attempts
   */
  async logTokenEnumerationAttempt(
    ipAddress: string,
    userAgent?: string,
    attemptCount?: number
  ): Promise<void> {
    const severity = (attemptCount || 1) > 10 ? 'high' : 'medium';
    
    await this.logSecurityEvent({
      event_type: 'token_enumeration_attempt',
      severity,
      description: `Suspicious token enumeration detected from ${ipAddress}`,
      metadata: {
        attempt_count: attemptCount,
        detection_method: 'rate_limiting'
      },
      user_agent: userAgent,
      ip_address: ipAddress
    });
  }

  /**
   * Log email security events
   */
  async logEmailSecurityEvent(
    eventType: string,
    email: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: `email_${eventType}`,
      severity,
      description,
      metadata: {
        email,
        ...metadata
      }
    });
  }

  /**
   * Get security metrics for a time period
   */
  async getSecurityMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SecurityMetrics> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      const events = data || [];
      const totalEvents = events.length;
      
      const severityCounts = events.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const tokenValidationFailures = events.filter(
        e => e.event_type === 'token_validation_failed'
      ).length;

      const suspiciousActivity = events.filter(
        e => e.event_type.includes('enumeration') || e.severity === 'high' || e.severity === 'critical'
      ).length;

      const recentThreats = events
        .filter(e => e.severity === 'high' || e.severity === 'critical')
        .slice(0, 10);

      return {
        totalEvents,
        criticalEvents: severityCounts.critical || 0,
        highEvents: severityCounts.high || 0,
        mediumEvents: severityCounts.medium || 0,
        lowEvents: severityCounts.low || 0,
        tokenValidationFailures,
        suspiciousActivity,
        recentThreats
      };
    } catch (error) {
      console.error('Error getting security metrics:', error);
      return {
        totalEvents: 0,
        criticalEvents: 0,
        highEvents: 0,
        mediumEvents: 0,
        lowEvents: 0,
        tokenValidationFailures: 0,
        suspiciousActivity: 0,
        recentThreats: []
      };
    }
  }

  /**
   * Check for security threats in real-time
   */
  async checkSecurityThreats(): Promise<{
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    activeThreats: number;
    recommendations: string[];
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const metrics = await this.getSecurityMetrics(oneHourAgo, now);
      
      let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      const recommendations: string[] = [];
      
      // Determine threat level based on recent activity
      if (metrics.criticalEvents > 0) {
        threatLevel = 'critical';
        recommendations.push('Immediate investigation required for critical security events');
      } else if (metrics.highEvents > 5) {
        threatLevel = 'high';
        recommendations.push('Multiple high-severity events detected in the last hour');
      } else if (metrics.tokenValidationFailures > 20) {
        threatLevel = 'medium';
        recommendations.push('High number of token validation failures - possible attack');
      } else if (metrics.suspiciousActivity > 0) {
        threatLevel = 'medium';
        recommendations.push('Suspicious activity detected - monitor closely');
      }

      // Add specific recommendations
      if (metrics.tokenValidationFailures > 10) {
        recommendations.push('Consider implementing additional rate limiting for token validation');
      }

      if (metrics.suspiciousActivity > 5) {
        recommendations.push('Review IP addresses for potential blocking');
      }

      return {
        threatLevel,
        activeThreats: metrics.criticalEvents + metrics.highEvents,
        recommendations
      };
    } catch (error) {
      console.error('Error checking security threats:', error);
      return {
        threatLevel: 'critical',
        activeThreats: 0,
        recommendations: ['Unable to assess security status - investigate immediately']
      };
    }
  }

  /**
   * Hash token for logging (to avoid storing actual tokens)
   */
  private hashToken(token: string): string {
    // Simple hash for logging purposes (not cryptographic)
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Get security events by type
   */
  async getEventsByType(
    eventType: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<SecurityEvent[]> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('event_type', eventType)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting events by type:', error);
      return [];
    }
  }
}

export const securityMonitoringService = new SecurityMonitoringService();