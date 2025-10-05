
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { validateArticleFields } from './validation/articleValidationService';
import { updateArticleStatus } from './status/articleStatusService';
import { checkArticleOwnership } from '../articleOwnershipService';
export { reviewArticle } from './review/articleReviewHandlerService';
export { updateArticleStatus } from './status/articleStatusService';

// Enhanced function with ownership validation
export const requestArticleReview = async (
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

    // Use ownership service to validate permissions
    const ownershipResult = await checkArticleOwnership(articleId, userId);
    
    if (!ownershipResult.success) {
      logger.error(LogSource.ARTICLE, `Failed to check ownership for article ${articleId}`, ownershipResult.error);
      return { 
        success: false, 
        error: new ApiError(ownershipResult.error || 'Failed to validate article ownership', ApiErrorType.AUTH)
      };
    }

    // Check if user can edit the article (required to submit for review)
    if (!ownershipResult.canEdit) {
      logger.error(LogSource.ARTICLE, `User ${userId} does not have permission to submit article ${articleId} for review`);
      return { 
        success: false, 
        error: new ApiError('You do not have permission to submit this article for review', ApiErrorType.AUTH)
      };
    }

    const article = ownershipResult.article;
    if (!article) {
      return { 
        success: false, 
        error: new ApiError('Article not found', ApiErrorType.NOT_FOUND)
      };
    }

    // Validate required fields
    try {
      validateArticleFields({
        title: article.title,
        content: article.content,
        category_id: 'default', // This would need to be fetched if required
        author_id: article.author_id
      });
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
    
    // Update status to pending_review with submission timestamp
    const { error } = await supabase
      .from('articles')
      .update({ 
        status: 'pending_review',
        submitted_for_review_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .eq('author_id', userId); // Double-check ownership

    if (error) {
      logger.error(LogSource.ARTICLE, `Failed to submit article ${articleId} for review`, error);
      return { success: false, error };
    }
    
    logger.info(LogSource.ARTICLE, `Successfully submitted article ${articleId} for review`);
    return { success: true };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception submitting article for review', e);
    return { success: false, error: e };
  }
};
