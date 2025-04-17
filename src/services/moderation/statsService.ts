
import { supabase } from '@/integrations/supabase/client';
import { LogSource } from '@/utils/logger/types';
import { logger } from '@/utils/logger/logger';
import { ModerationStatsResponse } from './types';

/**
 * Get moderation statistics
 */
export const getModerationStats = async (): Promise<ModerationStatsResponse> => {
  try {
    logger.info(LogSource.MODERATION, 'Fetching moderation statistics');
    
    // Get counts of flagged content by status
    const { data: flaggedCountsByStatus, error: countError } = await supabase
      .from('flagged_content')
      .select('status, count(*)', { count: 'exact' })
      .then(response => {
        if (response.error) {
          return { data: null, error: response.error };
        }
        return response;
      });
      
    if (countError) {
      logger.error(LogSource.MODERATION, 'Error fetching flagged content counts', countError);
      return { stats: null, error: countError };
    }
    
    // Get counts of content by type
    const { data: contentTypeCounts, error: typeError } = await supabase
      .from('flagged_content')
      .select('content_type, count(*)', { count: 'exact' })
      .then(response => {
        if (response.error) {
          return { data: null, error: response.error };
        }
        return response;
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
        created_at,
        reviewed_at,
        reviewer:reviewer_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (activityError) {
      logger.error(LogSource.MODERATION, 'Error fetching recent activity', activityError);
      return { stats: null, error: activityError };
    }
    
    const stats = {
      byStatus: flaggedCountsByStatus,
      byContentType: contentTypeCounts,
      recentActivity,
      pendingCount: flaggedCountsByStatus?.filter(s => s.status === 'pending')?.length || 0,
      totalCount: flaggedCountsByStatus?.length || 0
    };
    
    logger.info(LogSource.MODERATION, 'Moderation statistics fetched successfully');
    return { stats, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception fetching moderation statistics', e);
    return { stats: null, error: e };
  }
};
