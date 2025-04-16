
/**
 * Content Warning Service
 * Functions for managing content warnings
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ContentType, WarningLevel, WarningCategory, ContentWarning } from './types';

/**
 * Get content warning based on content ID and type
 */
export const getContentWarning = async (
  contentId: string,
  contentType: ContentType
): Promise<{
  warning: ContentWarning | null;
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
