
// safetyService.ts
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

// Report types
export type ReportType = 'harassment' | 'inappropriate' | 'spam' | 'misinformation' | 'other';
export type ContentType = 'article' | 'comment' | 'profile' | 'media';

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
  getSafetyReports
};
