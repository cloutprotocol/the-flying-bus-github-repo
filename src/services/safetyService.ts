
/**
 * Safety Service
 * Handles safety features such as privacy controls, reporting mechanisms, 
 * and content warnings for the platform
 */

import { supabase } from '@/integrations/supabase/client';
import logger, { LogSource } from '@/utils/logger';
import { ContentType } from '@/services/moderationService';

// Types of safety reports
export type ReportType = 'inappropriate' | 'harassment' | 'privacy' | 'misinformation' | 'other';

// Content warning levels
export type WarningLevel = 'none' | 'mild' | 'moderate' | 'high';

// Content warning categories
export type WarningCategory = 'sensitive_topic' | 'mature_content' | 'controversial' | 'graphic_content';

/**
 * Report a safety concern
 */
export const reportSafetyConcern = async (
  contentId: string,
  contentType: ContentType,
  reportType: ReportType,
  description: string,
  reporterId?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.SAFETY, 'Safety concern reported', {
      contentId,
      contentType,
      reportType,
      reporterId
    });
    
    // Insert into safety_reports table
    const { error } = await supabase
      .from('safety_reports')
      .insert({
        content_id: contentId,
        content_type: contentType,
        report_type: reportType,
        description,
        reporter_id: reporterId || null,
        status: 'pending'
      });
      
    if (error) {
      logger.error(LogSource.SAFETY, 'Error reporting safety concern', { error });
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Exception reporting safety concern', { error });
    return { success: false, error };
  }
};

/**
 * Update privacy settings for a user
 */
export const updatePrivacySettings = async (
  userId: string,
  settings: {
    profileVisibility?: 'public' | 'private' | 'friends_only';
    showReadingActivity?: boolean;
    showCommentHistory?: boolean;
    contentPreferences?: string[];
  }
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.SAFETY, 'Updating privacy settings', {
      userId
    });
    
    // Check if privacy settings already exist
    const { data: existingSettings } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    const { error } = existingSettings
      ? await supabase
          .from('privacy_settings')
          .update({
            profile_visibility: settings.profileVisibility || existingSettings.profile_visibility,
            show_reading_activity: settings.showReadingActivity !== undefined ? settings.showReadingActivity : existingSettings.show_reading_activity,
            show_comment_history: settings.showCommentHistory !== undefined ? settings.showCommentHistory : existingSettings.show_comment_history,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
      : await supabase
          .from('privacy_settings')
          .insert({
            user_id: userId,
            profile_visibility: settings.profileVisibility || 'public',
            show_reading_activity: settings.showReadingActivity !== undefined ? settings.showReadingActivity : true,
            show_comment_history: settings.showCommentHistory !== undefined ? settings.showCommentHistory : true
          });
          
    if (error) {
      logger.error(LogSource.SAFETY, 'Error updating privacy settings', { error });
      return { success: false, error };
    }
    
    // If content preferences were provided, update them too
    if (settings.contentPreferences) {
      const { error: prefError } = await supabase
        .from('user_content_preferences')
        .upsert(
          settings.contentPreferences.map(preference => ({
            user_id: userId,
            preference
          })),
          { onConflict: 'user_id, preference' }
        );
        
      if (prefError) {
        logger.warn(LogSource.SAFETY, 'Error updating content preferences', { error: prefError });
        // Don't fail the whole operation for preferences update
      }
    }
    
    return { success: true, error: null };
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Exception updating privacy settings', { error });
    return { success: false, error };
  }
};

/**
 * Get privacy settings for a user
 */
export const getPrivacySettings = async (
  userId: string
): Promise<{ 
  settings: {
    profileVisibility: 'public' | 'private' | 'friends_only';
    showReadingActivity: boolean;
    showCommentHistory: boolean;
    contentPreferences: string[];
  } | null; 
  error: any 
}> => {
  try {
    // Get privacy settings
    const { data: settings, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      logger.error(LogSource.SAFETY, 'Error fetching privacy settings', { error });
      return { settings: null, error };
    }
    
    // Get content preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_content_preferences')
      .select('preference')
      .eq('user_id', userId);
      
    if (prefError) {
      logger.warn(LogSource.SAFETY, 'Error fetching content preferences', { error: prefError });
      // Don't fail the whole operation for preferences fetch
    }
    
    // If settings don't exist, return defaults
    if (!settings) {
      return {
        settings: {
          profileVisibility: 'public',
          showReadingActivity: true,
          showCommentHistory: true,
          contentPreferences: preferences?.map(p => p.preference) || []
        },
        error: null
      };
    }
    
    return {
      settings: {
        profileVisibility: settings.profile_visibility,
        showReadingActivity: settings.show_reading_activity,
        showCommentHistory: settings.show_comment_history,
        contentPreferences: preferences?.map(p => p.preference) || []
      },
      error: null
    };
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Exception fetching privacy settings', { error });
    return { settings: null, error };
  }
};

/**
 * Add or update a content warning
 */
export const setContentWarning = async (
  contentId: string,
  contentType: ContentType,
  warningLevel: WarningLevel,
  warningCategory: WarningCategory,
  message?: string,
  moderatorId?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.SAFETY, 'Setting content warning', {
      contentId,
      contentType,
      warningLevel,
      warningCategory,
      moderatorId
    });
    
    // Add to content_warnings table
    const { error } = await supabase
      .from('content_warnings')
      .upsert({
        content_id: contentId,
        content_type: contentType,
        warning_level: warningLevel,
        warning_category: warningCategory,
        message: message || null,
        moderator_id: moderatorId || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'content_id, content_type'
      });
      
    if (error) {
      logger.error(LogSource.SAFETY, 'Error setting content warning', { error });
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Exception setting content warning', { error });
    return { success: false, error };
  }
};

/**
 * Get content warning for a specific content
 */
export const getContentWarning = async (
  contentId: string,
  contentType: ContentType
): Promise<{
  warning: {
    level: WarningLevel;
    category: WarningCategory;
    message?: string;
  } | null;
  error: any;
}> => {
  try {
    const { data, error } = await supabase
      .from('content_warnings')
      .select('*')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .maybeSingle();
      
    if (error) {
      logger.error(LogSource.SAFETY, 'Error fetching content warning', { error });
      return { warning: null, error };
    }
    
    if (!data) {
      return { warning: null, error: null };
    }
    
    return {
      warning: {
        level: data.warning_level,
        category: data.warning_category,
        message: data.message
      },
      error: null
    };
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Exception fetching content warning', { error });
    return { warning: null, error };
  }
};

/**
 * Get safety reports
 */
export const getSafetyReports = async (
  filters: {
    status?: 'pending' | 'reviewing' | 'resolved';
    reportType?: ReportType;
    contentType?: ContentType;
    startDate?: Date;
    endDate?: Date;
  } = {},
  page = 1,
  pageSize = 20
): Promise<{
  reports: any[];
  count: number;
  error: any;
}> => {
  try {
    let query = supabase
      .from('safety_reports')
      .select(`
        id,
        content_id,
        content_type,
        report_type,
        description,
        created_at,
        updated_at,
        status,
        reporter_id,
        resolver_id,
        resolution_notes,
        profiles:reporter_id(display_name, avatar_url)
      `, { count: 'exact' });
    
    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.reportType) {
      query = query.eq('report_type', filters.reportType);
    }
    
    if (filters.contentType) {
      query = query.eq('content_type', filters.contentType);
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
      logger.error(LogSource.SAFETY, 'Error fetching safety reports', { error });
      throw error;
    }
    
    return {
      reports: data.map(report => ({
        id: report.id,
        contentId: report.content_id,
        contentType: report.content_type,
        reportType: report.report_type,
        description: report.description,
        createdAt: new Date(report.created_at),
        updatedAt: report.updated_at ? new Date(report.updated_at) : null,
        status: report.status,
        reporter: report.reporter_id ? {
          id: report.reporter_id,
          name: report.profiles?.display_name || 'Unknown User',
          avatar: report.profiles?.avatar_url
        } : null,
        resolverId: report.resolver_id,
        resolutionNotes: report.resolution_notes
      })),
      count: count || 0,
      error: null
    };
    
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Exception fetching safety reports', { error });
    return { reports: [], count: 0, error };
  }
};

/**
 * Resolve a safety report
 */
export const resolveSafetyReport = async (
  reportId: string,
  resolverId: string,
  resolutionNotes?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.SAFETY, 'Resolving safety report', {
      reportId,
      resolverId
    });
    
    const { error } = await supabase
      .from('safety_reports')
      .update({
        status: 'resolved',
        resolver_id: resolverId,
        resolution_notes: resolutionNotes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);
      
    if (error) {
      logger.error(LogSource.SAFETY, 'Error resolving safety report', { error });
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Exception resolving safety report', { error });
    return { success: false, error };
  }
};
