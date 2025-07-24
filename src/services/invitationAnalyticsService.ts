import { supabase } from '@/integrations/supabase/client';

export interface InvitationMetrics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  claimedInvitations: number;
  unclaimedInvitations: number;
  conversionRate: number; // percentage of approved invitations that were claimed
  averageProcessingTime: number; // in hours
  emailDeliveryRate: number; // percentage of emails successfully delivered
  tokenExpiryRate: number; // percentage of tokens that expired without being used
}

export interface InvitationTrendData {
  date: string;
  requests: number;
  approvals: number;
  claims: number;
}

export interface InvitationConversionFunnel {
  stage: string;
  count: number;
  percentage: number;
}

export interface InvitationReport {
  metrics: InvitationMetrics;
  trends: InvitationTrendData[];
  conversionFunnel: InvitationConversionFunnel[];
  topReasons: { reason: string; count: number }[];
  performanceAlerts: string[];
}

class InvitationAnalyticsService {
  /**
   * Get comprehensive invitation metrics
   */
  async getInvitationMetrics(): Promise<{ data: InvitationMetrics | null; error: any }> {
    try {
      // Get basic counts
      const [
        totalRequestsResult,
        pendingRequestsResult,
        approvedRequestsResult,
        deniedRequestsResult,
        claimedInvitationsResult,
        emailDeliveryResult,
        expiredTokensResult
      ] = await Promise.all([
        // Total requests
        supabase
          .from('invitation_requests')
          .select('*', { count: 'exact', head: true }),
        
        // Pending requests
        supabase
          .from('invitation_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        
        // Approved requests
        supabase
          .from('invitation_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        
        // Denied requests
        supabase
          .from('invitation_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'denied'),
        
        // Claimed invitations
        supabase
          .from('invitation_requests')
          .select('*', { count: 'exact', head: true })
          .not('invitation_claimed_at', 'is', null),
        
        // Email delivery stats
        supabase
          .from('email_notifications')
          .select('delivery_status'),
        
        // Expired tokens
        supabase
          .from('invitation_tokens')
          .select('*', { count: 'exact', head: true })
          .lt('expires_at', new Date().toISOString())
          .is('used_at', null)
      ]);

      // Check for errors
      if (totalRequestsResult.error) throw totalRequestsResult.error;
      if (pendingRequestsResult.error) throw pendingRequestsResult.error;
      if (approvedRequestsResult.error) throw approvedRequestsResult.error;
      if (deniedRequestsResult.error) throw deniedRequestsResult.error;
      if (claimedInvitationsResult.error) throw claimedInvitationsResult.error;
      if (emailDeliveryResult.error) throw emailDeliveryResult.error;
      if (expiredTokensResult.error) throw expiredTokensResult.error;

      const totalRequests = totalRequestsResult.count || 0;
      const pendingRequests = pendingRequestsResult.count || 0;
      const approvedRequests = approvedRequestsResult.count || 0;
      const deniedRequests = deniedRequestsResult.count || 0;
      const claimedInvitations = claimedInvitationsResult.count || 0;
      const expiredTokens = expiredTokensResult.count || 0;

      // Calculate unclaimed invitations (approved but not claimed)
      const unclaimedInvitations = approvedRequests - claimedInvitations;

      // Calculate conversion rate
      const conversionRate = approvedRequests > 0 
        ? Math.round((claimedInvitations / approvedRequests) * 100) 
        : 0;

      // Calculate email delivery rate
      const emailNotifications = emailDeliveryResult.data || [];
      const successfulEmails = emailNotifications.filter(n => n.delivery_status === 'sent').length;
      const emailDeliveryRate = emailNotifications.length > 0 
        ? Math.round((successfulEmails / emailNotifications.length) * 100) 
        : 0;

      // Calculate token expiry rate
      const tokenExpiryRate = approvedRequests > 0 
        ? Math.round((expiredTokens / approvedRequests) * 100) 
        : 0;

      // Calculate average processing time
      const { data: processingTimeData, error: processingTimeError } = await supabase
        .from('invitation_requests')
        .select('created_at, reviewed_at')
        .not('reviewed_at', 'is', null);

      if (processingTimeError) throw processingTimeError;

      let averageProcessingTime = 0;
      if (processingTimeData && processingTimeData.length > 0) {
        const totalProcessingTime = processingTimeData.reduce((sum, request) => {
          const createdAt = new Date(request.created_at);
          const reviewedAt = new Date(request.reviewed_at);
          const diffInHours = (reviewedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          return sum + diffInHours;
        }, 0);
        averageProcessingTime = Math.round(totalProcessingTime / processingTimeData.length);
      }

      const metrics: InvitationMetrics = {
        totalRequests,
        pendingRequests,
        approvedRequests,
        deniedRequests,
        claimedInvitations,
        unclaimedInvitations,
        conversionRate,
        averageProcessingTime,
        emailDeliveryRate,
        tokenExpiryRate
      };

      return { data: metrics, error: null };
    } catch (error) {
      console.error('Error fetching invitation metrics:', error);
      return { data: null, error };
    }
  }

  /**
   * Get invitation trend data for the last 30 days
   */
  async getInvitationTrends(days: number = 30): Promise<{ data: InvitationTrendData[] | null; error: any }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get daily counts for requests, approvals, and claims
      const { data: trendsData, error } = await supabase.rpc('get_invitation_trends', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      });

      if (error) throw error;

      return { data: trendsData || [], error: null };
    } catch (error) {
      console.error('Error fetching invitation trends:', error);
      return { data: null, error };
    }
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(): Promise<{ data: InvitationConversionFunnel[] | null; error: any }> {
    try {
      const { data: metrics, error } = await this.getInvitationMetrics();
      if (error || !metrics) throw error;

      const funnel: InvitationConversionFunnel[] = [
        {
          stage: 'Requests Submitted',
          count: metrics.totalRequests,
          percentage: 100
        },
        {
          stage: 'Requests Approved',
          count: metrics.approvedRequests,
          percentage: metrics.totalRequests > 0 
            ? Math.round((metrics.approvedRequests / metrics.totalRequests) * 100) 
            : 0
        },
        {
          stage: 'Invitations Claimed',
          count: metrics.claimedInvitations,
          percentage: metrics.totalRequests > 0 
            ? Math.round((metrics.claimedInvitations / metrics.totalRequests) * 100) 
            : 0
        }
      ];

      return { data: funnel, error: null };
    } catch (error) {
      console.error('Error calculating conversion funnel:', error);
      return { data: null, error };
    }
  }

  /**
   * Generate comprehensive invitation report
   */
  async generateInvitationReport(): Promise<{ data: InvitationReport | null; error: any }> {
    try {
      const [metricsResult, trendsResult, funnelResult] = await Promise.all([
        this.getInvitationMetrics(),
        this.getInvitationTrends(),
        this.getConversionFunnel()
      ]);

      if (metricsResult.error) throw metricsResult.error;
      if (trendsResult.error) throw trendsResult.error;
      if (funnelResult.error) throw funnelResult.error;

      const metrics = metricsResult.data!;
      const trends = trendsResult.data || [];
      const conversionFunnel = funnelResult.data || [];

      // Generate performance alerts
      const performanceAlerts: string[] = [];
      
      if (metrics.conversionRate < 50) {
        performanceAlerts.push(`Low conversion rate: ${metrics.conversionRate}% of approved invitations are being claimed`);
      }
      
      if (metrics.emailDeliveryRate < 90) {
        performanceAlerts.push(`Email delivery issues: Only ${metrics.emailDeliveryRate}% of emails are being delivered successfully`);
      }
      
      if (metrics.tokenExpiryRate > 20) {
        performanceAlerts.push(`High token expiry rate: ${metrics.tokenExpiryRate}% of tokens are expiring unused`);
      }
      
      if (metrics.averageProcessingTime > 72) {
        performanceAlerts.push(`Slow processing: Average review time is ${metrics.averageProcessingTime} hours`);
      }

      // Get top denial reasons (placeholder - would need to add reason tracking)
      const topReasons = [
        { reason: 'Age requirements not met', count: 0 },
        { reason: 'Incomplete application', count: 0 },
        { reason: 'Safety concerns', count: 0 }
      ];

      const report: InvitationReport = {
        metrics,
        trends,
        conversionFunnel,
        topReasons,
        performanceAlerts
      };

      return { data: report, error: null };
    } catch (error) {
      console.error('Error generating invitation report:', error);
      return { data: null, error };
    }
  }

  /**
   * Get invitation metrics for dashboard widgets
   */
  async getDashboardMetrics(): Promise<{ data: any; error: any }> {
    try {
      const { data: metrics, error } = await this.getInvitationMetrics();
      if (error) throw error;

      return {
        data: {
          totalInvitations: metrics?.totalRequests || 0,
          pendingInvitations: metrics?.pendingRequests || 0,
          approvedInvitations: metrics?.approvedRequests || 0,
          claimedInvitations: metrics?.claimedInvitations || 0,
          conversionRate: metrics?.conversionRate || 0,
          emailDeliveryRate: metrics?.emailDeliveryRate || 0
        },
        error: null
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return { data: null, error };
    }
  }
}

export const invitationAnalyticsService = new InvitationAnalyticsService();
export default invitationAnalyticsService;