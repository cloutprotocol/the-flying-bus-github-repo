
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { StatusType } from '@/components/Admin/Status/StatusBadge';

// We're not exporting DashboardMetrics from here anymore, it's defined in useDashboardMetrics.ts

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
export const getDashboardMetrics = async (): Promise<{ data: any; error: any }> => {
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
    
    // Get recent articles - we now handle this separately in useDashboardMetrics
    // to allow for pagination
    
    // Calculate engagement rate (comments per article)
    const engagementRate = totalArticles > 0 
      ? ((commentCount || 0) / totalArticles) * 100 
      : 0;
    
    const dashboardData = {
      totalArticles: totalArticles || 0,
      articleViews: viewsCount || 0,
      commentCount: commentCount || 0,
      engagementRate: Number(engagementRate.toFixed(1)),
      recentArticles: [], // This will be populated by useDashboardMetrics
      recentActivity: []  // This should come from activityService
    };
    
    logger.info(LogSource.DASHBOARD, 'Dashboard metrics fetched successfully');
    return { data: dashboardData, error: null };
  } catch (e) {
    logger.error(LogSource.DASHBOARD, 'Exception fetching dashboard metrics', e);
    return { data: null, error: e };
  }
};
