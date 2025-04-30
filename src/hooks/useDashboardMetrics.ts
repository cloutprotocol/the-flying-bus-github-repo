
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getDashboardMetrics } from '@/services/dashboardService';
import { getArticlesByStatus } from '@/services/articleService';
import { getModerationMetrics } from '@/services/moderationService';

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
}

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  
  const fetchMetrics = async (page: number = 1, limit: number = 5) => {
    setLoading(true);
    try {
      // Perform all queries in parallel for better performance
      const [metricsPromise, moderationPromise, articlesPromise] = await Promise.all([
        getDashboardMetrics(),
        getModerationMetrics(),
        getArticlesByStatus('all', undefined, page, limit)
      ]);
      
      const { data: metricsData, error: metricsError } = metricsPromise;
      const { stats: moderationStats, error: moderationError } = moderationPromise;
      const { articles, count, error: articlesError } = articlesPromise;
      
      // Handle errors
      if (metricsError) {
        console.error('Error fetching dashboard metrics:', metricsError);
        setError(new Error('Failed to load dashboard metrics'));
        toast({
          title: "Error",
          description: "Could not load dashboard data",
          variant: "destructive"
        });
        return;
      }
      
      if (articlesError) {
        console.error('Error fetching articles:', articlesError);
        setError(new Error('Failed to load articles'));
        return;
      }
      
      // Calculate total pages
      const calculatedTotalPages = count ? Math.ceil(count / limit) : 1;
      setTotalPages(calculatedTotalPages);
      
      if (metricsData && articles) {
        setMetrics({
          ...metricsData,
          recentArticles: articles.map(article => ({
            id: article.id,
            title: article.title,
            status: article.status,
            lastEdited: new Date(article.updated_at).toLocaleDateString()
          })),
          // Add moderation counts from moderation service or default to 0
          pendingArticles: moderationStats?.pendingCount || 0,
          pendingComments: moderationStats?.reportedCount || 0,
          flaggedContent: moderationStats?.flaggedContent || 0
        });
      }
    } catch (err) {
      console.error('Exception fetching dashboard metrics:', err);
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
