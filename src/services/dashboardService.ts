
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface DashboardMetrics {
  totalArticles: number;
  articleViews: number;
  commentCount: number;
  engagementRate: number;
  recentArticles: RecentArticle[];
  recentActivity: ActivityItem[];
}

export interface RecentArticle {
  id: string;
  title: string;
  status: string;
  lastEdited: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  content: string;
  timestamp: string;
}

/**
 * Fetches dashboard metrics data from Supabase
 */
export const getDashboardMetrics = async (): Promise<{ data: DashboardMetrics | null; error: any }> => {
  try {
    logger.info(LogSource.DASHBOARD, 'Fetching dashboard metrics');
    
    // Get total articles count
    const { count: totalArticles, error: articlesError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });
    
    if (articlesError) {
      logger.error(LogSource.DASHBOARD, 'Error fetching article count', articlesError);
      return { data: null, error: articlesError };
    }
    
    // Get article views count
    const { count: viewsCount, error: viewsError } = await supabase
      .from('article_views')
      .select('*', { count: 'exact', head: true });
    
    if (viewsError) {
      logger.error(LogSource.DASHBOARD, 'Error fetching article views', viewsError);
      return { data: null, error: viewsError };
    }
    
    // Get comment count
    const { count: commentCount, error: commentsError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });
    
    if (commentsError) {
      logger.error(LogSource.DASHBOARD, 'Error fetching comment count', commentsError);
      return { data: null, error: commentsError };
    }
    
    // Get recent articles
    const { data: recentArticlesData, error: recentArticlesError } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        status,
        updated_at
      `)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (recentArticlesError) {
      logger.error(LogSource.DASHBOARD, 'Error fetching recent articles', recentArticlesError);
      return { data: null, error: recentArticlesError };
    }
    
    // Get recent activity (comments as a proxy for activity)
    const { data: recentActivityData, error: recentActivityError } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        article_id
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentActivityError) {
      logger.error(LogSource.DASHBOARD, 'Error fetching recent activity', recentActivityError);
      return { data: null, error: recentActivityError };
    }
    
    // Calculate engagement rate (comments per article)
    const engagementRate = totalArticles > 0 
      ? ((commentCount || 0) / totalArticles) * 100 
      : 0;
    
    // Format the data
    const recentArticles = recentArticlesData.map(article => ({
      id: article.id,
      title: article.title,
      status: article.status,
      lastEdited: new Date(article.updated_at).toLocaleDateString()
    }));
    
    const recentActivity = recentActivityData.map(comment => ({
      id: comment.id,
      type: 'comment',
      content: `New comment on article ${comment.article_id.substring(0, 8)}...`,
      timestamp: new Date(comment.created_at).toLocaleDateString()
    }));
    
    const dashboardData: DashboardMetrics = {
      totalArticles: totalArticles || 0,
      articleViews: viewsCount || 0,
      commentCount: commentCount || 0,
      engagementRate: Number(engagementRate.toFixed(1)),
      recentArticles,
      recentActivity
    };
    
    logger.info(LogSource.DASHBOARD, 'Dashboard metrics fetched successfully');
    return { data: dashboardData, error: null };
  } catch (e) {
    logger.error(LogSource.DASHBOARD, 'Exception fetching dashboard metrics', e);
    return { data: null, error: e };
  }
};

