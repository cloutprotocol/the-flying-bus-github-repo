
import { supabase } from '@/integrations/supabase/client';
import { LogSource } from '@/utils/logger/types';
import { logger } from '@/utils/logger/logger';
import { ModeratorPerformanceResponse } from './types';

/**
 * Get moderator performance metrics
 */
export const getModeratorPerformance = async (): Promise<ModeratorPerformanceResponse> => {
  try {
    logger.info(LogSource.MODERATION, 'Fetching moderator performance metrics');
    
    // Get counts of moderated content by moderator
    const { data: moderatorCounts, error: countError } = await supabase
      .from('flagged_content')
      .select(`
        reviewer_id,
        profiles:reviewer_id (display_name, avatar_url)
      `)
      .not('reviewer_id', 'is', null)
      .then(response => {
        if (response.error) {
          return { data: null, error: response.error };
        }
        
        // Process data to group by reviewer
        const countsByReviewer: Record<string, any> = {};
        if (response.data) {
          response.data.forEach(item => {
            if (!countsByReviewer[item.reviewer_id]) {
              countsByReviewer[item.reviewer_id] = {
                reviewer_id: item.reviewer_id,
                count: 0,
                profiles: item.profiles
              };
            }
            countsByReviewer[item.reviewer_id].count++;
          });
        }
        
        return { 
          data: Object.values(countsByReviewer), 
          error: null 
        };
      });
      
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
