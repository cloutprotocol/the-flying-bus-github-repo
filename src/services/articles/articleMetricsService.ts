
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
      return false;
    }
    
    const { data, error } = await supabase
      .from('articles')
      .select('id')
      .eq('id', articleId)
      .eq('status', 'published')
      .maybeSingle();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Error checking article status', e);
    return false;
  }
};

// Export trackArticleView from the utils file to maintain backward compatibility
export { trackArticleView, trackArticleViewWithRetry } from '@/utils/articles/trackArticleView';
