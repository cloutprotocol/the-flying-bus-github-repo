
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
      .select('status, count(*)')
      .group('status');
      
    if (countError) {
      logger.error(LogSource.MODERATION, 'Error fetching flagged content counts', countError);
      return { stats: null, error: countError };
    }
    
    // Get counts of flagged content by type
    const { data: flaggedCountsByType, error: typeError } = await supabase
      .from('flagged_content')
      .select('content_type, count(*)')
      .group('content_type');
      
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
        count(*),
        profiles:reviewer_id (display_name, avatar_url)
      `)
      .not('reviewer_id', 'is', null)
      .group('reviewer_id, profiles:reviewer_id (display_name, avatar_url)');
      
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
