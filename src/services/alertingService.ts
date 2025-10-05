import { emailMonitoringService } from './emailMonitoringService';
import { securityMonitoringService } from './securityMonitoringService';
import { supabase } from '@/integrations/supabase/client';

export interface Alert {
  id?: string;
  type: 'email' | 'security' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'email_success_rate' | 'security_events' | 'error_rate' | 'token_failures';
  threshold: number;
  timeWindow: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

class AlertingService {
  private defaultRules: AlertRule[] = [
    {
      id: 'email_success_rate_critical',
      name: 'Email Success Rate Critical',
      type: 'email_success_rate',
      threshold: 90, // Below 90%
      timeWindow: 60, // 1 hour
      severity: 'critical',
      enabled: true
    },
    {
      id: 'email_success_rate_warning',
      name: 'Email Success Rate Warning',
      type: 'email_success_rate',
      threshold: 95, // Below 95%
      timeWindow: 60, // 1 hour
      severity: 'medium',
      enabled: true
    },
    {
      id: 'security_events_high',
      name: 'High Security Events',
      type: 'security_events',
      threshold: 10, // More than 10 events
      timeWindow: 60, // 1 hour
      severity: 'high',
      enabled: true
    },
    {
      id: 'token_failures_medium',
      name: 'Token Validation Failures',
      type: 'token_failures',
      threshold: 20, // More than 20 failures
      timeWindow: 60, // 1 hour
      severity: 'medium',
      enabled: true
    },
    {
      id: 'error_rate_high',
      name: 'High Error Rate',
      type: 'error_rate',
      threshold: 10, // More than 10 errors
      timeWindow: 30, // 30 minutes
      severity: 'high',
      enabled: true
    }
  ];

  /**
   * Check all alert rules and trigger alerts if thresholds are exceeded
   */
  async checkAlertRules(): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.defaultRules) {
      if (!rule.enabled) continue;

      try {
        const alert = await this.checkRule(rule);
        if (alert) {
          triggeredAlerts.push(alert);
          await this.createAlert(alert);
        }
      } catch (error) {
        console.error(`Error checking rule ${rule.id}:`, error);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Check a specific alert rule
   */
  private async checkRule(rule: AlertRule): Promise<Alert | null> {
    const now = new Date();
    const startTime = new Date(now.getTime() - rule.timeWindow * 60 * 1000);

    switch (rule.type) {
      case 'email_success_rate':
        return await this.checkEmailSuccessRate(rule, startTime, now);
      
      case 'security_events':
        return await this.checkSecurityEvents(rule, startTime, now);
      
      case 'token_failures':
        return await this.checkTokenFailures(rule, startTime, now);
      
      case 'error_rate':
        return await this.checkErrorRate(rule, startTime, now);
      
      default:
        return null;
    }
  }

  /**
   * Check email success rate rule
   */
  private async checkEmailSuccessRate(
    rule: AlertRule,
    startTime: Date,
    endTime: Date
  ): Promise<Alert | null> {
    const metrics = await emailMonitoringService.getEmailMetrics(startTime, endTime);
    
    if (metrics.sent > 0 && metrics.successRate < rule.threshold) {
      return {
        type: 'email',
        severity: rule.severity,
        title: `Email Success Rate Below Threshold`,
        message: `Email success rate is ${metrics.successRate}% (threshold: ${rule.threshold}%)`,
        metadata: {
          rule_id: rule.id,
          success_rate: metrics.successRate,
          threshold: rule.threshold,
          emails_sent: metrics.sent,
          emails_failed: metrics.failed
        },
        acknowledged: false
      };
    }

    return null;
  }

  /**
   * Check security events rule
   */
  private async checkSecurityEvents(
    rule: AlertRule,
    startTime: Date,
    endTime: Date
  ): Promise<Alert | null> {
    const metrics = await securityMonitoringService.getSecurityMetrics(startTime, endTime);
    
    if (metrics.totalEvents > rule.threshold) {
      return {
        type: 'security',
        severity: rule.severity,
        title: `High Number of Security Events`,
        message: `${metrics.totalEvents} security events detected (threshold: ${rule.threshold})`,
        metadata: {
          rule_id: rule.id,
          total_events: metrics.totalEvents,
          critical_events: metrics.criticalEvents,
          high_events: metrics.highEvents,
          threshold: rule.threshold
        },
        acknowledged: false
      };
    }

    return null;
  }

  /**
   * Check token failures rule
   */
  private async checkTokenFailures(
    rule: AlertRule,
    startTime: Date,
    endTime: Date
  ): Promise<Alert | null> {
    const metrics = await securityMonitoringService.getSecurityMetrics(startTime, endTime);
    
    if (metrics.tokenValidationFailures > rule.threshold) {
      return {
        type: 'security',
        severity: rule.severity,
        title: `High Token Validation Failures`,
        message: `${metrics.tokenValidationFailures} token validation failures (threshold: ${rule.threshold})`,
        metadata: {
          rule_id: rule.id,
          failures: metrics.tokenValidationFailures,
          threshold: rule.threshold
        },
        acknowledged: false
      };
    }

    return null;
  }

  /**
   * Check error rate rule
   */
  private async checkErrorRate(
    rule: AlertRule,
    startTime: Date,
    endTime: Date
  ): Promise<Alert | null> {
    const errors = await emailMonitoringService.getRecentErrors(50);
    const recentErrors = errors.filter(error => 
      new Date(error.timestamp) >= startTime
    );
    
    if (recentErrors.length > rule.threshold) {
      return {
        type: 'system',
        severity: rule.severity,
        title: `High Error Rate Detected`,
        message: `${recentErrors.length} errors in the last ${rule.timeWindow} minutes (threshold: ${rule.threshold})`,
        metadata: {
          rule_id: rule.id,
          error_count: recentErrors.length,
          threshold: rule.threshold,
          time_window: rule.timeWindow
        },
        acknowledged: false
      };
    }

    return null;
  }

  /**
   * Create an alert in the database
   */
  private async createAlert(alert: Alert): Promise<void> {
    try {
      // Check if a similar alert already exists and is not acknowledged
      const { data: existingAlerts } = await supabase
        .from('alerts')
        .select('id')
        .eq('type', alert.type)
        .eq('title', alert.title)
        .eq('acknowledged', false)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

      // Don't create duplicate alerts
      if (existingAlerts && existingAlerts.length > 0) {
        return;
      }

      const { error } = await supabase
        .from('alerts')
        .insert({
          ...alert,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to create alert:', error);
      }
    } catch (err) {
      console.error('Error creating alert:', err);
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(limit: number = 50): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting active alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    acknowledged: number;
    unacknowledged: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('type, severity, acknowledged')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        throw error;
      }

      const alerts = data || [];
      const total = alerts.length;
      
      const byType = alerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const bySeverity = alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const acknowledged = alerts.filter(a => a.acknowledged).length;
      const unacknowledged = total - acknowledged;

      return {
        total,
        byType,
        bySeverity,
        acknowledged,
        unacknowledged
      };
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      return {
        total: 0,
        byType: {},
        bySeverity: {},
        acknowledged: 0,
        unacknowledged: 0
      };
    }
  }
}

export const alertingService = new AlertingService();