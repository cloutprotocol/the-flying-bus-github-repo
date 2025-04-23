
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';
import { ApiError, ApiErrorType } from '@/utils/errors/types';

export const updateArticleStatus = async (
  articleId: string,
  newStatus: StatusType
): Promise<{ success: boolean; error?: any }> => {
  try {
    if (!articleId) {
      logger.error(LogSource.ARTICLE, 'Cannot update article status: Missing article ID');
      return { success: false, error: new Error('Missing article ID') };
    }

    logger.info(LogSource.ARTICLE, `Updating article ${articleId} status to ${newStatus}`);
    
    // Get current user session for ownership validation
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      logger.error(LogSource.ARTICLE, 'User authentication required to update article status');
      return { 
        success: false, 
        error: new ApiError('User authentication required', ApiErrorType.AUTH)
      };
    }

    // Log the request we're about to make
    logger.info(LogSource.ARTICLE, `Sending update request to Supabase`, {
      articleId,
      newStatus,
      table: 'articles',
      userId
    });
    
    // First ensure author_id is set properly
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('author_id')
      .eq('id', articleId)
      .single();
      
    if (fetchError) {
      logger.error(LogSource.ARTICLE, `Error fetching article for status update: ${fetchError.message}`, fetchError);
      return { success: false, error: fetchError };
    }
    
    // If no author is set, update it to the current user
    if (!article.author_id) {
      logger.info(LogSource.ARTICLE, `Setting author_id for article ${articleId} to ${userId}`);
      
      const { error: updateAuthorError } = await supabase
        .from('articles')
        .update({ author_id: userId })
        .eq('id', articleId);
      
      if (updateAuthorError) {
        logger.error(LogSource.ARTICLE, `Failed to set author for article ${articleId}`, updateAuthorError);
        return { success: false, error: updateAuthorError };
      }
    }
    
    // Now update the status
    const { error, data } = await supabase
      .from('articles')
      .update({ status: newStatus })
      .eq('id', articleId)
      .select();
    
    if (error) {
      logger.error(LogSource.ARTICLE, `Error updating article status: ${error.message}`, error);
      return { success: false, error };
    }
    
    logger.info(LogSource.ARTICLE, `Article status updated successfully to ${newStatus}`, {
      articleId,
      responseData: data
    });
    
    return { success: true };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception updating article status', e);
    return { success: false, error: e };
  }
};
