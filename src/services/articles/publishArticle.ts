
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const publishArticle = async (
  articleId: string,
  shouldPublish: boolean = true
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('articles')
      .update({ 
        status: shouldPublish ? 'published' : 'draft',
        published_at: shouldPublish ? new Date().toISOString() : null
      })
      .eq('id', articleId);

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error publishing article', { articleId, error });
      return { success: false, error: error.message };
    }

    logger.info(LogSource.ARTICLE, 'Article published successfully', { articleId, shouldPublish });
    return { success: true };
  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception publishing article', { articleId, error });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
