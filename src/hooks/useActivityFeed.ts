
import { useState, useEffect } from 'react';
import { Activity, getRecentActivities } from '@/services/activityService';
import { useToast } from '@/components/ui/use-toast';

export const useActivityFeed = (limit: number = 10) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { activities, error } = await getRecentActivities(limit);
      
      if (error) {
        throw error;
      }

      setActivities(activities);
      setError(null);
    } catch (e) {
      setError(e as Error);
      toast({
        title: "Error",
        description: "Failed to load activity feed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [limit]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
  };
};

export default useActivityFeed;
