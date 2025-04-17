
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getDashboardMetrics, DashboardMetrics } from '@/services/dashboardService';
import { getArticlesByStatus } from '@/services/articleService';

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  const fetchMetrics = async (page: number = 1, limit: number = 5) => {
    setLoading(true);
    try {
      // Fetch general metrics
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
          }))
        });
      }
    } catch (err) {
      console.error('Exception fetching dashboard metrics:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
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
