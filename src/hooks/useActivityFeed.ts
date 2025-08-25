
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Separate the actual fetch logic from the callback to avoid circular dependencies
  const performFetch = async (currentLimit: number, currentSelectedTypes: string[]) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info(LogSource.ACTIVITY, 'Fetching activity feed', { 
        limit: currentLimit, 
        selectedTypes: currentSelectedTypes 
      });
      
      const { activities: fetchedActivities, error: fetchError } = await getRecentActivities(currentLimit);
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      if (fetchError) {
        logger.error(LogSource.ACTIVITY, 'Error fetching activities', fetchError);
        throw new Error(fetchError.message || 'Failed to load activity feed');
      }
      
      // Filter activities if types are selected
      let filteredActivities = fetchedActivities;
      if (currentSelectedTypes.length > 0) {
        filteredActivities = fetchedActivities.filter(
          activity => currentSelectedTypes.includes(activity.activity_type)
        );
      }
      
      // Type assertion to ensure activities match the Activity interface
      setActivities(filteredActivities as Activity[]);
      logger.info(LogSource.ACTIVITY, 'Activities fetched successfully', {
        count: filteredActivities.length
      });
      
    } catch (err) {
      // Don't set error if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      
      // Only show toast if error isn't going to be displayed in the UI
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
      
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  // Create a stable callback that doesn't depend on state
  const refreshActivities = useCallback(async () => {
    await performFetch(limit, selectedTypes);
  }, [limit, selectedTypes, toast]);
  
  const handleFilterChange = useCallback((types: string[]) => {
    setSelectedTypes(types);
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    performFetch(limit, []);
  }, [limit, toast]);

  // Fetch when selected types change (but not on initial mount)
  useEffect(() => {
    if (selectedTypes.length > 0 || activities.length > 0) {
      performFetch(limit, selectedTypes);
    }
  }, [selectedTypes, limit, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    activities,
    isLoading,
    error,
    selectedTypes,
    handleFilterChange,
    refreshActivities
  };
};

export default useActivityFeed;
