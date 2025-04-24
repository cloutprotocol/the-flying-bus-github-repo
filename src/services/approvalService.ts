
import { supabase } from '@/integrations/supabase/client';
import logger, { LogSource } from '@/utils/logger';
import { StatusType } from '@/components/Admin/Status/StatusBadge';

export interface ArticleReviewItem {
  id: string;
  title: string;
  author: string;
  status: StatusType;
  submittedAt: Date;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Fetch articles for the approval queue
 */
export const getArticlesForApproval = async (
  status = 'pending',
  categoryFilter = 'all',
  searchTerm = '',
  page = 1,
  limit = 10
): Promise<{ articles: ArticleReviewItem[]; count: number; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching articles for approval', { status, categoryFilter, page });
    
    let query = supabase
      .from('articles')
      .select(`
        id, 
        title, 
        status,
        created_at,
        updated_at,
        categories(id, name),
        profiles!articles_author_id_fkey(id, display_name)
      `, { count: 'exact' });
    
    // Apply status filter if not 'all'
    if (status !== 'all') {
      if (status === 'pending') {
        // Include both 'draft' and 'pending_review' status for pending tab
        query = query.in('status', ['draft', 'pending_review']);
      } else {
        query = query.eq('status', status);
      }
    }
    
    // Apply category filter if not 'all'
    if (categoryFilter !== 'all') {
      query = query.eq('categories.name', categoryFilter);
    }
    
    // Apply search if provided
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,profiles!articles_author_id_fkey.display_name.ilike.%${searchTerm}%`);
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('updated_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error fetching articles for approval', { error });
      throw error;
    }
    
    // Assign a priority based on age of submission (could be more sophisticated in a real app)
    const assignPriority = (date: string): 'low' | 'medium' | 'high' => {
      const submissionDate = new Date(date);
      const now = new Date();
      const daysDifference = Math.floor((now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference >= 7) return 'high';
      if (daysDifference >= 3) return 'medium';
      return 'low';
    };
    
    // Transform the data for the UI
    const articles: ArticleReviewItem[] = data?.map(article => ({
      id: article.id,
      title: article.title,
      author: article.profiles?.display_name || 'Unknown',
      status: article.status as StatusType,
      submittedAt: new Date(article.updated_at),
      category: article.categories?.name || 'Uncategorized',
      priority: assignPriority(article.updated_at)
    })) || [];
    
    logger.info(LogSource.DATABASE, 'Articles for approval fetched successfully', { 
      count, 
      status,
      articlesFound: articles.length
    });
    
    return { articles, count: count || 0, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception fetching articles for approval', e);
    return { articles: [], count: 0, error: e };
  }
};
