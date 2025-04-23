
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';

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
