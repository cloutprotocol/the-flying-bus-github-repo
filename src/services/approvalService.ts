import logger, { LogSource } from '@/utils/logger';
import { StatusType } from '@/components/Admin/Status/StatusBadge';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

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
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    // Map legacy statuses: treat 'pending' and 'pending_review' as pending_review
    const statusFilter = status === 'all' ? undefined : (status === 'pending' ? 'pending_review' : status);
    const { articles, count }: any = await convex.query(api.articles.getByStatus, {
      status: statusFilter,
      page,
      limit,
    });

    // Optionally filter by category name and search on client for now
    const filtered = (articles ?? []).filter((a: any) => {
      const catOk = categoryFilter === 'all' ? true : (a.category?.name || '').toLowerCase() === categoryFilter.toLowerCase();
      const term = searchTerm.trim().toLowerCase();
      const searchOk = !term || a.title.toLowerCase().includes(term) || (a.author?.display_name || '').toLowerCase().includes(term);
      return catOk && searchOk;
    });

    // Assign a priority based on age of submission
    const assignPriority = (date: string): 'low' | 'medium' | 'high' => {
      const submissionDate = new Date(date);
      const now = new Date();
      const daysDifference = Math.floor((now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference >= 7) return 'high';
      if (daysDifference >= 3) return 'medium';
      return 'low';
    };
    // Transform the data for the UI
    const items: ArticleReviewItem[] = filtered.map((article: any) => ({
      id: article._id,
      title: article.title,
      author: article.author?.display_name || 'Unknown',
      status: article.status as StatusType,
      submittedAt: new Date(article.updated_at),
      category: article.category?.name || 'Uncategorized',
      priority: assignPriority(article.updated_at)
    }));
    
    logger.info(LogSource.DATABASE, 'Articles for approval fetched successfully', { 
      count: count ?? filtered.length, 
      status,
      articlesFound: items.length
    });
    
    return { articles: items, count: count ?? filtered.length, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception fetching articles for approval', e);
    return { articles: [], count: 0, error: e };
  }
};
