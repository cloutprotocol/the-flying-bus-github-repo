import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { calculateReadTime } from './articleRead';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

export const fetchArticleById = async (articleId: string): Promise<ArticleProps | null> => {
  if (!articleId) {
    logger.error(LogSource.ARTICLE, 'No article ID provided');
    return null;
  }
  
  try {
    logger.info(LogSource.ARTICLE, `Fetching article with ID: ${articleId}`);
    
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id, 
        title, 
        excerpt, 
        content, 
        cover_image, 
        category_id,
        categories (
          id,
          name,
          slug,
          color
        ),
        profiles (
          id,
          display_name
        ),
        created_at,
        published_at,
        article_type
      `)
      .eq('id', articleId)
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error fetching article by ID:', error);
      return null;
    }

    if (!data) {
      logger.warn(LogSource.ARTICLE, `No article found with ID: ${articleId}`);
      return null;
    }

    logger.info(LogSource.ARTICLE, 'Article fetched successfully', { 
      id: data.id, 
      title: data.title 
    });

    return {
      id: data.id,
      title: data.title,
      excerpt: data.excerpt || '',
      content: data.content,
      imageUrl: data.cover_image,
      category: data.categories?.name || '',
      categorySlug: data.categories?.slug || '',
      categoryColor: data.categories?.color || '',
      readingLevel: 'Intermediate',
      readTime: calculateReadTime(data.content),
      author: data.profiles?.display_name || 'Unknown',
      date: new Date(data.published_at || data.created_at).toLocaleDateString(),
      publishDate: new Date(data.published_at || data.created_at).toLocaleDateString(),
      articleType: data.article_type
    };
  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception fetching article:', error);
    return null;
  }
};

export const fetchRelatedArticles = async (
  articleId: string, 
  categoryId: string, 
  limit: number = 3
): Promise<ArticleProps[]> => {
  if (!categoryId) return [];
  
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id, 
      title, 
      excerpt, 
      cover_image, 
      categories(id, name, slug),
      profiles(id, display_name),
      created_at,
      published_at
    `)
    .eq('category_id', categoryId)
    .eq('status', 'published')
    .neq('id', articleId)
    .limit(limit);

  if (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }

  return data.map(article => ({
    id: article.id,
    title: article.title,
    excerpt: article.excerpt || '',
    imageUrl: article.cover_image,
    category: article.categories?.name || '',
    readingLevel: 'Intermediate',
    readTime: 5,
    author: article.profiles?.display_name || 'Unknown',
    date: new Date(article.published_at || article.created_at).toLocaleDateString(),
    publishDate: new Date(article.published_at || article.created_at).toLocaleDateString()
  }));
};
