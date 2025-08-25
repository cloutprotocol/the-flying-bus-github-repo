import { useState, useEffect } from 'react';
import { getRecentActivities, Activity } from '@/services/activityService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useDashboardLoadingState } from '@/hooks/useSimpleLoadingState';
import { useAdminActivityErrorHandling } from '@/hooks/useAdminErrorHandling';

interface UseSimpleActivityFeedReturn {
  activities: Activity[];
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

export const useSimpleActivityFeed = (limit: number = 10): UseSimpleActivityFeedReturn => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const { state: loadingState, execute } = useDashboardLoadingState('activity-feed');
  const errorHandling = useAdminActivityErrorHandling();

  const fetchActivities = async (): Promise<Activity[]> => {
    logger.info(LogSource.ACTIVITY, 'Fetching activity feed', { limit });
    
    const { activities: fetchedActivities, error: fetchError } = await getRecentActivities(limit);
    
    if (fetchError) {
      logger.error(LogSource.ACTIVITY, 'Error fetching activities', fetchError);
      throw new Error(`Failed to load activity feed: ${fetchError.message || 'Unknown error'}`);
    }
    
    logger.info(LogSource.ACTIVITY, 'Activities fetched successfully', {
      count: fetchedActivities.length
    });

    return fetchedActivities as Activity[];
  };

  // Fetch activities on mount only
  useEffect(() => {
    const loadActivities = async () => {
      const result = await errorHandling.executeWithErrorHandling(
        async () => {
          const data = await execute(fetchActivities);
          return data;
        },
        {
          operation: 'load_activities',
          component: 'activity-feed',
          userAction: 'page_load'
        }
      );
      
      if (result) {
        setActivities(result);
      }
    };

    loadActivities();
  }, []); // Empty dependency array - no circular dependencies

  const refresh = async () => {
    const result = await errorHandling.executeWithErrorHandling(
      async () => {
        const data = await execute(fetchActivities);
        return data;
      },
      {
        operation: 'load_activities',
        component: 'activity-feed',
        userAction: 'manual_refresh'
      }
    );
    
    if (result) {
      setActivities(result);
    }
  };

  const manualRefresh = async () => {
    if (errorHandling.canRetry) {
      try {
        const result = await errorHandling.retryOperation(async () => {
          const data = await execute(fetchActivities);
          return data;
        });
        setActivities(result);
      } catch (error) {
        // Error is handled by the error handling system
      }
    } else {
      await refresh();
    }
  };
  
  return {
    activities,
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

export default useSimpleActivityFeed;