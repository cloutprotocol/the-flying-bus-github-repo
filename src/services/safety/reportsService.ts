
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
    
    // Transform data to match SafetyReport interface
    const reports: SafetyReport[] = data?.map(item => ({
      id: item.id,
      content_id: item.content_id,
      content_type: item.content_type as ContentType,
      reason: item.reason,
      reporter_id: item.reporter_id,
      reviewer_id: item.reviewer_id,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.created_at, // Using created_at as updated_at since it's required
      reviewed_at: item.reviewed_at,
      // Handle cases where reporter or reviewer might be error objects or null
      reporter: typeof item.reporter === 'object' && item.reporter !== null 
        ? { 
            display_name: item.reporter.display_name || 'Unknown',
            avatar_url: item.reporter.avatar_url || ''
          }
        : undefined,
      reviewer: typeof item.reviewer === 'object' && item.reviewer !== null
        ? {
            display_name: item.reviewer.display_name || 'Unknown',
            avatar_url: item.reviewer.avatar_url || ''
          }
        : undefined
    })) || [];
    
    return { 
      reports, 
      totalCount: count || reports.length || 0, 
      error: null 
    };
  } catch (e) {
    logger.error(LogSource.SAFETY, 'Exception fetching safety reports', e);
    return { reports: [], totalCount: 0, error: e };
  }
};
