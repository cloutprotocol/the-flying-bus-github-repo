import { supabase } from '@/integrations/supabase/client';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceAlert {
  id: string;
  type: 'email_delivery_slow' | 'token_generation_slow' | 'high_error_rate' | 'system_degradation';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceStats {
  emailDeliveryStats: {
    averageDeliveryTime: number;
    successRate: number;
    totalEmails: number;
    failedEmails: number;
    slowDeliveries: number; // deliveries taking > 30 seconds
  };
  tokenOperationStats: {
    averageGenerationTime: number;
    averageValidationTime: number;
    totalGenerations: number;
    totalValidations: number;
    failedOperations: number;
  };
  systemHealth: {
    overallPerformance: 'excellent' | 'good' | 'degraded' | 'critical';
    activeAlerts: number;
    uptime: number;
  };
}

class InvitationPerformanceMonitor {
  private performanceThresholds = {
    emailDeliveryTime: 30000, // 30 seconds
    tokenGenerationTime: 1000, // 1 second
    tokenValidationTime: 500, // 0.5 seconds
    errorRateThreshold: 0.05, // 5%
    slowDeliveryThreshold: 0.1 // 10%
  };

  /**
   * Record a performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('performance_metrics')
        .insert({
          operation: metric.operation,
          duration: metric.duration,
          success: metric.success,
          error_message: metric.errorMessage,
          metadata: metric.metadata,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to record performance metric:', error);
      }

      // Check if this metric indicates a performance issue
      await this.checkPerformanceThresholds(metric);
    } catch (error) {
      console.error('Error recording performance metric:', error);
    }
  }

  /**
   * Record email delivery performance
   */
  async recordEmailDelivery(
    emailType: string,
    deliveryTime: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.recordMetric({
      operation: `email_delivery_${emailType}`,
      duration: deliveryTime,
      success,
      errorMessage,
      metadata: { emailType }
    });
  }

  /**
   * Record token generation performance
   */
  async recordTokenGeneration(
    generationTime: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.recordMetric({
      operation: 'token_generation',
      duration: generationTime,
      success,
      errorMessage
    });
  }

  /**
   * Record token validation performance
   */
  async recordTokenValidation(
    validationTime: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.recordMetric({
      operation: 'token_validation',
      duration: validationTime,
      success,
      errorMessage
    });
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(hours: number = 24): Promise<{ data: PerformanceStats | null; error: any }> {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);

      // Get email delivery stats
      const { data: emailMetrics, error: emailError } = await supabase
        .from('performance_metrics')
        .select('*')
        .like('operation', 'email_delivery_%')
        .gte('timestamp', startTime.toISOString());

      if (emailError) throw emailError;

      // Get token operation stats
      const { data: tokenMetrics, error: tokenError } = await supabase
        .from('performance_metrics')
        .select('*')
        .in('operation', ['token_generation', 'token_validation'])
        .gte('timestamp', startTime.toISOString());

      if (tokenError) throw tokenError;

      // Calculate email delivery stats
      const emailDeliveryStats = this.calculateEmailStats(emailMetrics || []);
      
      // Calculate token operation stats
      const tokenOperationStats = this.calculateTokenStats(tokenMetrics || []);

      // Get active alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('performance_alerts')
        .select('*')
        .eq('resolved', false);

      if (alertsError) throw alertsError;

      // Determine overall system health
      const systemHealth = this.calculateSystemHealth(
        emailDeliveryStats,
        tokenOperationStats,
        alerts?.length || 0
      );

      const stats: PerformanceStats = {
        emailDeliveryStats,
        tokenOperationStats,
        systemHealth
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error getting performance stats:', error);
      return { data: null, error };
    }
  }

  /**
   * Get active performance alerts
   */
  async getActiveAlerts(): Promise<{ data: PerformanceAlert[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('performance_alerts')
        .select('*')
        .eq('resolved', false)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const alerts: PerformanceAlert[] = (data || []).map(alert => ({
        id: alert.id,
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        timestamp: new Date(alert.timestamp),
        resolved: alert.resolved
      }));

      return { data: alerts, error: null };
    } catch (error) {
      console.error('Error getting active alerts:', error);
      return { data: null, error };
    }
  }

  /**
   * Resolve a performance alert
   */
  async resolveAlert(alertId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('performance_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      return { error };
    } catch (error) {
      console.error('Error resolving alert:', error);
      return { error };
    }
  }

  /**
   * Check performance thresholds and create alerts if needed
   */
  private async checkPerformanceThresholds(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    try {
      // Check email delivery time
      if (metric.operation.startsWith('email_delivery_') && metric.duration > this.performanceThresholds.emailDeliveryTime) {
        await this.createAlert({
          type: 'email_delivery_slow',
          message: `Email delivery took ${Math.round(metric.duration / 1000)}s (threshold: ${this.performanceThresholds.emailDeliveryTime / 1000}s)`,
          severity: metric.duration > this.performanceThresholds.emailDeliveryTime * 2 ? 'high' : 'medium'
        });
      }

      // Check token generation time
      if (metric.operation === 'token_generation' && metric.duration > this.performanceThresholds.tokenGenerationTime) {
        await this.createAlert({
          type: 'token_generation_slow',
          message: `Token generation took ${metric.duration}ms (threshold: ${this.performanceThresholds.tokenGenerationTime}ms)`,
          severity: metric.duration > this.performanceThresholds.tokenGenerationTime * 3 ? 'high' : 'medium'
        });
      }

      // Check for high error rates (requires aggregation)
      if (!metric.success) {
        await this.checkErrorRates(metric.operation);
      }
    } catch (error) {
      console.error('Error checking performance thresholds:', error);
    }
  }

  /**
   * Create a performance alert
   */
  private async createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    try {
      // Check if similar alert already exists and is unresolved
      const { data: existingAlerts } = await supabase
        .from('performance_alerts')
        .select('*')
        .eq('type', alert.type)
        .eq('resolved', false)
        .gte('timestamp', new Date(Date.now() - 3600000).toISOString()); // Last hour

      if (existingAlerts && existingAlerts.length > 0) {
        // Don't create duplicate alerts within an hour
        return;
      }

      const { error } = await supabase
        .from('performance_alerts')
        .insert({
          type: alert.type,
          message: alert.message,
          severity: alert.severity,
          timestamp: new Date().toISOString(),
          resolved: false
        });

      if (error) {
        console.error('Failed to create performance alert:', error);
      }
    } catch (error) {
      console.error('Error creating performance alert:', error);
    }
  }

  /**
   * Check error rates for a specific operation
   */
  private async checkErrorRates(operation: string): Promise<void> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data: recentMetrics, error } = await supabase
        .from('performance_metrics')
        .select('success')
        .eq('operation', operation)
        .gte('timestamp', oneHourAgo.toISOString());

      if (error || !recentMetrics || recentMetrics.length < 10) {
        // Need at least 10 operations to calculate meaningful error rate
        return;
      }

      const totalOperations = recentMetrics.length;
      const failedOperations = recentMetrics.filter(m => !m.success).length;
      const errorRate = failedOperations / totalOperations;

      if (errorRate > this.performanceThresholds.errorRateThreshold) {
        await this.createAlert({
          type: 'high_error_rate',
          message: `High error rate for ${operation}: ${Math.round(errorRate * 100)}% (${failedOperations}/${totalOperations})`,
          severity: errorRate > 0.2 ? 'critical' : 'high'
        });
      }
    } catch (error) {
      console.error('Error checking error rates:', error);
    }
  }

  /**
   * Calculate email delivery statistics
   */
  private calculateEmailStats(metrics: any[]): PerformanceStats['emailDeliveryStats'] {
    if (metrics.length === 0) {
      return {
        averageDeliveryTime: 0,
        successRate: 0,
        totalEmails: 0,
        failedEmails: 0,
        slowDeliveries: 0
      };
    }

    const totalEmails = metrics.length;
    const failedEmails = metrics.filter(m => !m.success).length;
    const successfulEmails = metrics.filter(m => m.success);
    const slowDeliveries = metrics.filter(m => m.duration > this.performanceThresholds.emailDeliveryTime).length;

    const averageDeliveryTime = successfulEmails.length > 0
      ? Math.round(successfulEmails.reduce((sum, m) => sum + m.duration, 0) / successfulEmails.length)
      : 0;

    const successRate = Math.round(((totalEmails - failedEmails) / totalEmails) * 100);

    return {
      averageDeliveryTime,
      successRate,
      totalEmails,
      failedEmails,
      slowDeliveries
    };
  }

  /**
   * Calculate token operation statistics
   */
  private calculateTokenStats(metrics: any[]): PerformanceStats['tokenOperationStats'] {
    if (metrics.length === 0) {
      return {
        averageGenerationTime: 0,
        averageValidationTime: 0,
        totalGenerations: 0,
        totalValidations: 0,
        failedOperations: 0
      };
    }

    const generationMetrics = metrics.filter(m => m.operation === 'token_generation');
    const validationMetrics = metrics.filter(m => m.operation === 'token_validation');
    const failedOperations = metrics.filter(m => !m.success).length;

    const averageGenerationTime = generationMetrics.length > 0
      ? Math.round(generationMetrics.reduce((sum, m) => sum + m.duration, 0) / generationMetrics.length)
      : 0;

    const averageValidationTime = validationMetrics.length > 0
      ? Math.round(validationMetrics.reduce((sum, m) => sum + m.duration, 0) / validationMetrics.length)
      : 0;

    return {
      averageGenerationTime,
      averageValidationTime,
      totalGenerations: generationMetrics.length,
      totalValidations: validationMetrics.length,
      failedOperations
    };
  }

  /**
   * Calculate overall system health
   */
  private calculateSystemHealth(
    emailStats: PerformanceStats['emailDeliveryStats'],
    tokenStats: PerformanceStats['tokenOperationStats'],
    activeAlerts: number
  ): PerformanceStats['systemHealth'] {
    let healthScore = 100;

    // Deduct points for poor email performance
    if (emailStats.successRate < 90) healthScore -= 20;
    if (emailStats.averageDeliveryTime > this.performanceThresholds.emailDeliveryTime) healthScore -= 15;

    // Deduct points for slow token operations
    if (tokenStats.averageGenerationTime > this.performanceThresholds.tokenGenerationTime) healthScore -= 10;
    if (tokenStats.averageValidationTime > this.performanceThresholds.tokenValidationTime) healthScore -= 10;

    // Deduct points for active alerts
    healthScore -= activeAlerts * 5;

    let overallPerformance: PerformanceStats['systemHealth']['overallPerformance'];
    if (healthScore >= 90) overallPerformance = 'excellent';
    else if (healthScore >= 70) overallPerformance = 'good';
    else if (healthScore >= 50) overallPerformance = 'degraded';
    else overallPerformance = 'critical';

    return {
      overallPerformance,
      activeAlerts,
      uptime: Math.max(0, healthScore) // Use health score as uptime percentage
    };
  }
}

export const invitationPerformanceMonitor = new InvitationPerformanceMonitor();
export default invitationPerformanceMonitor;