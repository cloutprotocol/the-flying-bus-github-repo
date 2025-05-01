
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { calculateReadTime } from '@/utils/articles/articleRead';

export const getArticleById = async (articleId: string): Promise<{ article: ArticleProps | null, error: any }> => {
  try {
    logger.info(LogSource.ARTICLE, `Fetching article with ID ${articleId}`);
    
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        profiles!articles_author_id_fkey(*),
        categories:category_id(*)
      `)
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
    
    // Transform the database response into the expected ArticleProps format
    const article: ArticleProps = {
      id: data.id,
      title: data.title,
      excerpt: data.excerpt || '',
      content: data.content,
      imageUrl: data.cover_image,
      category: data.categories?.name || 'Uncategorized',
      categorySlug: data.categories?.slug || '',
      categoryColor: data.categories?.color || 'red',
      categoryId: data.category_id,
      readingLevel: 'Intermediate', // Default value
      readTime: calculateReadTime(data.content),
      author: data.profiles?.display_name || 'Unknown Author',
      authorAvatar: data.profiles?.avatar_url || '',
      date: new Date(data.published_at || data.created_at).toLocaleDateString(),
      publishDate: data.published_at ? new Date(data.published_at).toLocaleDateString() : '',
      articleType: data.article_type || 'standard'
    };

    return { article, error: null };
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
