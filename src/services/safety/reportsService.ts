
/**
 * Safety Reports Service
 * Functions for managing safety reports
 */

import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ContentType, SafetyReport } from './types';

/**
 * Get safety reports with optional filtering
 */
export const getSafetyReports = async (
  status?: string,
  contentType?: ContentType
): Promise<{
  reports: SafetyReport[];
  totalCount: number;
  error: any;
}> => {
  try {
    logger.info(LogSource.SAFETY, 'Fetching safety reports', { 
      status, 
      contentType 
    });
    
    // Supabase removed: return empty list until Convex moderation is implemented
    return { reports: [], totalCount: 0, error: null };
  } catch (e) {
    logger.error(LogSource.SAFETY, 'Exception fetching safety reports', e);
    return { reports: [], totalCount: 0, error: e };
  }
};
