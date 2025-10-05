import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface RegistrationAttempt {
  id?: string;
  user_id?: string;
  registration_type: 'standard' | 'invitation';
  email: string;
  attempt_timestamp: string;
  success: boolean;
  error_type?: string;
  error_message?: string;
  completion_time_ms?: number;
  rls_bypass_used?: boolean;
  service_role_used?: boolean;
  invitation_token?: string;
  user_agent?: string;
  ip_address?: string;
  metadata?: Record<string, any>;
}

export interface RegistrationMetrics {
  total_attempts: number;
  successful_registrations: number;
  failed_registrations: number;
  success_rate: number;
  average_completion_time_ms: number;
  rls_violations: number;
  service_role_usage: number;
  by_type: {
    standard: {
      attempts: number;
      success_rate: number;
      avg_completion_time: number;
    };
    invitation: {
      attempts: number;
      success_rate: number;
      avg_completion_time: number;
    };
  };
  error_breakdown: Record<string, number>;
}

export class RegistrationMonitoringService {
  private static instance: RegistrationMonitoringService;
  private performanceMarks: Map<string, number> = new Map();

  static getInstance(): RegistrationMonitoringService {
    if (!RegistrationMonitoringService.instance) {
      RegistrationMonitoringService.instance = new RegistrationMonitoringService();
    }
    return RegistrationMonitoringService.instance;
  }

  /**
   * Start tracking performance for a registration attempt
   */
  startPerformanceTracking(attemptId: string): void {
    this.performanceMarks.set(attemptId, Date.now());
    logger.info('Registration performance tracking started', { attemptId });
  }

  /**
   * End performance tracking and return duration
   */
  endPerformanceTracking(attemptId: string): number {
    const startTime = this.performanceMarks.get(attemptId);
    if (!startTime) {
      logger.warn('Performance tracking not found for attempt', { attemptId });
      return 0;
    }

    const duration = Date.now() - startTime;
    this.performanceMarks.delete(attemptId);
    
    logger.info('Registration performance tracking completed', { 
      attemptId, 
      duration_ms: duration 
    });
    
    return duration;
  }

  /**
   * Log a registration attempt with all relevant details
   */
  async logRegistrationAttempt(attempt: RegistrationAttempt): Promise<void> {
    try {
      // Log to application logger
      logger.info('Registration attempt logged', {
        registration_type: attempt.registration_type,
        email: attempt.email,
        success: attempt.success,
        completion_time_ms: attempt.completion_time_ms,
        rls_bypass_used: attempt.rls_bypass_used,
        service_role_used: attempt.service_role_used,
        error_type: attempt.error_type
      });

      // TEMPORARILY DISABLED: Database storage to prevent RLS violations during registration
      // The registration_attempts table either doesn't exist or has RLS policies that block operations
      // This prevents monitoring from interfering with the core registration flow
      
      // TODO: Re-enable once RLS policies are fixed and tables are properly created
      // Store in database for analytics
      // const { error } = await supabase
      //   .from('registration_attempts')
      //   .insert({
      //     user_id: attempt.user_id,
      //     registration_type: attempt.registration_type,
      //     email: attempt.email,
      //     attempt_timestamp: attempt.attempt_timestamp,
      //     success: attempt.success,
      //     error_type: attempt.error_type,
      //     error_message: attempt.error_message,
      //     completion_time_ms: attempt.completion_time_ms,
      //     rls_bypass_used: attempt.rls_bypass_used || false,
      //     service_role_used: attempt.service_role_used || false,
      //     invitation_token: attempt.invitation_token,
      //     user_agent: attempt.user_agent,
      //     ip_address: attempt.ip_address,
      //     metadata: attempt.metadata || {}
      //   });

      // if (error) {
      //   logger.error('Failed to store registration attempt in database', { error, attempt });
      // }
    } catch (error) {
      logger.error('Error logging registration attempt', { error, attempt });
    }
  }

  /**
   * Log successful registration
   */
  async logSuccessfulRegistration(
    registrationType: 'standard' | 'invitation',
    userId: string,
    email: string,
    completionTimeMs: number,
    options: {
      rlsBypassUsed?: boolean;
      serviceRoleUsed?: boolean;
      invitationToken?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    await this.logRegistrationAttempt({
      user_id: userId,
      registration_type: registrationType,
      email,
      attempt_timestamp: new Date().toISOString(),
      success: true,
      completion_time_ms: completionTimeMs,
      rls_bypass_used: options.rlsBypassUsed,
      service_role_used: options.serviceRoleUsed,
      invitation_token: options.invitationToken,
      user_agent: navigator?.userAgent,
      metadata: options.metadata
    });
  }

  /**
   * Log failed registration with error details
   */
  async logFailedRegistration(
    registrationType: 'standard' | 'invitation',
    email: string,
    error: Error,
    completionTimeMs: number,
    options: {
      rlsBypassUsed?: boolean;
      serviceRoleUsed?: boolean;
      invitationToken?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const errorType = this.categorizeError(error);
    
    await this.logRegistrationAttempt({
      registration_type: registrationType,
      email,
      attempt_timestamp: new Date().toISOString(),
      success: false,
      error_type: errorType,
      error_message: error.message,
      completion_time_ms: completionTimeMs,
      rls_bypass_used: options.rlsBypassUsed,
      service_role_used: options.serviceRoleUsed,
      invitation_token: options.invitationToken,
      user_agent: navigator?.userAgent,
      metadata: options.metadata
    });
  }

  /**
   * Log RLS policy violation
   */
  async logRLSViolation(
    context: string,
    operation: string,
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    logger.warn('RLS policy violation detected', {
      context,
      operation,
      userId,
      details,
      timestamp: new Date().toISOString()
    });

    // TEMPORARILY DISABLED: Database storage to prevent RLS violations during registration
    // The rls_violations table either doesn't exist or has RLS policies that block operations
    // This prevents monitoring from interfering with the core registration flow
    
    // TODO: Re-enable once RLS policies are fixed and tables are properly created
    // try {
    //   await supabase
    //     .from('rls_violations')
    //     .insert({
    //       context,
    //       operation,
    //       user_id: userId,
    //       violation_timestamp: new Date().toISOString(),
    //       details: details || {},
    //       resolved: false
    //     });
    // } catch (error) {
    //   logger.error('Failed to log RLS violation to database', { error });
    // }
  }

  /**
   * Log service role usage
   */
  async logServiceRoleUsage(
    operation: string,
    context: string,
    userId?: string,
    success: boolean = true,
    details?: Record<string, any>
  ): Promise<void> {
    logger.info('Service role usage logged', {
      operation,
      context,
      userId,
      success,
      details,
      timestamp: new Date().toISOString()
    });

    // TEMPORARILY DISABLED: Database storage to prevent RLS violations during registration
    // The service_role_usage table either doesn't exist or has RLS policies that block operations
    // This prevents monitoring from interfering with the core registration flow
    
    // TODO: Re-enable once RLS policies are fixed and tables are properly created
    // try {
    //   await supabase
    //     .from('service_role_usage')
    //     .insert({
    //       operation,
    //       context,
    //       user_id: userId,
    //       usage_timestamp: new Date().toISOString(),
    //       success,
    //       details: details || {}
    //     });
    // } catch (error) {
    //   logger.error('Failed to log service role usage to database', { error });
    // }
  }

  /**
   * Get registration metrics for a time period
   */
  async getRegistrationMetrics(
    startDate: string,
    endDate: string
  ): Promise<RegistrationMetrics> {
    try {
      // TEMPORARILY DISABLED: Return empty metrics to prevent RLS violations
      // The registration_attempts table either doesn't exist or has RLS policies that block operations
      logger.warn('Registration metrics temporarily disabled due to missing tables or RLS issues');
      
      // Return empty metrics structure
      return {
        total_attempts: 0,
        successful_registrations: 0,
        failed_registrations: 0,
        success_rate: 0,
        average_completion_time_ms: 0,
        rls_violations: 0,
        service_role_usage: 0,
        by_type: {
          standard: {
            attempts: 0,
            success_rate: 0,
            avg_completion_time: 0
          },
          invitation: {
            attempts: 0,
            success_rate: 0,
            avg_completion_time: 0
          }
        },
        error_breakdown: {}
      };

      // TODO: Re-enable once tables are properly created and RLS policies are fixed
      // const { data: attempts, error } = await supabase
      //   .from('registration_attempts')
      //   .select('*')
      //   .gte('attempt_timestamp', startDate)
      //   .lte('attempt_timestamp', endDate);

      // if (error) {
      //   logger.error('Failed to fetch registration metrics', { error });
      //   throw error;
      // }

      // return this.calculateMetrics(attempts || []);
    } catch (error) {
      logger.error('Error getting registration metrics', { error });
      throw error;
    }
  }

  /**
   * Get real-time registration success rate
   */
  async getCurrentSuccessRate(hours: number = 24): Promise<number> {
    // TEMPORARILY DISABLED: Return 0 to prevent RLS violations
    // The registration monitoring is disabled until tables and RLS policies are fixed
    logger.warn('Registration success rate monitoring temporarily disabled due to missing tables or RLS issues');
    return 0;

    // TODO: Re-enable once tables are properly created and RLS policies are fixed
    // const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    // const endDate = new Date().toISOString();

    // try {
    //   const metrics = await this.getRegistrationMetrics(startDate, endDate);
    //   return metrics.success_rate;
    // } catch (error) {
    //   logger.error('Error getting current success rate', { error });
    //   return 0;
    // }
  }

  /**
   * Categorize error types for better tracking
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('rls') || message.includes('policy')) {
      return 'RLS_VIOLATION';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }
    if (message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    if (message.includes('auth') || message.includes('permission')) {
      return 'AUTH_ERROR';
    }
    if (message.includes('database') || message.includes('sql')) {
      return 'DATABASE_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Calculate comprehensive metrics from registration attempts
   */
  private calculateMetrics(attempts: any[]): RegistrationMetrics {
    const total = attempts.length;
    const successful = attempts.filter(a => a.success).length;
    const failed = total - successful;
    
    const standardAttempts = attempts.filter(a => a.registration_type === 'standard');
    const invitationAttempts = attempts.filter(a => a.registration_type === 'invitation');
    
    const completionTimes = attempts
      .filter(a => a.completion_time_ms)
      .map(a => a.completion_time_ms);
    
    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
      : 0;

    const errorBreakdown: Record<string, number> = {};
    attempts.filter(a => !a.success).forEach(a => {
      const errorType = a.error_type || 'UNKNOWN_ERROR';
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
    });

    return {
      total_attempts: total,
      successful_registrations: successful,
      failed_registrations: failed,
      success_rate: total > 0 ? (successful / total) * 100 : 0,
      average_completion_time_ms: avgCompletionTime,
      rls_violations: attempts.filter(a => a.rls_bypass_used).length,
      service_role_usage: attempts.filter(a => a.service_role_used).length,
      by_type: {
        standard: {
          attempts: standardAttempts.length,
          success_rate: standardAttempts.length > 0 
            ? (standardAttempts.filter(a => a.success).length / standardAttempts.length) * 100 
            : 0,
          avg_completion_time: this.calculateAvgTime(standardAttempts)
        },
        invitation: {
          attempts: invitationAttempts.length,
          success_rate: invitationAttempts.length > 0 
            ? (invitationAttempts.filter(a => a.success).length / invitationAttempts.length) * 100 
            : 0,
          avg_completion_time: this.calculateAvgTime(invitationAttempts)
        }
      },
      error_breakdown: errorBreakdown
    };
  }

  private calculateAvgTime(attempts: any[]): number {
    const times = attempts
      .filter(a => a.completion_time_ms)
      .map(a => a.completion_time_ms);
    
    return times.length > 0
      ? times.reduce((sum, time) => sum + time, 0) / times.length
      : 0;
  }
}

export const registrationMonitoring = RegistrationMonitoringService.getInstance();