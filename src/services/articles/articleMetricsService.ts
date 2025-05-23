
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { withErrorHandling } from '@/utils/errorHandling';

/**
 * Get view count for an article
 */
export const getArticleViews = async (articleId: string) => {
  return await withErrorHandling(
    async () => {
      if (!articleId || articleId.trim() === '') {
        throw new Error('Invalid article ID');
      }
      
      const { count, error } = await supabase
        .from('article_views')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId);
      
      if (error) {
        throw error;
      }
      
      return { count: count || 0 };
    },
    {
      errorMessage: 'Failed to fetch article view count',
      logSource: LogSource.ARTICLE,
      showToast: false
    }
  );
};

/**
 * Check if article exists and is published
 */
export const checkArticlePublished = async (articleId: string): Promise<boolean> => {
  try {
    if (!articleId || articleId.trim() === '') {
      logger.warn(LogSource.ARTICLE, 'Invalid article ID when checking publication status');
      return false;
    }
    
    const { data, error } = await supabase
      .from('articles')
      .select('id, status')
      .eq('id', articleId)
      .maybeSingle();
    
    if (error) {
      logger.error(LogSource.ARTICLE, 'Error checking article publication status', { error, articleId });
      return false;
    }
    
    const isPublished = data?.status === 'published';
    logger.debug(LogSource.ARTICLE, `Article publication check: ${isPublished ? 'published' : 'not published'}`, { 
      articleId, 
      status: data?.status 
    });
    
    return isPublished;
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Error checking article status', e);
    return false;
  }
};

// Export trackArticleView from the utils file to maintain backward compatibility
export { trackArticleView, trackArticleViewWithRetry } from '@/utils/articles/trackArticleView';
