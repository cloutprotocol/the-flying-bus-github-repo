
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getDashboardMetrics } from '@/services/dashboardService';
import { getArticlesByStatus } from '@/services/articleService';
import { getModerationMetrics } from '@/services/moderationService';
import { getPendingInvitationsCount } from '@/services/invitationService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface DashboardMetrics {
  totalArticles: number;
  articleViews: number;
  commentCount: number;
  engagementRate: number;
  recentArticles: {
    id: string;
    title: string;
    status: string;
    lastEdited: string;
  }[];
  pendingArticles: number;
  pendingComments: number;
  flaggedContent: number;
  pendingInvitations: number;
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  
  const fetchMetrics = async (page: number = 1, limit: number = 5) => {
    setLoading(true);
    logger.debug(LogSource.DASHBOARD, 'Starting dashboard metrics fetch', { page, limit });
    
    try {
      // Get pending articles count directly from articles table
      const { count: pendingArticlesCount, error: pendingArticlesError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']);

      if (pendingArticlesError) {
        logger.error(LogSource.DASHBOARD, 'Error fetching pending articles count', {
          error: pendingArticlesError,
          errorMessage: pendingArticlesError.message
        });
      }

      // Get pending comments count from flagged content table
      const { count: pendingCommentsCount, error: pendingCommentsError } = await supabase
        .from('flagged_content')
        .select('*', { count: 'exact', head: true })
        .eq('content_type', 'comment')
        .eq('status', 'pending');

      if (pendingCommentsError) {
        logger.error(LogSource.DASHBOARD, 'Error fetching pending comments count', {
          error: pendingCommentsError,
          errorMessage: pendingCommentsError.message
        });
      }

      // Perform all other queries in parallel for better performance
      const [metricsPromise, moderationPromise, articlesPromise, invitationsPromise] = await Promise.all([
        getDashboardMetrics(),
        getModerationMetrics(),
        getArticlesByStatus('all', undefined, page, limit),
        getPendingInvitationsCount()
      ]);
      
      const { data: metricsData, error: metricsError } = metricsPromise;
      const { stats: moderationStats, error: moderationError } = moderationPromise;
      const { articles, count, error: articlesError } = articlesPromise;
      const { count: invitationsCount, error: invitationsError } = invitationsPromise;
      
      // Handle errors
      if (metricsError) {
        logger.error(LogSource.DASHBOARD, 'Error fetching dashboard metrics from service', {
          error: metricsError,
          errorMessage: metricsError.message
        });
        setError(new Error('Failed to load dashboard metrics'));
        toast({
          title: "Error",
          description: "Could not load dashboard data",
          variant: "destructive"
        });
        return;
      }
      
      if (articlesError) {
        logger.error(LogSource.DASHBOARD, 'Error fetching articles for dashboard', {
          error: articlesError,
          page,
          limit
        });
        setError(new Error('Failed to load articles'));
        return;
      }
      
      // Calculate total pages
      const calculatedTotalPages = count ? Math.ceil(count / limit) : 1;
      setTotalPages(calculatedTotalPages);
      
      if (metricsData && articles) {
        const dashboardMetrics = {
          ...metricsData,
          recentArticles: articles.map(article => ({
            id: article.id,
            title: article.title,
            status: article.status,
            lastEdited: new Date(article.updated_at).toLocaleDateString()
          })),
          // Use correct counts from direct queries
          pendingArticles: pendingArticlesCount || 0,
          pendingComments: pendingCommentsCount || 0,
          flaggedContent: moderationStats?.flaggedContent || 0,
          // Add invitation count with fallback to 0
          pendingInvitations: invitationsCount || 0
        };

        logger.info(LogSource.DASHBOARD, 'Dashboard metrics loaded successfully', {
          totalArticles: dashboardMetrics.totalArticles,
          pendingArticles: dashboardMetrics.pendingArticles,
          pendingComments: dashboardMetrics.pendingComments,
          recentArticlesCount: dashboardMetrics.recentArticles.length
        });

        setMetrics(dashboardMetrics);
      }
    } catch (err) {
      logger.error(LogSource.DASHBOARD, 'Exception during dashboard metrics fetch', {
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        page,
        limit
      });
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMetrics();
  }, []);
  
  return { 
    metrics, 
    loading, 
    error,
    totalPages,
    refetchMetrics: fetchMetrics 
  };
};

export default useDashboardMetrics;
