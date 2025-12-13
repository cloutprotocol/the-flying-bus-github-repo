// Supabase removed; stubbing email monitoring.

export interface EmailMetrics {
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
  successRate: number;
  deliveryRate: number;
}

export interface EmailEvent {
  id?: string;
  type: 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
  email: string;
  template: string;
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface TokenAnalytics {
  generated: number;
  validated: number;
  expired: number;
  used: number;
  failedValidations: number;
  securityEvents: number;
  averageTimeToUse: number;
}

class EmailMonitoringService {
  /**
   * Log an email event to the database
   */
  async logEmailEvent(event: Omit<EmailEvent, 'id' | 'timestamp'>): Promise<void> {
    try { /* no-op */ } catch {}
  }

  /**
   * Get email metrics for a specific time period
   */
  async getEmailMetrics(
    startDate: Date,
    endDate: Date,
    template?: string
  ): Promise<EmailMetrics> {
    try {
      const data: any[] = [];
      const eventCounts = data.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sent = eventCounts.sent || 0;
      const delivered = eventCounts.delivered || 0;
      const failed = eventCounts.failed || 0;
      const bounced = eventCounts.bounced || 0;
      const opened = eventCounts.opened || 0;
      const clicked = eventCounts.clicked || 0;

      const successRate = sent > 0 ? ((delivered / sent) * 100) : 0;
      const deliveryRate = sent > 0 ? (((sent - failed - bounced) / sent) * 100) : 0;

      return {
        sent,
        delivered,
        failed,
        bounced,
        opened,
        clicked,
        successRate: Math.round(successRate * 100) / 100,
        deliveryRate: Math.round(deliveryRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting email metrics:', error);
      return {
        sent: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        opened: 0,
        clicked: 0,
        successRate: 0,
        deliveryRate: 0
      };
    }
  }

  /**
   * Get token usage analytics
   */
  async getTokenAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<TokenAnalytics> {
    try {
      // Get token creation and usage data
      const tokens: any[] = [];
      const securityEvents: any[] = [];

      const now = new Date();
      const generated = tokens.length;
      const used = tokens.filter(t => t.used_at).length;
      const expired = tokens.filter(t => 
        new Date(t.expires_at) < now && !t.used_at
      ).length;
      const failedValidations = securityEvents?.length || 0;

      // Calculate average time to use (in hours)
      const usedTokens = tokens.filter(t => t.used_at);
      const averageTimeToUse = usedTokens.length > 0 
        ? usedTokens.reduce((acc, token) => {
            const created = new Date(token.created_at);
            const used = new Date(token.used_at!);
            return acc + (used.getTime() - created.getTime());
          }, 0) / usedTokens.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      return {
        generated,
        validated: used + failedValidations,
        expired,
        used,
        failedValidations,
        securityEvents: failedValidations,
        averageTimeToUse: Math.round(averageTimeToUse * 100) / 100
      };
    } catch (error) {
      console.error('Error getting token analytics:', error);
      return {
        generated: 0,
        validated: 0,
        expired: 0,
        used: 0,
        failedValidations: 0,
        securityEvents: 0,
        averageTimeToUse: 0
      };
    }
  }

  /**
   * Get recent error events
   */
  async getRecentErrors(limit: number = 50): Promise<any[]> {
    try {
      const data: any[] = [];
        .eq('type', 'failed')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recent errors:', error);
      return [];
    }
  }

  /**
   * Check system health
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      emailSuccessRate: number;
      tokenSecurityEvents: number;
      recentErrors: number;
    };
    alerts: string[];
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get recent email metrics
      const emailMetrics = await this.getEmailMetrics(oneHourAgo, now);
      
      // Get recent token analytics
      const tokenAnalytics = await this.getTokenAnalytics(oneDayAgo, now);
      
      // Get recent errors
      const recentErrors = await this.getRecentErrors(10);

      const alerts: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check email success rate
      if (emailMetrics.successRate < 95 && emailMetrics.sent > 0) {
        alerts.push(`Email success rate is ${emailMetrics.successRate}% (below 95%)`);
        status = 'warning';
      }

      if (emailMetrics.successRate < 90 && emailMetrics.sent > 0) {
        status = 'critical';
      }

      // Check for security events
      if (tokenAnalytics.securityEvents > 10) {
        alerts.push(`High number of security events: ${tokenAnalytics.securityEvents}`);
        status = status === 'critical' ? 'critical' : 'warning';
      }

      // Check for recent errors
      const recentErrorCount = recentErrors.length;
      if (recentErrorCount > 5) {
        alerts.push(`High error rate: ${recentErrorCount} errors in last hour`);
        status = status === 'critical' ? 'critical' : 'warning';
      }

      return {
        status,
        metrics: {
          emailSuccessRate: emailMetrics.successRate,
          tokenSecurityEvents: tokenAnalytics.securityEvents,
          recentErrors: recentErrorCount
        },
        alerts
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        status: 'critical',
        metrics: {
          emailSuccessRate: 0,
          tokenSecurityEvents: 0,
          recentErrors: 0
        },
        alerts: ['Unable to check system health']
      };
    }
  }
}

export const emailMonitoringService = new EmailMonitoringService();
