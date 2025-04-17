
import { useState, useEffect } from 'react';
import { Activity, getRecentActivities } from '@/services/activityService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useActivityFeed = (limit: number = 10) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { activities: fetchedActivities, error } = await getRecentActivities(limit);
      
      if (error) {
        throw error;
      }

      setActivities(fetchedActivities as Activity[]);
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

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities'
        },
        (payload) => {
          setActivities(current => [payload.new as Activity, ...current].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [limit]);

  const filteredActivities = selectedTypes.length > 0
    ? activities.filter(activity => selectedTypes.includes(activity.activity_type))
    : activities;

  return {
    activities: filteredActivities,
    loading,
    error,
    refetch: fetchActivities,
    selectedTypes,
    setSelectedTypes,
  };
};

export default useActivityFeed;
