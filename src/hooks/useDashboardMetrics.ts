
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
  const { toast } = useToast();
  
  const fetchMetrics = async (page: number = 1, limit: number = 5) => {
    setLoading(true);
    try {
      // Fetch dashboard metrics
      const { data: metricsData, error: metricsError } = await getDashboardMetrics();
      
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
      
      // Fetch moderation metrics
      const { stats: moderationStats, error: moderationError } = await getModerationMetrics();
      
      if (moderationError) {
        console.error('Error fetching moderation metrics:', moderationError);
        // Continue with available data, don't block the dashboard
      }
      
      // Fetch paginated articles
      const { articles, count, error: articlesError } = await getArticlesByStatus('all', undefined, page, limit);
      
      if (articlesError) {
        console.error('Error fetching articles:', articlesError);
        setError(new Error('Failed to load articles'));
        return;
      }
      
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
    refetchMetrics: fetchMetrics 
  };
};

export default useDashboardMetrics;
