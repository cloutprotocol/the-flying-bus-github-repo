import { supabase } from '@/integrations/supabase/client';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockDurationMinutes?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: Date;
  blocked: boolean;
}

export class RateLimitService {
  private static readonly DEFAULT_CONFIGS = {
    invitation_request: { maxAttempts: 3, windowMinutes: 60 },
    token_validation: { maxAttempts: 5, windowMinutes: 60 },
    invitation_form: { maxAttempts: 10, windowMinutes: 60 }
  };

  /**
   * Check if an action is rate limited for a given identifier
   */
  static async checkRateLimit(
    action: string,
    identifier: string,
    config?: RateLimitConfig
  ): Promise<RateLimitResult> {
    const rateLimitConfig = config || this.DEFAULT_CONFIGS[action as keyof typeof this.DEFAULT_CONFIGS];
    
    if (!rateLimitConfig) {
      throw new Error(`No rate limit configuration found for action: ${action}`);
    }

    const windowStart = new Date(Date.now() - rateLimitConfig.windowMinutes * 60 * 1000);
    
    try {
      // Get recent attempts within the time window
      const { data: attempts, error } = await supabase
        .from('rate_limit_attempts')
        .select('*')
        .eq('action', action)
        .eq('identifier', identifier)
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        // If it's a permission error, just allow the request (rate limiting will happen server-side)
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('403')) {
          console.warn('Rate limit check skipped due to permissions (server-side rate limiting will apply)');
        } else {
          console.error('Rate limit check error:', error);
        }
        // Fail open - allow the request if we can't check rate limits
        return {
          allowed: true,
          remainingAttempts: rateLimitConfig.maxAttempts,
          resetTime: new Date(Date.now() + rateLimitConfig.windowMinutes * 60 * 1000),
          blocked: false
        };
      }

      const attemptCount = attempts?.length || 0;
      const remainingAttempts = Math.max(0, rateLimitConfig.maxAttempts - attemptCount);
      const allowed = attemptCount < rateLimitConfig.maxAttempts;

      return {
        allowed,
        remainingAttempts,
        resetTime: new Date(Date.now() + rateLimitConfig.windowMinutes * 60 * 1000),
        blocked: !allowed
      };
    } catch (error) {
      console.error('Rate limit service error:', error);
      // Fail open
      return {
        allowed: true,
        remainingAttempts: rateLimitConfig.maxAttempts,
        resetTime: new Date(Date.now() + rateLimitConfig.windowMinutes * 60 * 1000),
        blocked: false
      };
    }
  }

  /**
   * Record an attempt for rate limiting
   */
  static async recordAttempt(
    action: string,
    identifier: string,
    success: boolean = true,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('rate_limit_attempts')
        .insert({
          action,
          identifier,
          success,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        // If it's a permission error, log to console but don't spam
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('403')) {
          console.warn('Rate limit recording skipped due to permissions (this is expected for client-side operations)');
        } else {
          console.error('Failed to record rate limit attempt:', error);
        }
      }
    } catch (error) {
      console.error('Rate limit recording error:', error);
    }
  }

  /**
   * Clean up old rate limit records
   */
  static async cleanup(olderThanHours: number = 24): Promise<void> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    try {
      const { error } = await supabase
        .from('rate_limit_attempts')
        .delete()
        .lt('created_at', cutoffTime.toISOString());

      if (error) {
        console.error('Rate limit cleanup error:', error);
      }
    } catch (error) {
      console.error('Rate limit cleanup error:', error);
    }
  }
}

export default RateLimitService;