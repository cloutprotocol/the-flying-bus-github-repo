
/**
 * Content Reporting Service
 * Functions for reporting inappropriate content
 */

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
    
    // Supabase removed: replace with no-op success until Convex action exists
    logger.info(LogSource.SAFETY, 'Content report queued (no-op)', {
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
