import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { invitationErrorHandler } from './invitationErrorHandler';

/**
 * Monitoring service for invitation system health and performance
 * Tracks metrics, detects issues, and sends alerts
 * Requirements: 7.2, 7.3, 7.5
 */
export class InvitationMonitoringService {
  private static readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly ERROR_THRESHOLD = 10; // errors per hour
  private static readonly RESPONSE_TIME_THRESHOLD = 5000; // 5 seconds
  
  private static healthCheckTimer: number | null = null;
  private static metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastHealthCheck: Date;
    systemStatus: 'healthy' | 'degraded' | 'critical';
  } = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastHealthCheck: new Date(),
    systemStatus: 'healthy'
  };

  /**
   * Start monitoring system health
   * Requirements: 7.2, 7.3
   */
  static startMonitoring(): void {
    if (this.healthCheckTimer) {
      return; // Already monitoring
    }

    logger.info(LogSource.AUTH, 'Starting invitation system monitoring');

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop monitoring system health
   */
  static stopMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.info(LogSource.AUTH, 'Stopped invitation system monitoring');
    }
  }

  /**
   * Perform comprehensive health check
   * Requirements: 7.2, 7.3
   */
  private static async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      const healthResults = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkEmailServiceHealth(),
        this.checkTokenServiceHealth(),
        this.checkSecurityServiceHealth()
      ]);

      const responseTime = Date.now() - startTime;
      const failedChecks = healthResults.filter(result => result.status === 'rejected').length;
      
      // Update metrics
      this.updateHealthMetrics(responseTime, failedChecks === 0);
      
      // Determine system status
      const newStatus = this.determineSystemStatus(failedChecks, responseTime);
      
      if (newStatus !== this.metrics.systemStatus) {
        await this.handleStatusChange(this.metrics.systemStatus, newStatus, healthResults);
        this.metrics.systemStatus = newStatus;
      }

      // Log health check results
      logger.info(LogSource.AUTH, 'Health check completed', {
        status: newStatus,
        responseTime,
        failedChecks,
        totalChecks: healthResults.length
      });

      // Check for error rate threshold
      await this.checkErrorRateThreshold();

    } catch (error) {
      logger.error(LogSource.AUTH, 'Health check failed', error);
      await this.handleCriticalError('health_check_failure', error);
    }
  }

  /**
   * Check database connectivity and performance
   */
  private static async checkDatabaseHealth(): Promise<{ service: string; healthy: boolean; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const { error } = await supabase
        .from('invitation_requests')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        service: 'database',
        healthy: responseTime < this.RESPONSE_TIME_THRESHOLD,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(LogSource.AUTH, 'Database health check failed', error);
      throw error;
    }
  }

  /**
   * Check email service health
   */
  private static async checkEmailServiceHealth(): Promise<{ service: string; healthy: boolean; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      // Check recent email delivery status
      const { data, error } = await supabase
        .from('email_notifications')
        .select('delivery_status')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .limit(10);

      const responseTime = Date.now() - startTime;

      if (error) {
        throw new Error(`Email service check error: ${error.message}`);
      }

      // Check if too many emails are failing
      const failedEmails = data?.filter(email => email.delivery_status === 'failed').length || 0;
      const totalEmails = data?.length || 0;
      const failureRate = totalEmails > 0 ? failedEmails / totalEmails : 0;

      return {
        service: 'email',
        healthy: failureRate < 0.2 && responseTime < this.RESPONSE_TIME_THRESHOLD, // Less than 20% failure rate
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(LogSource.AUTH, 'Email service health check failed', error);
      throw error;
    }
  }

  /**
   * Check token service health
   */
  private static async checkTokenServiceHealth(): Promise<{ service: string; healthy: boolean; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      // Check token generation and validation performance
      const { data, error } = await supabase
        .from('invitation_tokens')
        .select('created_at, expires_at')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .limit(5);

      const responseTime = Date.now() - startTime;

      if (error) {
        throw new Error(`Token service check error: ${error.message}`);
      }

      return {
        service: 'token',
        healthy: responseTime < this.RESPONSE_TIME_THRESHOLD,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(LogSource.AUTH, 'Token service health check failed', error);
      throw error;
    }
  }

  /**
   * Check security service health
   */
  private static async checkSecurityServiceHealth(): Promise<{ service: string; healthy: boolean; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      // Check security audit log accessibility
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('id')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        throw new Error(`Security service check error: ${error.message}`);
      }

      return {
        service: 'security',
        healthy: responseTime < this.RESPONSE_TIME_THRESHOLD,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(LogSource.AUTH, 'Security service health check failed', error);
      throw error;
    }
  }

  /**
   * Update health metrics
   */
  private static updateHealthMetrics(responseTime: number, success: boolean): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time (simple moving average)
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / this.metrics.totalRequests;
    
    this.metrics.lastHealthCheck = new Date();
  }

  /**
   * Determine system status based on health check results
   */
  private static determineSystemStatus(
    failedChecks: number, 
    responseTime: number
  ): 'healthy' | 'degraded' | 'critical' {
    if (failedChecks >= 3) {
      return 'critical';
    } else if (failedChecks >= 1 || responseTime > this.RESPONSE_TIME_THRESHOLD * 2) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Handle system status changes
   */
  private static async handleStatusChange(
    oldStatus: string,
    newStatus: string,
    healthResults: PromiseSettledResult<any>[]
  ): Promise<void> {
    logger.warn(LogSource.AUTH, `System status changed: ${oldStatus} -> ${newStatus}`, {
      healthResults: healthResults.map(result => ({
        status: result.status,
        reason: result.status === 'rejected' ? result.reason : 'success'
      }))
    });

    // Send admin alert for status changes
    try {
      const { AdminNotificationService } = await import('./adminNotificationService');
      
      await AdminNotificationService.createNotification(
        'security_alert',
        `System Status Changed: ${newStatus.toUpperCase()}`,
        `Invitation system status changed from ${oldStatus} to ${newStatus}`,
        undefined,
        undefined,
        {
          oldStatus,
          newStatus,
          timestamp: new Date().toISOString(),
          healthResults: healthResults.map(result => ({
            status: result.status,
            error: result.status === 'rejected' ? result.reason?.message : null
          }))
        }
      );
    } catch (error) {
      logger.error(LogSource.AUTH, 'Failed to send status change notification', error);
    }
  }

  /**
   * Check error rate threshold and alert if exceeded
   */
  private static async checkErrorRateThreshold(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const { data: recentErrors, error } = await supabase
        .from('security_audit_log')
        .select('id, severity')
        .gte('created_at', oneHourAgo.toISOString())
        .in('severity', ['high', 'critical']);

      if (error) {
        logger.error(LogSource.AUTH, 'Error checking error rate threshold', error);
        return;
      }

      const errorCount = recentErrors?.length || 0;
      
      if (errorCount >= this.ERROR_THRESHOLD) {
        await this.handleCriticalError('high_error_rate', {
          errorCount,
          threshold: this.ERROR_THRESHOLD,
          timeWindow: '1 hour'
        });
      }
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception checking error rate threshold', error);
    }
  }

  /**
   * Handle critical errors that require immediate attention
   */
  private static async handleCriticalError(errorType: string, errorData: any): Promise<void> {
    logger.error(LogSource.AUTH, `Critical error detected: ${errorType}`, errorData);

    try {
      const { AdminNotificationService } = await import('./adminNotificationService');
      
      await AdminNotificationService.createNotification(
        'security_alert',
        `Critical System Error: ${errorType}`,
        `Critical error detected in invitation system: ${errorType}`,
        undefined,
        undefined,
        {
          errorType,
          errorData,
          timestamp: new Date().toISOString(),
          systemStatus: this.metrics.systemStatus,
          metrics: this.metrics
        }
      );
    } catch (error) {
      logger.error(LogSource.AUTH, 'Failed to send critical error notification', error);
    }
  }

  /**
   * Get current system metrics
   * Requirements: 7.5
   */
  static getSystemMetrics(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageResponseTime: number;
    lastHealthCheck: Date;
    systemStatus: 'healthy' | 'degraded' | 'critical';
    uptime: number;
  } {
    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
      : 100;

    return {
      ...this.metrics,
      successRate,
      uptime: Date.now() - this.metrics.lastHealthCheck.getTime()
    };
  }

  /**
   * Record operation metrics for monitoring
   * Requirements: 7.2, 7.5
   */
  static recordOperation(
    operation: string,
    success: boolean,
    responseTime: number,
    additionalData?: Record<string, any>
  ): void {
    this.updateHealthMetrics(responseTime, success);

    logger.info(LogSource.AUTH, `Operation recorded: ${operation}`, {
      success,
      responseTime,
      operation,
      ...additionalData
    });

    // If operation failed, check if we need to alert
    if (!success && responseTime > this.RESPONSE_TIME_THRESHOLD) {
      this.handleCriticalError('slow_operation', {
        operation,
        responseTime,
        threshold: this.RESPONSE_TIME_THRESHOLD,
        additionalData
      });
    }
  }

  /**
   * Get system health status for admin dashboard
   * Requirements: 7.5
   */
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    services: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      lastCheck: Date;
    }>;
    metrics: ReturnType<typeof InvitationMonitoringService.getSystemMetrics>;
    alerts: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: Date;
    }>;
  }> {
    const metrics = this.getSystemMetrics();
    
    // Get recent alerts from security audit log
    const { data: recentAlerts } = await supabase
      .from('security_audit_log')
      .select('event_type, created_at, severity, event_details')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .in('severity', ['high', 'critical'])
      .order('created_at', { ascending: false })
      .limit(10);

    const alerts = recentAlerts?.map(alert => ({
      type: alert.event_type,
      message: `${alert.event_type} detected`,
      severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
      timestamp: new Date(alert.created_at)
    })) || [];

    return {
      status: metrics.systemStatus,
      services: [
        {
          name: 'Database',
          status: 'healthy', // This would be determined by actual health checks
          responseTime: metrics.averageResponseTime,
          lastCheck: metrics.lastHealthCheck
        },
        {
          name: 'Email Service',
          status: 'healthy',
          responseTime: metrics.averageResponseTime,
          lastCheck: metrics.lastHealthCheck
        },
        {
          name: 'Token Service',
          status: 'healthy',
          responseTime: metrics.averageResponseTime,
          lastCheck: metrics.lastHealthCheck
        },
        {
          name: 'Security Service',
          status: 'healthy',
          responseTime: metrics.averageResponseTime,
          lastCheck: metrics.lastHealthCheck
        }
      ],
      metrics,
      alerts
    };
  }

  /**
   * Reset metrics (for testing or maintenance)
   */
  static resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastHealthCheck: new Date(),
      systemStatus: 'healthy'
    };
  }
}

// Export singleton instance
export const invitationMonitoringService = InvitationMonitoringService;