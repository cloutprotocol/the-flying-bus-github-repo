
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getDashboardMetrics } from '@/services/dashboardService';
import { getArticlesByStatus } from '@/services/articleService';
import { getModerationMetrics } from '@/services/moderationService';
import { getPendingInvitationsCount } from '@/services/invitationService';
import { supabase } from '@/integrations/supabase/client';

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  
  // Separate fetch logic to avoid dependency issues
  const performFetch = async (page: number = 1, limit: number = 5) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    if (!isMountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simple, direct queries without complex service layers
      const [
        pendingArticlesResult,
        pendingCommentsResult,
        metricsResult,
        moderationResult,
        articlesResult,
        invitationsResult
      ] = await Promise.allSettled([
        supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'under_review']),
        supabase
          .from('flagged_content')
          .select('*', { count: 'exact', head: true })
          .eq('content_type', 'comment')
          .eq('status', 'pending'),
        getDashboardMetrics(),
        getModerationMetrics(),
        getArticlesByStatus('all', undefined, page, limit),
        getPendingInvitationsCount()
      ]);

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted || !isMountedRef.current) {
        return;
      }

      // Extract results with proper error handling
      const pendingArticlesCount = pendingArticlesResult.status === 'fulfilled' 
        ? pendingArticlesResult.value.count || 0 
        : 0;
      
      const pendingCommentsCount = pendingCommentsResult.status === 'fulfilled'
        ? pendingCommentsResult.value.count || 0
        : 0;

      const metricsData = metricsResult.status === 'fulfilled' 
        ? metricsResult.value.data 
        : null;
      
      const moderationStats = moderationResult.status === 'fulfilled'
        ? moderationResult.value.stats
        : null;

      const articlesData = articlesResult.status === 'fulfilled'
        ? articlesResult.value
        : { articles: [], count: 0, error: null };

      const invitationsCount = invitationsResult.status === 'fulfilled'
        ? invitationsResult.value.count || 0
        : 0;

      // Handle critical errors
      if (metricsResult.status === 'rejected' || !metricsData) {
        console.error('Error fetching dashboard metrics:', metricsResult.status === 'rejected' ? metricsResult.reason : 'No data');
        throw new Error('Failed to load dashboard metrics');
      }
      
      if (articlesResult.status === 'rejected' || articlesData.error) {
        console.error('Error fetching articles:', articlesResult.status === 'rejected' ? articlesResult.reason : articlesData.error);
        throw new Error('Failed to load articles');
      }
      
      // Calculate total pages
      const calculatedTotalPages = articlesData.count ? Math.ceil(articlesData.count / limit) : 1;
      
      if (!isMountedRef.current) return;
      
      setTotalPages(calculatedTotalPages);
      setMetrics({
        ...metricsData,
        recentArticles: (articlesData.articles || []).map(article => ({
          id: article.id,
          title: article.title,
          status: article.status,
          lastEdited: new Date(article.updated_at).toLocaleDateString()
        })),
        pendingArticles: pendingArticlesCount,
        pendingComments: pendingCommentsCount,
        flaggedContent: moderationStats?.flaggedContent || 0,
        pendingInvitations: invitationsCount
      });
      
    } catch (err) {
      // Don't set error if request was aborted or component unmounted
      if (abortControllerRef.current?.signal.aborted || !isMountedRef.current) {
        return;
      }
      
      console.error('Exception fetching dashboard metrics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(new Error(errorMessage));
      
      // Show toast only once per error
      toast({
        title: "Error",
        description: "Could not load dashboard data",
        variant: "destructive"
      });
      
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Create stable callback for external use
  const refetchMetrics = useCallback(async (page: number = 1, limit: number = 5) => {
    await performFetch(page, limit);
  }, [toast]);
  
  // Initial fetch on mount only
  useEffect(() => {
    performFetch();
  }, [toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return { 
    metrics, 
    loading, 
    error,
    totalPages,
    refetchMetrics
  };
};

export default useDashboardMetrics;
