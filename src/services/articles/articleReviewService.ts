
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';

export const submitArticleForReview = async (
  articleId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    if (!articleId) {
      logger.error(LogSource.ARTICLE, 'Cannot submit article: Missing article ID');
      return { success: false, error: new Error('Missing article ID') };
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
): Promise<{ success: boolean; error: any }> => {
  try {
    if (!articleId) {
      logger.error(LogSource.ARTICLE, 'Cannot update article status: Missing article ID');
      return { success: false, error: new Error('Missing article ID') };
    }

    logger.info(LogSource.ARTICLE, `Updating article ${articleId} status to ${newStatus}`);
    
    // Log the request we're about to make
    logger.info(LogSource.ARTICLE, `Sending update request to Supabase`, {
      articleId,
      newStatus,
      table: 'articles'
    });
    
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
    
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception updating article status', e);
    return { success: false, error: e };
  }
};
