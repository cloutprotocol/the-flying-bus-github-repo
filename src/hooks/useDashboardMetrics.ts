
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getDashboardMetrics, DashboardMetrics } from '@/services/dashboardService';

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await getDashboardMetrics();
      
      if (error) {
        console.error('Error fetching dashboard metrics:', error);
        setError(new Error('Failed to load dashboard metrics'));
        toast({
          title: "Error",
          description: "Could not load dashboard data",
          variant: "destructive"
        });
      } else if (data) {
        setMetrics(data);
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
    
    // Set up a refresh interval
    const intervalId = setInterval(fetchMetrics, 5 * 60 * 1000); // Refresh every 5 minutes
    
    return () => clearInterval(intervalId);
  }, []);
  
  return { 
    metrics, 
    loading, 
    error,
    refetchMetrics: fetchMetrics 
  };
};

export default useDashboardMetrics;
