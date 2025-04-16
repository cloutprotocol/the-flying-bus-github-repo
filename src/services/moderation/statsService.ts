
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
        content_id,
        content_type,
        status,
        reviewed_at,
        reviewer_id,
        profiles:reviewer_id (display_name, avatar_url)
      `)
      .not('reviewer_id', 'is', null)
      .order('reviewed_at', { ascending: false })
      .limit(10);
      
    if (activityError) {
      logger.error(LogSource.MODERATION, 'Error fetching recent activity', activityError);
      return { stats: null, error: activityError };
    }
    
    const stats = {
      counts: {
        byStatus: flaggedCountsByStatus,
        byType: flaggedCountsByType
      },
      recentActivity
    };
    
    logger.info(LogSource.MODERATION, 'Moderation statistics fetched successfully');
    return { stats, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception fetching moderation statistics', e);
    return { stats: null, error: e };
  }
};
