
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

export const trackArticleView = async (articleId: string, userId?: string) => {
  try {
    const { error } = await supabase
      .from('article_views')
      .insert({
        article_id: articleId,
        user_id: userId || null
      });

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error tracking article view', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception tracking article view', e);
    return { success: false, error: e };
  }
};
