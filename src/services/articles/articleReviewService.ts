import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';
import { z } from 'zod';
import { ApiError, ApiErrorType } from '@/utils/errors/types';

// Schema for required article fields when submitting for review
const requiredArticleFieldsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category_id: z.string().uuid("Category ID must be a valid UUID"),
});

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

    // If no author is set, update it to the current user
    if (!article.author_id) {
      const { error: updateAuthorError } = await supabase
        .from('articles')
        .update({ author_id: userId })
        .eq('id', articleId);
      
      if (updateAuthorError) {
        logger.error(LogSource.ARTICLE, `Failed to set author for article ${articleId}`, updateAuthorError);
        return { success: false, error: updateAuthorError };
      }
    }

    // Validate required fields
    try {
      requiredArticleFieldsSchema.parse(article);
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

export const reviewArticle = async (
  articleId: string,
  review: { status: StatusType; feedback?: string }
) => {
  try {
    logger.info(LogSource.ARTICLE, `Reviewing article ${articleId}`);
    
    const { error } = await supabase
      .from('articles')
      .update({ status: review.status })
      .eq('id', articleId);
    
    if (error) {
      logger.error(LogSource.ARTICLE, 'Error reviewing article', error);
      return { success: false, error };
    }
    
    // If feedback provided, add review record
    if (review.feedback) {
      const { data: { user } } = await supabase.auth.getUser();
      const reviewerId = user?.id || 'system';
      
      const { error: reviewError } = await supabase
        .from('article_reviews')
        .insert({
          article_id: articleId,
          reviewer_id: reviewerId,
          feedback: review.feedback,
          status: review.status
        });
      
      if (reviewError) {
        logger.error(LogSource.ARTICLE, 'Error saving review feedback', reviewError);
      }
    }
    
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception reviewing article', e);
    return { success: false, error: e };
  }
};

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
