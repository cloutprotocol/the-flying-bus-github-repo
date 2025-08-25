
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { getArticlesByOwnership, ArticleWithOwnership } from './articleOwnershipService';

export interface UserArticle extends ArticleWithOwnership {
  article_type: string;
  excerpt: string | null;
  cover_image: string | null;
  category?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

export const getUserArticles = async (
  page: number = 1,
  limit: number = 10
): Promise<{ 
  articles: UserArticle[]; 
  count: number; 
  error: any;
}> => {
  try {
    logger.info(LogSource.ARTICLE, 'Fetching user articles with ownership controls', { page, limit });
    
    // Get current user session with error handling
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logger.error(LogSource.ARTICLE, 'Session error when fetching articles', sessionError);
      return { articles: [], count: 0, error: sessionError };
    }
    
    const userId = session?.user?.id;
    
    if (!userId) {
      const authError = new Error('User not authenticated');
      logger.error(LogSource.ARTICLE, 'No authenticated user found when fetching articles');
      return { articles: [], count: 0, error: authError };
    }
    
    console.log('Fetching articles for user:', userId.substring(0, 8));
    
    // Use the ownership service to get articles with permission flags
    const ownershipResult = await getArticlesByOwnership(userId, page, limit);
    
    if (ownershipResult.error) {
      logger.error(LogSource.ARTICLE, 'Error from ownership service', ownershipResult.error);
      return { articles: [], count: 0, error: new Error(ownershipResult.error) };
    }
    
    // Get additional article data (excerpt, cover_image, category, article_type)
    const articleIds = ownershipResult.articles.map(a => a.id);
    
    if (articleIds.length === 0) {
      logger.info(LogSource.ARTICLE, 'No articles found for user - this is not an error', { userId: userId.substring(0, 8) });
      return { articles: [], count: ownershipResult.count, error: null };
    }
    
    const { data: additionalData, error: additionalError } = await supabase
      .from('articles')
      .select(`
        id,
        article_type,
        excerpt,
        cover_image,
        categories (
          id,
          name,
          color
        )
      `)
      .in('id', articleIds);
    
    if (additionalError) {
      logger.error(LogSource.ARTICLE, 'Error fetching additional article data', additionalError);
      // Continue without additional data rather than failing completely
    }
    
    // Merge ownership data with additional data
    const articles: UserArticle[] = ownershipResult.articles.map(article => {
      const additional = additionalData?.find(a => a.id === article.id);
      return {
        ...article,
        article_type: additional?.article_type || 'standard',
        excerpt: additional?.excerpt || null,
        cover_image: additional?.cover_image || null,
        category: additional?.categories || null
      };
    });
    
    logger.info(LogSource.ARTICLE, 'User articles fetched successfully with ownership controls', { 
      count: ownershipResult.count,
      articlesCount: articles.length 
    });
    
    return { 
      articles, 
      count: ownershipResult.count, 
      error: null 
    };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception fetching user articles', e);
    console.error('getUserArticles exception:', e);
    return { articles: [], count: 0, error: e };
  }
};

export const deleteUserArticle = async (articleId: string): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.ARTICLE, 'Deleting article', { articleId });
    
    // Verify user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      const authError = new Error('User not authenticated');
      logger.error(LogSource.ARTICLE, 'Authentication error when deleting article', sessionError);
      return { success: false, error: authError };
    }
    
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId)
      .eq('author_id', session.user.id); // Ensure user can only delete their own articles
    
    if (error) {
      logger.error(LogSource.ARTICLE, 'Database error deleting article', error);
      return { success: false, error };
    }
    
    logger.info(LogSource.ARTICLE, 'Article deleted successfully', { articleId });
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.ARTICLE, 'Exception deleting article', e);
    console.error('deleteUserArticle exception:', e);
    return { success: false, error: e };
  }
};
