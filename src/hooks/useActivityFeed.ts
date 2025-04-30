
import { useState, useEffect, useCallback } from 'react';
import { getRecentActivities, Activity, ActivityType } from '@/services/activityService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useToast } from '@/components/ui/use-toast';

interface UseActivityFeedReturn {
  activities: Activity[];
  isLoading: boolean;
  error: Error | null;
  selectedTypes: string[];
  handleFilterChange: (types: string[]) => void;
  refreshActivities: () => Promise<void>;
}

export const useActivityFeed = (limit: number = 10): UseActivityFeedReturn => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info(LogSource.ACTIVITY, 'Fetching activity feed', { limit, selectedTypes });
      
      const { activities: fetchedActivities, error: fetchError } = await getRecentActivities(limit);
      
      if (fetchError) {
        logger.error(LogSource.ACTIVITY, 'Error fetching activities', fetchError);
        throw new Error(fetchError.message || 'Failed to load activity feed');
      }
      
      // Filter activities if types are selected
      let filteredActivities = fetchedActivities;
      if (selectedTypes.length > 0) {
        filteredActivities = fetchedActivities.filter(
          activity => selectedTypes.includes(activity.activity_type)
        );
      }
      
      setActivities(filteredActivities);
      logger.info(LogSource.ACTIVITY, 'Activities fetched successfully', {
        count: filteredActivities.length
      });
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      
      // Only show toast if error isn't going to be displayed in the UI
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      
    } finally {
      setIsLoading(false);
    }
  }, [limit, selectedTypes, toast]);
  
  const handleFilterChange = (types: string[]) => {
    setSelectedTypes(types);
  };

  // Fetch activities when component mounts or filters change
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);
  
  return {
    activities,
    isLoading,
    error,
    selectedTypes,
    handleFilterChange,
    refreshActivities: fetchActivities
  };
};

export default useActivityFeed;
