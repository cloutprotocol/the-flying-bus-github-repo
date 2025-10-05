/**
 * Role Monitoring Service
 * 
 * Provides monitoring and alerting for role assignment failures and inconsistencies.
 * Implements requirements 4.1, 4.2, 4.3.
 */

import { supabase } from '@/integrations/supabase/client';
import { RoleAuditService } from './roleAuditService';
import { RoleConsistencyService } from './roleConsistencyService';

export interface RoleMonitoringAlert {
  id: string;
  type: 'role_assignment_failure' | 'role_inconsistency' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  userId?: string;
  userEmail?: string;
  metadata: Record<string, any>;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface MonitoringMetrics {
  roleAssignmentSuccessRate: number;
  totalRoleAssignments: number;
  failedRoleAssignments: number;
  roleInconsistencies: number;
  lastMonitoringRun: string;
  alertsGenerated: number;
  criticalAlerts: number;
}

export interface MonitoringConfig {
  enableRealTimeMonitoring: boolean;
  alertThresholds: {
    failureRateThreshold: number; // Percentage
    inconsistencyThreshold: number; // Count
    criticalFailureCount: number; // Count within time window
  };
  monitoringInterval: number; // Minutes
  alertRetentionDays: number;
}

export class RoleMonitoringService {
  private static readonly DEFAULT_CONFIG: MonitoringConfig = {
    enableRealTimeMonitoring: true,
    alertThresholds: {
      failureRateThreshold: 5, // 5% failure rate triggers alert
      inconsistencyThreshold: 3, // 3 or more inconsistencies trigger alert
      criticalFailureCount: 5 // 5 failures in monitoring window
    },
    monitoringInterval: 15, // Check every 15 minutes
    alertRetentionDays: 30
  };

  /**
   * Monitor role assignment failures and generate alerts
   */
  static async monitorRoleAssignments(config: MonitoringConfig = this.DEFAULT_CONFIG): Promise<void> {
    try {
      console.log('Starting role assignment monitoring...');

      const metrics = await this.calculateMonitoringMetrics();
      
      // Check for failure rate threshold
      if (metrics.roleAssignmentSuccessRate < (100 - config.alertThresholds.failureRateThreshold)) {
        await this.generateAlert({
          type: 'role_assignment_failure',
          severity: 'high',
          title: 'High Role Assignment Failure Rate',
          description: `Role assignment success rate is ${metrics.roleAssignmentSuccessRate.toFixed(1)}%, below threshold of ${100 - config.alertThresholds.failureRateThreshold}%`,
          metadata: {
            success_rate: metrics.roleAssignmentSuccessRate,
            total_assignments: metrics.totalRoleAssignments,
            failed_assignments: metrics.failedRoleAssignments,
            threshold: config.alertThresholds.failureRateThreshold
          }
        });
      }

      // Check for role inconsistencies
      if (metrics.roleInconsistencies >= config.alertThresholds.inconsistencyThreshold) {
        await this.generateAlert({
          type: 'role_inconsistency',
          severity: metrics.roleInconsistencies >= 10 ? 'critical' : 'medium',
          title: 'Role Inconsistencies Detected',
          description: `Found ${metrics.roleInconsistencies} role inconsistencies that need attention`,
          metadata: {
            inconsistency_count: metrics.roleInconsistencies,
            threshold: config.alertThresholds.inconsistencyThreshold
          }
        });
      }

      // Check for critical failure count
      if (metrics.failedRoleAssignments >= config.alertThresholds.criticalFailureCount) {
        await this.generateAlert({
          type: 'role_assignment_failure',
          severity: 'critical',
          title: 'Critical Role Assignment Failures',
          description: `${metrics.failedRoleAssignments} role assignment failures detected in monitoring window`,
          metadata: {
            failure_count: metrics.failedRoleAssignments,
            threshold: config.alertThresholds.criticalFailureCount,
            monitoring_window: config.monitoringInterval
          }
        });
      }

      // Log monitoring completion
      await RoleAuditService.logEvent(
        'role_monitoring_completed',
        'system',
        'role_monitoring',
        true,
        {
          metrics,
          alerts_generated: metrics.alertsGenerated,
          monitoring_date: new Date().toISOString()
        }
      );

      console.log('Role assignment monitoring completed:', metrics);
    } catch (error) {
      console.error('Error in role assignment monitoring:', error);
      
      await this.generateAlert({
        type: 'system_error',
        severity: 'high',
        title: 'Role Monitoring System Error',
        description: `Role monitoring system encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_stack: error instanceof Error ? error.stack : undefined,
          monitoring_date: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Calculate monitoring metrics
   */
  static async calculateMonitoringMetrics(): Promise<MonitoringMetrics> {
    try {
      // Get role assignment audit logs from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const roleAssignmentLogs = await RoleAuditService.queryAuditLogs({
        action: 'role_change',
        startDate: yesterday,
        limit: 1000
      });

      const totalRoleAssignments = roleAssignmentLogs.length;
      const failedRoleAssignments = roleAssignmentLogs.filter(log => !log.success).length;
      const successfulRoleAssignments = totalRoleAssignments - failedRoleAssignments;
      
      const roleAssignmentSuccessRate = totalRoleAssignments > 0 
        ? (successfulRoleAssignments / totalRoleAssignments) * 100 
        : 100;

      // Get current role inconsistencies
      const inconsistencies = await RoleConsistencyService.detectIncorrectRoles();
      const roleInconsistencies = inconsistencies.length;

      // Get alert count from the last 24 hours
      const alerts = await this.getRecentAlerts(24);
      const alertsGenerated = alerts.length;
      const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;

      return {
        roleAssignmentSuccessRate,
        totalRoleAssignments,
        failedRoleAssignments,
        roleInconsistencies,
        lastMonitoringRun: new Date().toISOString(),
        alertsGenerated,
        criticalAlerts
      };
    } catch (error) {
      console.error('Error calculating monitoring metrics:', error);
      throw error;
    }
  }

  /**
   * Generate a monitoring alert
   */
  static async generateAlert(alertData: Omit<RoleMonitoringAlert, 'id' | 'createdAt' | 'resolved'>): Promise<string> {
    try {
      const alert: RoleMonitoringAlert = {
        id: crypto.randomUUID(),
        ...alertData,
        createdAt: new Date().toISOString(),
        resolved: false
      };

      // Store alert in database (using audit_logs table with special action)
      await RoleAuditService.logEvent(
        `monitoring_alert_${alert.type}`,
        'monitoring_alert',
        alert.id,
        false, // Alerts are considered "failures" that need attention
        {
          alert_type: alert.type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          user_id: alert.userId,
          user_email: alert.userEmail,
          alert_metadata: alert.metadata,
          resolved: alert.resolved
        }
      );

      console.log(`Generated ${alert.severity} alert: ${alert.title}`);
      
      // If critical, also log as a separate high-priority event
      if (alert.severity === 'critical') {
        await RoleAuditService.logEvent(
          'critical_role_alert',
          'system',
          'critical_monitoring',
          false,
          {
            alert_id: alert.id,
            alert_title: alert.title,
            alert_description: alert.description,
            requires_immediate_attention: true
          }
        );
      }

      return alert.id;
    } catch (error) {
      console.error('Error generating alert:', error);
      throw error;
    }
  }

  /**
   * Get recent alerts
   */
  static async getRecentAlerts(hoursBack: number = 24): Promise<RoleMonitoringAlert[]> {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hoursBack);

      const alertLogs = await RoleAuditService.queryAuditLogs({
        resourceType: 'monitoring_alert',
        startDate,
        limit: 500
      });

      return alertLogs.map(log => ({
        id: log.resource_id,
        type: log.metadata?.alert_type || 'system_error',
        severity: log.metadata?.severity || 'medium',
        title: log.metadata?.title || 'Unknown Alert',
        description: log.metadata?.description || 'No description available',
        userId: log.metadata?.user_id,
        userEmail: log.metadata?.user_email,
        metadata: log.metadata?.alert_metadata || {},
        createdAt: log.created_at,
        resolved: log.metadata?.resolved || false,
        resolvedAt: log.metadata?.resolved_at,
        resolvedBy: log.metadata?.resolved_by
      }));
    } catch (error) {
      console.error('Error getting recent alerts:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<void> {
    try {
      await RoleAuditService.logEvent(
        'monitoring_alert_resolved',
        'monitoring_alert',
        alertId,
        true,
        {
          alert_id: alertId,
          resolved_by: resolvedBy,
          resolution,
          resolved_at: new Date().toISOString()
        }
      );

      console.log(`Alert ${alertId} resolved by ${resolvedBy}`);
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Get monitoring dashboard data
   */
  static async getMonitoringDashboard() {
    try {
      const metrics = await this.calculateMonitoringMetrics();
      const recentAlerts = await this.getRecentAlerts(24);
      const roleStats = await RoleConsistencyService.getRoleStatistics();

      // Get trend data (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyLogs = await RoleAuditService.queryAuditLogs({
        action: 'role_change',
        startDate: weekAgo,
        limit: 1000
      });

      // Group by day for trend analysis
      const dailyStats = this.groupLogsByDay(weeklyLogs);

      return {
        metrics,
        recentAlerts: recentAlerts.slice(0, 10), // Latest 10 alerts
        roleStats,
        trends: {
          dailyRoleAssignments: dailyStats,
          weeklySuccessRate: this.calculateWeeklySuccessRate(weeklyLogs)
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting monitoring dashboard data:', error);
      throw error;
    }
  }

  /**
   * Group audit logs by day
   */
  private static groupLogsByDay(logs: any[]): Record<string, { total: number; successful: number; failed: number }> {
    const grouped: Record<string, { total: number; successful: number; failed: number }> = {};

    logs.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { total: 0, successful: 0, failed: 0 };
      }
      grouped[date].total++;
      if (log.success) {
        grouped[date].successful++;
      } else {
        grouped[date].failed++;
      }
    });

    return grouped;
  }

  /**
   * Calculate weekly success rate
   */
  private static calculateWeeklySuccessRate(logs: any[]): number {
    if (logs.length === 0) return 100;
    
    const successful = logs.filter(log => log.success).length;
    return (successful / logs.length) * 100;
  }

  /**
   * Check system health
   */
  static async checkSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const metrics = await this.calculateMonitoringMetrics();
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check success rate
      if (metrics.roleAssignmentSuccessRate < 95) {
        issues.push(`Role assignment success rate is ${metrics.roleAssignmentSuccessRate.toFixed(1)}%`);
        recommendations.push('Investigate role assignment failures and fix underlying issues');
      }

      // Check inconsistencies
      if (metrics.roleInconsistencies > 0) {
        issues.push(`${metrics.roleInconsistencies} role inconsistencies detected`);
        recommendations.push('Run role consistency fixes to resolve inconsistencies');
      }

      // Check critical alerts
      if (metrics.criticalAlerts > 0) {
        issues.push(`${metrics.criticalAlerts} critical alerts require attention`);
        recommendations.push('Review and resolve critical alerts immediately');
      }

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (metrics.criticalAlerts > 0 || metrics.roleAssignmentSuccessRate < 90) {
        status = 'critical';
      } else if (issues.length > 0) {
        status = 'warning';
      }

      return { status, issues, recommendations };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        status: 'critical',
        issues: ['System health check failed'],
        recommendations: ['Investigate monitoring system errors']
      };
    }
  }
}

export default RoleMonitoringService;