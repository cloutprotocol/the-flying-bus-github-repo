import { useState, useEffect } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
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
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const [allArticles, allComments, allInvites] = await Promise.all([
      convex.query(api.articles.getByStatus, { status: 'all' } as any),
      convex.query(api.comments.getAll as any, {} as any).catch(() => null),
      convex.query(api.invitations.getAllTokens, {} as any).catch(() => null),
    ]);

    const articles = (allArticles as any)?.articles || [];
    const comments = (allComments as any)?.comments || [];
    const tokens = (allInvites as any)?.tokens || [];

    const recent = [...articles]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map((a: any) => ({ id: a._id, title: a.title, status: a.status, lastEdited: new Date(a.updated_at).toLocaleDateString() }));

    const pendingArticles = articles.filter((a: any) => ['pending', 'under_review', 'pending_review'].includes(a.status)).length;
    const pendingInvitations = tokens.filter((t: any) => t.status === 'pending').length;

    const dashboardMetrics: SimpleDashboardMetrics = {
      totalArticles: articles.length,
      articleViews: 0,
      commentCount: comments.length,
      pendingArticles,
      pendingComments: 0,
      pendingInvitations,
      recentArticles: recent,
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
