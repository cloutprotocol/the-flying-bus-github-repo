
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';

export const getArticleById = async (articleId: string) => {
  try {
    logger.info(LogSource.ARTICLE, `Fetching article with ID ${articleId}`);
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();
    
    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching article by ID', error);
      return { article: null, error };
    }
    
    if (!data) {
      logger.error(LogSource.ARTICLE, 'Article not found');
      return { article: null, error: new Error('Article not found') };
    }
    
    return { article: data, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception fetching article by ID', e);
    return { article: null, error: e };
  }
};

export const getArticlesByStatus = async (
  status: StatusType | 'all',
  categoryId?: string,
  page: number = 1,
  limit: number = 10
) => {
  try {
    logger.info(LogSource.ARTICLE, `Fetching articles with status ${status}`);
    
    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' });
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    
    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(start, end);
    
    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching articles by status', error);
      return { articles: [], error, count: 0 };
    }
    
    return { articles: data, error: null, count: count || 0 };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception fetching articles by status', e);
    return { articles: [], error: e, count: 0 };
  }
};
