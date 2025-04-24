
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { validateArticleFields } from './validation/articleValidationService';
import { updateArticleStatus } from './status/articleStatusService';
import { saveDraft } from '@/services/draftService';
import { measureApiCall } from '@/services/monitoringService';

/**
 * A unified service for article submission that handles both submitting for review
 * and saving drafts with consistent error handling and logging
 */
export const articleSubmissionService = {
  /**
   * Submit an article for review
   */
  submitForReview: async (
    articleId: string
  ): Promise<{ success: boolean; error?: any }> => {
    const endMeasure = measureApiCall('submit-for-review');
    
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
        endMeasure();
        return { 
          success: false, 
          error: new ApiError('User authentication required', ApiErrorType.AUTH)
        };
      }

      // First, fetch the article to validate required fields
      const fetchEnd = measureApiCall('fetch-article-for-validation');
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('title, content, category_id, author_id')
        .eq('id', articleId)
        .single();
      fetchEnd();

      if (fetchError) {
        logger.error(LogSource.ARTICLE, `Failed to fetch article ${articleId} for validation`, fetchError);
        endMeasure();
        return { success: false, error: fetchError };
      }

      // Validate author ownership
      if (article.author_id && article.author_id !== userId) {
        logger.error(LogSource.ARTICLE, `User ${userId} attempted to submit article ${articleId} owned by ${article.author_id}`);
        endMeasure();
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
        endMeasure();
        return { 
          success: false, 
          error: new ApiError('Missing required fields', ApiErrorType.VALIDATION, undefined, validationError)
        };
      }

      logger.info(LogSource.ARTICLE, `Submitting article ${articleId} for review`);
      const updateEnd = measureApiCall('update-article-status');
      const result = await updateArticleStatus(articleId, 'pending');
      updateEnd();
      
      if (!result.success) {
        logger.error(LogSource.ARTICLE, `Failed to submit article ${articleId} for review`, result.error);
      } else {
        logger.info(LogSource.ARTICLE, `Successfully submitted article ${articleId} for review`);
      }
      
      endMeasure();
      return result;
    } catch (e) {
      logger.error(LogSource.ARTICLE, 'Exception submitting article for review', e);
      endMeasure();
      return { success: false, error: e };
    }
  },

  /**
   * Save article as draft with performance optimization
   */
  saveDraft: async (
    articleId: string | undefined, 
    formData: any
  ): Promise<{ success: boolean; error?: any; articleId?: string }> => {
    const endMeasure = measureApiCall('save-draft');
    
    try {
      logger.info(LogSource.EDITOR, 'Saving article draft via unified service', { 
        articleId: articleId || 'new', 
        formDataKeys: Object.keys(formData)
      });
      
      const result = await saveDraft(articleId || '', formData);
      
      endMeasure();
      return { 
        success: result.success, 
        error: result.error, 
        articleId: result.articleId 
      };
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error in unified draft save service', { error });
      endMeasure();
      return { success: false, error, articleId };
    }
  }
};
