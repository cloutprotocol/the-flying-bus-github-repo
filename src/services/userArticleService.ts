
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface UserArticle {
  id: string;
  title: string;
  status: string;
  article_type: string;
  created_at: string;
  updated_at: string;
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
    logger.info(LogSource.ARTICLE, 'Fetching user articles', { page, limit });
    
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
    
    // Calculate pagination offsets
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Fetch user articles with count
    const { data, error, count } = await supabase
      .from('articles')
      .select(`
        id, 
        title, 
        status,
        article_type, 
        created_at,
        updated_at,
        excerpt,
        cover_image,
        categories (
          id,
          name,
          color
        )
      `, { count: 'exact' })
      .eq('author_id', userId)
      .order('updated_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      logger.error(LogSource.ARTICLE, 'Database error fetching user articles', error);
      return { articles: [], count: 0, error };
    }
    
    logger.info(LogSource.ARTICLE, 'User articles fetched successfully', { 
      count: count || 0,
      articlesCount: data?.length || 0 
    });
    
    return { 
      articles: data as UserArticle[] || [], 
      count: count || 0, 
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
