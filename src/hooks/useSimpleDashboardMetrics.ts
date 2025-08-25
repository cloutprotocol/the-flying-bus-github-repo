import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useDashboardLoadingState } from '@/hooks/useSimpleLoadingState';
import { useAdminMetricsErrorHandling } from '@/hooks/useAdminErrorHandling';

export interface SimpleDashboardMetrics {
  totalArticles: number;
  articleViews: number;
  commentCount: number;
  pendingArticles: number;
  pendingComments: number;
  pendingInvitations: number;
  recentArticles: {
    id: string;
    title: string;
    status: string;
    lastEdited: string;
  }[];
}

interface UseSimpleDashboardMetricsReturn {
  metrics: SimpleDashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  shouldShowSkeleton: boolean;
  canRetry: boolean;
  retryCount: number;
  hasError: boolean;
  isRetrying: boolean;
  errorState: any;
  manualRefresh: () => void;
}

export const useSimpleDashboardMetrics = (): UseSimpleDashboardMetricsReturn => {
  const [metrics, setMetrics] = useState<SimpleDashboardMetrics | null>(null);
  const { state: loadingState, execute } = useDashboardLoadingState('dashboard-metrics');
  const errorHandling = useAdminMetricsErrorHandling();

  const fetchMetrics = async (): Promise<SimpleDashboardMetrics> => {
    logger.info(LogSource.DASHBOARD, 'Fetching dashboard metrics');

    // Simple parallel queries without complex abstractions
    const [
      articlesResult,
      commentsResult,
      pendingArticlesResult,
      pendingCommentsResult,
      pendingInvitationsResult,
      recentArticlesResult
    ] = await Promise.all([
      // Total articles count
      supabase
        .from('articles')
        .select('*', { count: 'exact', head: true }),
      
      // Comments count
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true }),
      
      // Pending articles
      supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'under_review']),
      
      // Pending comments (flagged content)
      supabase
        .from('flagged_content')
        .select('*', { count: 'exact', head: true })
        .eq('content_type', 'comment')
        .eq('status', 'pending'),
      
      // Pending invitations
      supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      // Recent articles (last 5)
      supabase
        .from('articles')
        .select('id, title, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5)
    ]);

    // Check for errors in any of the queries
    const errors = [
      articlesResult.error,
      commentsResult.error,
      pendingArticlesResult.error,
      pendingCommentsResult.error,
      pendingInvitationsResult.error,
      recentArticlesResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
      logger.error(LogSource.DASHBOARD, 'Error fetching dashboard metrics', errors[0]);
      throw new Error(`Failed to load dashboard metrics: ${errors[0]?.message || 'Unknown error'}`);
    }

    // Build metrics object
    const dashboardMetrics: SimpleDashboardMetrics = {
      totalArticles: articlesResult.count || 0,
      articleViews: 0, // Simplified - remove view count for now
      commentCount: commentsResult.count || 0,
      pendingArticles: pendingArticlesResult.count || 0,
      pendingComments: pendingCommentsResult.count || 0,
      pendingInvitations: pendingInvitationsResult.count || 0,
      recentArticles: (recentArticlesResult.data || []).map(article => ({
        id: article.id,
        title: article.title,
        status: article.status,
        lastEdited: new Date(article.updated_at).toLocaleDateString()
      }))
    };

    logger.info(LogSource.DASHBOARD, 'Dashboard metrics fetched successfully', {
      totalArticles: dashboardMetrics.totalArticles,
      pendingItems: dashboardMetrics.pendingArticles + dashboardMetrics.pendingComments + dashboardMetrics.pendingInvitations
    });

    return dashboardMetrics;
  };

  // Fetch metrics on mount only
  useEffect(() => {
    const loadMetrics = async () => {
      const result = await errorHandling.executeWithErrorHandling(
        async () => {
          const data = await execute(fetchMetrics);
          return data;
        },
        {
          operation: 'load_metrics',
          component: 'dashboard-metrics',
          userAction: 'page_load'
        }
      );
      
      if (result) {
        setMetrics(result);
      }
    };

    loadMetrics();
  }, []); // Empty dependency array - no circular dependencies

  const refresh = async () => {
    const result = await errorHandling.executeWithErrorHandling(
      async () => {
        const data = await execute(fetchMetrics);
        return data;
      },
      {
        operation: 'load_metrics',
        component: 'dashboard-metrics',
        userAction: 'manual_refresh'
      }
    );
    
    if (result) {
      setMetrics(result);
    }
  };

  const manualRefresh = async () => {
    if (errorHandling.canRetry) {
      try {
        const result = await errorHandling.retryOperation(async () => {
          const data = await execute(fetchMetrics);
          return data;
        });
        setMetrics(result);
      } catch (error) {
        // Error is handled by the error handling system
      }
    } else {
      await refresh();
    }
  };
  
  return {
    metrics,
    loading: loadingState.isLoading,
    error: loadingState.error,
    refresh,
    shouldShowSkeleton: loadingState.shouldShowSkeleton,
    canRetry: errorHandling.canRetry,
    retryCount: errorHandling.errorState?.retryCount || 0,
    hasError: errorHandling.hasError,
    isRetrying: errorHandling.isRetrying,
    errorState: errorHandling.errorState,
    manualRefresh
  };
};

export default useSimpleDashboardMetrics;