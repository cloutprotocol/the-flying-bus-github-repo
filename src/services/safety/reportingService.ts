
/**
 * Content Reporting Service
 * Functions for reporting inappropriate content
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ReportType, ContentType } from './types';

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
