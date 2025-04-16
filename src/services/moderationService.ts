
/**
 * Moderation Service
 * Handles content moderation, screening, and reporting for the platform
 */

import { supabase } from '@/integrations/supabase/client';
import logger, { LogSource } from '@/utils/logger';
import { sanitizeContent } from '@/services/validationService';
import { User } from '@supabase/supabase-js';

// Types for moderation actions
export type ModerationAction = 'approve' | 'reject' | 'flag' | 'report';
export type ContentType = 'article' | 'comment' | 'debate' | 'profile';
export type ModeratorRole = 'admin' | 'moderator';

// Content screening config - keywords that trigger moderation flags
const SCREENING_CONFIG = {
  profanity: [
    // Basic list of inappropriate words for a kids platform
    // This would be expanded and maintained separately in production
    'badword1', 'badword2', 'inappropriate'
  ],
  sensitiveTopics: [
    'alcohol', 'drugs', 'gambling', 'violence'
  ],
  // Patterns to detect potential personal information
  personalInfoPatterns: [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Emails
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/ // IP addresses
  ]
};

/**
 * Screen content for inappropriate material
 * @param content The content to screen
 * @returns Object with screening results
 */
export const screenContent = (content: string): {
  flagged: boolean;
  reasons: string[];
} => {
  const reasons: string[] = [];
  const contentLower = content.toLowerCase();
  
  // Check for profanity
  SCREENING_CONFIG.profanity.forEach(word => {
    if (contentLower.includes(word.toLowerCase())) {
      reasons.push(`Contains inappropriate language: "${word}"`);
    }
  });
  
  // Check for sensitive topics
  SCREENING_CONFIG.sensitiveTopics.forEach(topic => {
    if (contentLower.includes(topic.toLowerCase())) {
      reasons.push(`Contains sensitive topic: "${topic}"`);
    }
  });
  
  // Check for personal information patterns
  SCREENING_CONFIG.personalInfoPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      reasons.push('May contain personal information');
    }
  });
  
  return {
    flagged: reasons.length > 0,
    reasons
  };
};

/**
 * Log a moderation action for audit purposes
 */
export const logModerationAction = async (
  contentId: string, 
  contentType: ContentType, 
  action: ModerationAction,
  moderatorId: string,
  reason?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.MODERATION, `Logging moderation action: ${action}`, {
      contentId,
      contentType,
      moderatorId
    });
    
    const { error } = await supabase
      .from('moderation_logs')
      .insert({
        content_id: contentId,
        content_type: contentType,
        action,
        moderator_id: moderatorId,
        reason: reason || null
      });
      
    if (error) {
      logger.error(LogSource.MODERATION, 'Error logging moderation action', { error });
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    logger.error(LogSource.MODERATION, 'Exception logging moderation action', { error });
    return { success: false, error };
  }
};

/**
 * Get moderation metrics
 */
export const getModerationMetrics = async (
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<{ 
  metrics: any; 
  error: any 
}> => {
  try {
    let timeCondition: string;
    
    switch (timeframe) {
      case 'day':
        timeCondition = "created_at > now() - interval '1 day'";
        break;
      case 'month':
        timeCondition = "created_at > now() - interval '1 month'";
        break;
      case 'week':
      default:
        timeCondition = "created_at > now() - interval '1 week'";
    }
    
    // Get counts by action type
    const { data: actionCounts, error: actionsError } = await supabase
      .rpc('get_moderation_action_counts', { timeframe_condition: timeCondition });
      
    if (actionsError) throw actionsError;
    
    // Get counts by content type
    const { data: contentTypeCounts, error: typesError } = await supabase
      .rpc('get_moderation_content_type_counts', { timeframe_condition: timeCondition });
      
    if (typesError) throw typesError;
    
    // Get top moderators by activity
    const { data: moderatorActivity, error: moderatorsError } = await supabase
      .rpc('get_moderator_activity', { timeframe_condition: timeCondition, limit_count: 5 });
      
    if (moderatorsError) throw moderatorsError;
    
    return {
      metrics: {
        byAction: actionCounts || [],
        byContentType: contentTypeCounts || [],
        topModerators: moderatorActivity || [],
        timeframe
      },
      error: null
    };
  } catch (error) {
    logger.error(LogSource.MODERATION, 'Error fetching moderation metrics', { error });
    return { 
      metrics: null, 
      error 
    };
  }
};

/**
 * Process content through automated moderation screening
 * @returns Information about the screening result
 */
export const processAutomatedModeration = async (
  content: string,
  contentType: ContentType,
  contentId: string,
  currentUser: User | null
): Promise<{
  flagged: boolean;
  reasons: string[];
  error: any;
}> => {
  try {
    // First sanitize the content
    const sanitizedContent = sanitizeContent(content);
    
    // Then screen it
    const screeningResult = screenContent(sanitizedContent);
    
    // If flagged, record it
    if (screeningResult.flagged) {
      logger.info(LogSource.MODERATION, 'Content flagged by automated screening', {
        contentId,
        contentType,
        reasons: screeningResult.reasons
      });
      
      // Create a flagged_content record
      const { error } = await supabase
        .from('flagged_content')
        .insert({
          content_id: contentId,
          content_type: contentType,
          reason: screeningResult.reasons.join('. '),
          reporter_id: null, // System-generated flag
          status: 'pending'
        });
      
      if (error) {
        logger.error(LogSource.MODERATION, 'Error recording flagged content', { error });
        return { ...screeningResult, error };
      }
    }
    
    return { ...screeningResult, error: null };
  } catch (error) {
    logger.error(LogSource.MODERATION, 'Exception in automated moderation', { error });
    return { flagged: false, reasons: [], error };
  }
};

/**
 * Report content for moderation review
 */
export const reportContent = async (
  contentId: string,
  contentType: ContentType,
  reason: string,
  reporterId?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.MODERATION, 'Content reported by user', {
      contentId,
      contentType,
      reporterId
    });
    
    // Add to flagged_content table
    const { error } = await supabase
      .from('flagged_content')
      .insert({
        content_id: contentId,
        content_type: contentType,
        reason,
        reporter_id: reporterId || null,
        status: 'pending'
      });
      
    if (error) {
      logger.error(LogSource.MODERATION, 'Error reporting content', { error });
      return { success: false, error };
    }
    
    // Update the status of the content to 'flagged'
    if (contentType === 'comment') {
      await supabase
        .from('comments')
        .update({ status: 'flagged' })
        .eq('id', contentId);
    } else if (contentType === 'article') {
      await supabase
        .from('articles')
        .update({ status: 'flagged' })
        .eq('id', contentId);
    }
    
    return { success: true, error: null };
  } catch (error) {
    logger.error(LogSource.MODERATION, 'Exception reporting content', { error });
    return { success: false, error };
  }
};

/**
 * Fetch the moderation logs for audit purposes
 */
export const getModerationLogs = async (
  filters: {
    contentType?: ContentType;
    action?: ModerationAction;
    moderatorId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
  page = 1,
  pageSize = 20
): Promise<{
  logs: any[];
  count: number;
  error: any;
}> => {
  try {
    let query = supabase
      .from('moderation_logs')
      .select(`
        id,
        content_id,
        content_type,
        action,
        reason,
        created_at,
        moderator_id,
        profiles!inner(display_name, avatar_url)
      `, { count: 'exact' });
    
    // Apply filters
    if (filters.contentType) {
      query = query.eq('content_type', filters.contentType);
    }
    
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    
    if (filters.moderatorId) {
      query = query.eq('moderator_id', filters.moderatorId);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    
    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
      
    if (error) {
      logger.error(LogSource.MODERATION, 'Error fetching moderation logs', { error });
      throw error;
    }
    
    return {
      logs: data.map(log => ({
        id: log.id,
        contentId: log.content_id,
        contentType: log.content_type,
        action: log.action,
        reason: log.reason,
        createdAt: new Date(log.created_at),
        moderator: {
          id: log.moderator_id,
          name: log.profiles?.display_name || 'Unknown',
          avatar: log.profiles?.avatar_url
        }
      })),
      count: count || 0,
      error: null
    };
    
  } catch (error) {
    logger.error(LogSource.MODERATION, 'Exception fetching moderation logs', { error });
    return { logs: [], count: 0, error };
  }
};
