
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { validateArticleFields } from './validation/articleValidationService';
import { updateArticleStatus } from './status/articleStatusService';
export { reviewArticle } from './review/articleReviewHandlerService';
export { updateArticleStatus } from './status/articleStatusService';

export const submitArticleForReview = async (
  articleId: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    if (!articleId) {
      logger.error(LogSource.ARTICLE, 'Cannot submit article: Missing article ID');
      return { success: false, error: new Error('Missing article ID') };
    }

    // Get current user session - CRITICAL for author_id validation
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      logger.error(LogSource.ARTICLE, 'User authentication required to submit article');
      return { 
        success: false, 
        error: new ApiError('User authentication required', ApiErrorType.AUTH)
      };
    }

    // First, fetch the article to validate required fields
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('title, content, category_id, author_id')
      .eq('id', articleId)
      .single();

    if (fetchError) {
      logger.error(LogSource.ARTICLE, `Failed to fetch article ${articleId} for validation`, fetchError);
      return { success: false, error: fetchError };
    }

    // Validate author ownership
    if (article.author_id && article.author_id !== userId) {
      logger.error(LogSource.ARTICLE, `User ${userId} attempted to submit article ${articleId} owned by ${article.author_id}`);
      return { 
        success: false, 
        error: new ApiError('You do not have permission to submit this article', ApiErrorType.AUTH)
      };
    }

    // Validate required fields
    try {
      validateArticleFields(article);
    } catch (validationError) {
      logger.error(LogSource.ARTICLE, 'Article validation error when submitting for review', { 
        validationError,
        articleId 
      });
      return { 
        success: false, 
        error: new ApiError('Missing required fields', ApiErrorType.VALIDATION, undefined, validationError)
      };
    }

    logger.info(LogSource.ARTICLE, `Submitting article ${articleId} for review`);
    const result = await updateArticleStatus(articleId, 'pending');
    
    if (!result.success) {
      logger.error(LogSource.ARTICLE, `Failed to submit article ${articleId} for review`, result.error);
    } else {
      logger.info(LogSource.ARTICLE, `Successfully submitted article ${articleId} for review`);
    }
    
    return result;
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception submitting article for review', e);
    return { success: false, error: e };
  }
};
