
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const getArticleViews = async (articleId: string) => {
  try {
    const { count, error } = await supabase
      .from('article_views')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', articleId);
    
    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching article views', error);
      return { count: 0, error };
    }
    
    return { count: count || 0, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception fetching article views', e);
    return { count: 0, error: e };
  }
};

// Export trackArticleView from the utils file to maintain backward compatibility
export { trackArticleView, trackArticleViewWithRetry } from '@/utils/articles/trackArticleView';
