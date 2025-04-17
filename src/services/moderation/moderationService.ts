
/**
 * Core moderation service functionality
 */

import { supabase } from '@/integrations/supabase/client';
import { LogSource } from '@/utils/logger/types';
import { logger } from '@/utils/logger/logger';
import { ContentType, ModerationAction } from './types';

/**
 * Log a moderation action
 */
export const logModerationAction = async (
  contentId: string,
  contentType: ContentType,
  action: ModerationAction,
  moderatorId: string,
  notes?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.MODERATION, 'Logging moderation action', {
      contentId,
      contentType,
      action,
      moderatorId
    });
    
    const { error } = await supabase
      .from('flagged_content')
      .insert({
        content_id: contentId,
        content_type: contentType,
        status: action === 'approve' ? 'resolved' : 'pending',
        reason: notes || `${action} action by moderator`,
        reporter_id: moderatorId,
        reviewer_id: moderatorId,
        reviewed_at: new Date().toISOString()
      });
      
    if (error) {
      logger.error(LogSource.MODERATION, 'Error logging moderation action', {
        error,
        contentId,
        contentType
      });
      return { success: false, error };
    }
    
    logger.info(LogSource.MODERATION, 'Moderation action logged successfully');
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.MODERATION, 'Exception logging moderation action', e);
    return { success: false, error: e };
  }
};
