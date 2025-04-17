
import { supabase } from '@/integrations/supabase/client';
import { LogSource } from '@/utils/logger/types';
import { logger } from '@/utils/logger/logger';

// Content types for moderation
export type ContentType = 'article' | 'comment' | 'profile' | 'media';

// Moderation action types
export type ModerationAction = 'approve' | 'reject' | 'flag' | 'review';

/**
 * Log a moderation action
 */
export const logModerationAction = async (
  contentId: string,
  contentType: ContentType,
  action: ModerationAction,
  moderatorId: string,
  notes?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.MODERATION, 'Logging moderation action', {
      contentId,
      contentType,
      action,
      moderatorId
    });
    
    // Use flagged_content table to store moderation logs temporarily
    // This is not ideal but works until a proper moderation_logs table is created
    const { error } = await supabase
      .from('flagged_content')
      .insert({
        content_id: contentId,
        content_type: contentType,
        status: 'resolved',
        reason: `${action}: ${notes || 'No additional notes'}`,
        reporter_id: moderatorId,
        reviewer_id: moderatorId,
        reviewed_at: new Date().toISOString()
      });
      
    if (error) {
      logger.error(LogSource.MODERATION, 'Error logging moderation action', {
        error,
        contentId,
        contentType
      });
      return { success: false, error };
    }
    
    logger.info(LogSource.MODERATION, 'Moderation action logged successfully', {
      contentId,
      contentType,
      action
    });
    
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception logging moderation action', e);
    return { success: false, error: e };
  }
};

/**
 * Get moderation statistics
 */
export const getModerationStats = async (): Promise<{
  stats: any;
  error: any;
}> => {
  try {
    logger.info(LogSource.MODERATION, 'Fetching moderation statistics');
    
    // Get counts of flagged content by status
    const { data: flaggedCountsByStatus, error: countError } = await supabase
      .from('flagged_content')
      .select('status')
      .then(response => {
        // Handle count aggregation manually since .group() might not be supported
        if (response.error) {
          return { data: null, error: response.error };
        }
        
        // Process data to group by status
        const counts: Record<string, number> = {};
        if (response.data) {
          response.data.forEach(item => {
            if (!counts[item.status]) {
              counts[item.status] = 0;
            }
            counts[item.status]++;
          });
        }
        
        // Convert to expected format
        const result = Object.entries(counts).map(([status, count]) => ({ 
          status, 
          count 
        }));
        
        return { data: result, error: null };
      });
      
    if (countError) {
      logger.error(LogSource.MODERATION, 'Error fetching flagged content counts', countError);
      return { stats: null, error: countError };
    }
    
    // Get counts of flagged content by type
    const { data: flaggedCountsByType, error: typeError } = await supabase
      .from('flagged_content')
      .select('content_type')
      .then(response => {
        // Handle count aggregation manually
        if (response.error) {
          return { data: null, error: response.error };
        }
        
        // Process data to group by content_type
        const counts: Record<string, number> = {};
        if (response.data) {
          response.data.forEach(item => {
            if (!counts[item.content_type]) {
              counts[item.content_type] = 0;
            }
            counts[item.content_type]++;
          });
        }
        
        // Convert to expected format
        const result = Object.entries(counts).map(([content_type, count]) => ({ 
          content_type, 
          count 
        }));
        
        return { data: result, error: null };
      });
      
    if (typeError) {
      logger.error(LogSource.MODERATION, 'Error fetching content type counts', typeError);
      return { stats: null, error: typeError };
    }
    
    // Get recent moderation activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('flagged_content')
      .select(`
        id,
        content_id,
        content_type,
        status,
        reviewed_at,
        reviewer:reviewer_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .not('reviewer_id', 'is', null)
      .order('reviewed_at', { ascending: false })
      .limit(10);
      
    if (activityError) {
      logger.error(LogSource.MODERATION, 'Error fetching recent activity', activityError);
      return { stats: null, error: activityError };
    }
    
    // Get pending count
    const { count: pendingCount, error: pendingError } = await supabase
      .from('flagged_content')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    if (pendingError) {
      logger.error(LogSource.MODERATION, 'Error fetching pending count', pendingError);
      return { stats: null, error: pendingError };
    }
    
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from('flagged_content')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      logger.error(LogSource.MODERATION, 'Error fetching total count', totalError);
      return { stats: null, error: totalError };
    }
    
    const stats = {
      byStatus: flaggedCountsByStatus,
      byContentType: flaggedCountsByType,
      recentActivity,
      pendingCount: pendingCount || 0,
      totalCount: totalCount || 0
    };
    
    logger.info(LogSource.MODERATION, 'Moderation statistics fetched successfully');
    return { stats, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception fetching moderation statistics', e);
    return { stats: null, error: e };
  }
};

/**
 * Get moderator performance metrics
 */
export const getModeratorPerformance = async (): Promise<{
  performance: any;
  error: any;
}> => {
  try {
    logger.info(LogSource.MODERATION, 'Fetching moderator performance metrics');
    
    // Get counts of moderated content by moderator
    const { data: moderatorCounts, error: countError } = await supabase
      .from('flagged_content')
      .select(`
        reviewer_id,
        profiles:reviewer_id (display_name, avatar_url)
      `)
      .not('reviewer_id', 'is', null)
      .then(response => {
        if (response.error) {
          return { data: null, error: response.error };
        }
        
        // Process data to group by reviewer
        const countsByReviewer: Record<string, any> = {};
        if (response.data) {
          response.data.forEach(item => {
            if (!countsByReviewer[item.reviewer_id]) {
              countsByReviewer[item.reviewer_id] = {
                reviewer_id: item.reviewer_id,
                count: 0,
                profiles: item.profiles
              };
            }
            countsByReviewer[item.reviewer_id].count++;
          });
        }
        
        return { 
          data: Object.values(countsByReviewer), 
          error: null 
        };
      });
      
    if (countError) {
      logger.error(LogSource.MODERATION, 'Error fetching moderator counts', countError);
      return { performance: null, error: countError };
    }
    
    const performance = {
      moderatorActivity: moderatorCounts
    };
    
    logger.info(LogSource.MODERATION, 'Moderator performance metrics fetched successfully');
    return { performance, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception fetching moderator performance', e);
    return { performance: null, error: e };
  }
};

/**
 * Get all moderation metrics
 * This function combines stats and performance metrics for the dashboard
 */
export const getModerationMetrics = async (): Promise<{
  stats: any;
  error: any;
}> => {
  try {
    logger.info(LogSource.MODERATION, 'Fetching combined moderation metrics');
    
    // Get moderation stats
    const { stats, error: statsError } = await getModerationStats();
    if (statsError) {
      return { stats: null, error: statsError };
    }
    
    // Get performance metrics
    const { performance, error: perfError } = await getModeratorPerformance();
    if (perfError) {
      return { stats: null, error: perfError };
    }
    
    // Combine data for the dashboard
    const combinedStats = {
      ...stats,
      moderatorsCount: performance?.moderatorActivity?.length || 0,
      topModerators: performance?.moderatorActivity?.slice(0, 5) || [],
      // Add placeholder data for metrics not yet implemented
      reportedCount: stats?.byStatus?.find((s: any) => s.status === 'pending')?.count || 0,
      flaggedUsersCount: 0,
      // Add action counts (get from recentActivity or return placeholders)
      byAction: [
        { action: 'approve', count: stats?.recentActivity?.filter((a: any) => a.status === 'resolved' && a.reason?.includes('approve'))?.length || 0 },
        { action: 'reject', count: stats?.recentActivity?.filter((a: any) => a.status === 'resolved' && a.reason?.includes('reject'))?.length || 0 },
        { action: 'flag', count: stats?.recentActivity?.filter((a: any) => a.status === 'pending')?.length || 0 }
      ],
      // Format the recent actions for the dashboard
      recentActions: stats?.recentActivity?.map((activity: any) => {
        let action = 'review';
        if (activity.reason?.includes('approve')) action = 'approve';
        if (activity.reason?.includes('reject')) action = 'reject';
        if (activity.status === 'pending') action = 'flag';
        
        return {
          id: activity.id,
          content_id: activity.content_id,
          content_type: activity.content_type,
          action,
          moderator_name: activity.reviewer?.display_name || 'Unknown',
          created_at: activity.reviewed_at || activity.created_at
        };
      }) || []
    };
    
    logger.info(LogSource.MODERATION, 'Combined moderation metrics fetched successfully');
    return { stats: combinedStats, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception fetching combined moderation metrics', e);
    return { stats: null, error: e };
  }
};
