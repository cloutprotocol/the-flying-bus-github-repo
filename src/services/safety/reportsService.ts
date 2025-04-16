
/**
 * Safety Reports Service
 * Functions for managing safety reports
 */

import { supabase } from '@/integrations/supabase/client';
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
