
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Update an article's status (draft, pending, published, etc.)
 * 
 * @param articleId The article ID to update
 * @param status The new status of the article
 * @returns Success status and any error
 */
export const updateArticleStatus = async (
  articleId: string,
  status: 'draft' | 'pending' | 'published' | 'rejected'
): Promise<{ success: boolean; error?: any }> => {
  try {
    console.log(`Updating article ${articleId} to status '${status}'`);
    logger.info(LogSource.ARTICLE, `Updating article ${articleId} status to '${status}'`);

    // Add published_at date if status is published
    const updateData: any = { status };
    if (status === 'published') {
      updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', articleId);

    if (error) {
      console.error(`Failed to update article ${articleId} status:`, error);
      logger.error(LogSource.ARTICLE, `Failed to update article ${articleId} status`, { error });
      return { success: false, error };
    }
    
    console.log(`Successfully updated article ${articleId} status to '${status}'`);
    logger.info(LogSource.ARTICLE, `Successfully updated article ${articleId} status to '${status}'`);
    return { success: true };
  } catch (e) {
    console.error(`Exception updating article ${articleId} status:`, e);
    logger.error(LogSource.ARTICLE, `Exception updating article ${articleId} status`, { error: e });
    return { success: false, error: e };
  }
};
