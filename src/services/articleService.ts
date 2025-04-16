
import { supabase } from '@/integrations/supabase/client';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { fetchArticleWithCache, clearArticleCache } from '@/utils/articleSync';
import logger, { LogSource } from '@/utils/loggerService';

/**
 * Create a new article in the database
 */
export const createArticle = async (articleData: Partial<ArticleProps>): Promise<{ data: any; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Creating new article', { title: articleData.title });
    
    const { data, error } = await supabase
      .from('articles')
      .insert({
        title: articleData.title,
        content: articleData.content || '',
        excerpt: articleData.excerpt,
        cover_image: articleData.imageUrl,
        category_id: articleData.categoryId,
        slug: createSlug(articleData.title || ''),
        status: 'draft',
        article_type: articleData.articleType || 'standard'
      })
      .select()
      .single();

    if (error) {
      logger.error(LogSource.DATABASE, 'Error creating article', { error, articleData });
    } else {
      logger.info(LogSource.DATABASE, 'Article created successfully', { articleId: data.id });
    }

    return { data, error };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception creating article', e);
    return { data: null, error: e };
  }
};

/**
 * Update an existing article
 */
export const updateArticle = async (articleId: string, articleData: Partial<ArticleProps>): Promise<{ data: any; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Updating article', { articleId, title: articleData.title });
    
    const { data, error } = await supabase
      .from('articles')
      .update({
        title: articleData.title,
        content: articleData.content,
        excerpt: articleData.excerpt,
        cover_image: articleData.imageUrl,
        category_id: articleData.categoryId,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId)
      .select()
      .single();

    // Clear the cache for this article
    if (!error) {
      clearArticleCache(articleId);
      logger.info(LogSource.DATABASE, 'Article updated successfully', { articleId });
    } else {
      logger.error(LogSource.DATABASE, 'Error updating article', { error, articleId });
    }

    return { data, error };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception updating article', { error: e, articleId });
    return { data: null, error: e };
  }
};

/**
 * Fetch an article by ID with enhanced error handling
 */
export const getArticleById = async (articleId: string): Promise<{ article: ArticleProps | null; error: Error | null }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching article by ID', { articleId });
    
    // Use the existing caching mechanism
    const article = await fetchArticleWithCache(articleId);
    
    if (!article) {
      logger.warn(LogSource.DATABASE, 'Article not found', { articleId });
      return { article: null, error: new Error('Article not found') };
    }
    
    logger.info(LogSource.DATABASE, 'Article fetched successfully', { articleId });
    return { article, error: null };
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Error in getArticleById', { error, articleId });
    return { 
      article: null, 
      error: error instanceof Error ? error : new Error('Unknown error occurred') 
    };
  }
};

/**
 * Change article status (draft, published, archived)
 */
export const updateArticleStatus = async (articleId: string, status: 'draft' | 'published' | 'archived'): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Updating article status', { articleId, status });
    
    const { error } = await supabase
      .from('articles')
      .update({ 
        status,
        // If publishing, set the published_at timestamp
        ...(status === 'published' && { published_at: new Date().toISOString() })
      })
      .eq('id', articleId);

    // Clear the cache when status changes
    if (!error) {
      clearArticleCache(articleId);
      logger.info(LogSource.DATABASE, 'Article status updated successfully', { articleId, status });
    } else {
      logger.error(LogSource.DATABASE, 'Error updating article status', { error, articleId, status });
    }

    return { success: !error, error };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception updating article status', { error: e, articleId });
    return { success: false, error: e };
  }
};

/**
 * Delete an article
 */
export const deleteArticle = async (articleId: string): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Deleting article', { articleId });
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);

    // Clear the article from cache
    if (!error) {
      clearArticleCache(articleId);
      logger.info(LogSource.DATABASE, 'Article deleted successfully', { articleId });
    } else {
      logger.error(LogSource.DATABASE, 'Error deleting article', { error, articleId });
    }

    return { success: !error, error };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception deleting article', { error: e, articleId });
    return { success: false, error: e };
  }
};

/**
 * Fetch articles for admin view (with status filter)
 */
export const getArticlesByStatus = async (
  status: 'draft' | 'published' | 'archived' | 'all',
  authorId?: string,
  page = 1,
  limit = 10
): Promise<{ articles: ArticleProps[]; count: number; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching articles by status', { status, authorId, page, limit });
    
    let query = supabase
      .from('articles')
      .select(`
        id, 
        title, 
        excerpt, 
        cover_image, 
        status,
        category_id,
        categories(id, name, slug, color),
        profiles(id, display_name),
        created_at,
        published_at,
        article_type
      `, { count: 'exact' });
    
    // Apply status filter if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Filter by author if provided
    if (authorId) {
      query = query.eq('author_id', authorId);
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error fetching articles by status', { error, status });
      throw error;
    }
    
    logger.info(LogSource.DATABASE, 'Articles fetched successfully', { 
      count, 
      status, 
      page 
    });
    
    const articles = data?.map(article => ({
      id: article.id,
      title: article.title,
      excerpt: article.excerpt || '',
      imageUrl: article.cover_image,
      category: article.categories?.name || '',
      categorySlug: article.categories?.slug || '',
      categoryColor: article.categories?.color || '',
      categoryId: article.category_id,
      readingLevel: 'Intermediate', // Default
      readTime: 5, // Default
      author: article.profiles?.display_name || 'Unknown',
      date: new Date(article.created_at).toLocaleDateString(),
      publishDate: article.published_at ? new Date(article.published_at).toLocaleDateString() : null,
      articleType: article.article_type,
      status: article.status
    })) || [];
    
    return { articles, count: count || 0, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception fetching articles by status', e);
    return { articles: [], count: 0, error: e };
  }
};

/**
 * Create a URL-friendly slug from a title
 */
const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .trim();
};

/**
 * Track article view
 */
export const trackArticleView = async (articleId: string): Promise<void> => {
  try {
    logger.info(LogSource.DATABASE, 'Tracking article view', { articleId });
    
    // Get current user if logged in
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    // Insert view record
    const { error } = await supabase
      .from('article_views')
      .insert({
        article_id: articleId,
        user_id: userId || null,
      });
      
    if (error) {
      logger.warn(LogSource.DATABASE, 'Error tracking article view', { error, articleId });
    }
  } catch (e) {
    // Don't fail the application if view tracking fails
    logger.error(LogSource.DATABASE, 'Exception tracking article view', { error: e, articleId });
  }
};

/**
 * Share article to social media
 */
export const trackArticleShare = async (
  articleId: string, 
  platform: string
): Promise<void> => {
  try {
    logger.info(LogSource.API, 'Tracking article share', { articleId, platform });
    
    // In the future, this could insert data into a 'article_shares' table
    // For now, we'll just log it
  } catch (e) {
    logger.error(LogSource.API, 'Error tracking article share', { error: e, articleId, platform });
  }
};
