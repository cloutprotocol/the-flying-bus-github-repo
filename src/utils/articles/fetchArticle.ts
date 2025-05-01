
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { calculateReadTime } from './articleRead';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const fetchArticleById = async (articleId: string): Promise<ArticleProps | null> => {
  if (!articleId) return null;
  
  try {
    logger.info(LogSource.ARTICLE, `Fetching article with ID ${articleId}`);
    
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id, 
        title, 
        excerpt, 
        content, 
        cover_image, 
        category_id,
        categories(id, name, slug, color),
        profiles(id, display_name, avatar_url),
        created_at,
        published_at,
        article_type
      `)
      .eq('id', articleId)
      .eq('status', 'published')
      .single();

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching article by ID:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      title: data.title,
      excerpt: data.excerpt || '',
      content: data.content,
      imageUrl: data.cover_image,
      category: data.categories?.name || '',
      categorySlug: data.categories?.slug || '',
      categoryColor: data.categories?.color || '',
      categoryId: data.category_id,
      readingLevel: 'Intermediate',
      readTime: calculateReadTime(data.content),
      author: data.profiles?.display_name || 'Unknown',
      authorAvatar: data.profiles?.avatar_url || '',
      date: new Date(data.published_at || data.created_at).toLocaleDateString(),
      publishDate: new Date(data.published_at || data.created_at).toLocaleDateString(),
      articleType: data.article_type
    };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception in fetchArticleById:', e);
    return null;
  }
};

export const fetchRelatedArticles = async (
  articleId: string, 
  categoryId: string, 
  limit: number = 3
): Promise<ArticleProps[]> => {
  if (!categoryId) return [];
  
  try {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id, 
        title, 
        excerpt, 
        cover_image, 
        category_id,
        categories(id, name, slug, color),
        profiles(id, display_name),
        created_at,
        published_at,
        content
      `)
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .neq('id', articleId)
      .limit(limit);

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching related articles:', error);
      return [];
    }

    return data.map(article => ({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt || '',
      imageUrl: article.cover_image,
      category: article.categories?.name || '',
      categorySlug: article.categories?.slug || '',
      categoryColor: article.categories?.color || '',
      readingLevel: 'Intermediate',
      readTime: calculateReadTime(article.content),
      author: article.profiles?.display_name || 'Unknown',
      date: new Date(article.published_at || article.created_at).toLocaleDateString(),
      publishDate: new Date(article.published_at || article.created_at).toLocaleDateString()
    }));
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception in fetchRelatedArticles:', e);
    return [];
  }
};
