
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

// Report types
export type ReportType = 'harassment' | 'inappropriate' | 'spam' | 'misinformation' | 'other';
export type ContentType = 'article' | 'comment' | 'profile' | 'media';

// Content warning types
export type WarningLevel = 'none' | 'mild' | 'moderate' | 'high';
export type WarningCategory = 'sensitive_topic' | 'mature_content' | 'controversial' | 'graphic_content';

/**
 * Report content for safety concerns
 */
export const reportContent = async (
  contentId: string,
  contentType: ContentType,
  reportType: ReportType,
  reportDetails: string,
  reporterId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.SAFETY, 'Reporting content for safety concerns', {
      contentId,
      contentType,
      reportType
    });
    
    // Use flagged_content table for safety reports
    const { error } = await supabase
      .from('flagged_content')
      .insert({
        content_id: contentId,
        content_type: contentType,
        reason: `${reportType}: ${reportDetails}`,
        reporter_id: reporterId,
        status: 'pending'
      });
      
    if (error) {
      logger.error(LogSource.SAFETY, 'Error reporting content', {
        error,
        contentId,
        contentType
      });
      return { success: false, error };
    }
    
    logger.info(LogSource.SAFETY, 'Content reported successfully', {
      contentId,
      contentType,
      reportType
    });
    
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.SAFETY, 'Exception reporting content', e);
    return { success: false, error: e };
  }
};

/**
 * Get content warning based on content ID and type
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
    logger.info(LogSource.SAFETY, 'Fetching content warning', {
      contentId,
      contentType
    });
    
    // For now, use flagged_content table as a source of warnings
    const { data, error } = await supabase
      .from('flagged_content')
      .select('*')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) {
      logger.error(LogSource.SAFETY, 'Error fetching content warning', error);
      return { warning: null, error };
    }
    
    // If there's flagged content, return a warning based on the reason
    if (data && data.length > 0) {
      const flaggedItem = data[0];
      let warningLevel: WarningLevel = 'mild';
      let warningCategory: WarningCategory = 'sensitive_topic';
      
      // Determine warning level based on status
      if (flaggedItem.status === 'pending') {
        warningLevel = 'moderate';
      } else if (flaggedItem.status === 'confirmed') {
        warningLevel = 'high';
      }
      
      // Determine category based on reason
      if (flaggedItem.reason.includes('harassment')) {
        warningCategory = 'controversial';
      } else if (flaggedItem.reason.includes('inappropriate')) {
        warningCategory = 'mature_content';
      } else if (flaggedItem.reason.includes('misinformation')) {
        warningCategory = 'controversial';
      } else if (flaggedItem.reason.includes('graphic')) {
        warningCategory = 'graphic_content';
      }
      
      return {
        warning: {
          level: warningLevel,
          category: warningCategory,
          message: `This content has been flagged as potentially ${warningCategory.replace('_', ' ')}.`
        },
        error: null
      };
    }
    
    // No warning needed
    return { 
      warning: { 
        level: 'none',
        category: 'sensitive_topic'
      }, 
      error: null 
    };
  } catch (e) {
    logger.error(LogSource.SAFETY, 'Exception fetching content warning', e);
    return { 
      warning: null, 
      error: e 
    };
  }
};

/**
 * Get safety reports
 */
export const getSafetyReports = async (
  status?: string,
  contentType?: ContentType
): Promise<{
  reports: any[];
  totalCount: number;
  error: any;
}> => {
  try {
    logger.info(LogSource.SAFETY, 'Fetching safety reports', { 
      status, 
      contentType 
    });
    
    let query = supabase
      .from('flagged_content')
      .select(`
        *,
        reporter:reporter_id (display_name, avatar_url),
        reviewer:reviewer_id (display_name, avatar_url)
      `);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (contentType) {
      query = query.eq('content_type', contentType);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false });
      
    if (error) {
      logger.error(LogSource.SAFETY, 'Error fetching safety reports', error);
      return { reports: [], totalCount: 0, error };
    }
    
    logger.info(LogSource.SAFETY, 'Safety reports fetched successfully', {
      count: data?.length
    });
    
    return { 
      reports: data || [], 
      totalCount: count || data?.length || 0, 
      error: null 
    };
  } catch (e) {
    logger.error(LogSource.SAFETY, 'Exception fetching safety reports', e);
    return { reports: [], totalCount: 0, error: e };
  }
};

export default {
  reportContent,
  getSafetyReports,
  getContentWarning
};
