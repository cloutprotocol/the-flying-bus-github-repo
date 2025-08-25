import { useState, useEffect, useCallback, useRef } from 'react';
import { queryExecutor, ExecutorOptions } from '@/services/queryExecutor';
import { dataLoadingManager, QueryResult } from '@/services/dataLoadingManager';
import { authStateBuffer } from '@/services/authStateBuffer';
import { logger } from '@/utils/logger';

export interface UseDataLoadingOptions extends ExecutorOptions {
  enabled?: boolean;
  refetchOnAuthChange?: boolean;
  staleTime?: number;
}

export interface DataLoadingState<T = any> {
  data: T[] | null;
  isLoading: boolean;
  error: any;
  executionMode: 'authenticated' | 'anonymous' | 'fallback';
  fromCache?: boolean;
  refetch: () => Promise<void>;
  isStale: boolean;
}

/**
 * Hook for data loading that's independent of auth state changes
 */
export function useDataLoadingIndependence<T = any>(
  options: UseDataLoadingOptions
): DataLoadingState<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [executionMode, setExecutionMode] = useState<'authenticated' | 'anonymous' | 'fallback'>('authenticated');
  const [fromCache, setFromCache] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  const optionsRef = useRef(options);
  const staleTime = options.staleTime || 5 * 60 * 1000; // 5 minutes default
  
  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Separate query execution logic to avoid circular dependencies
  const performQuery = async (currentOptions = optionsRef.current): Promise<void> => {
    if (!currentOptions.enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: QueryResult<T> = await queryExecutor.executeQuery<T>(currentOptions);
      
      setData(result.data);
      setExecutionMode(result.executionMode);
      setFromCache(result.fromCache || false);
      setLastFetchTime(Date.now());
      
      if (result.error) {
        setError(result.error);
        logger.warn('Query executed with error', { error: result.error, options: currentOptions });
      }
    } catch (err) {
      setError(err);
      setData(null);
      logger.error('Query execution failed', { error: err, options: currentOptions });
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuery = useCallback(async (): Promise<void> => {
    await performQuery();
  }, []);

  const refetch = useCallback(async (): Promise<void> => {
    await performQuery();
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (options.enabled !== false) {
      performQuery();
    }
  }, [options.enabled]);

  // Handle auth state changes if enabled
  useEffect(() => {
    if (!options.refetchOnAuthChange) return;

    const handleAuthChange = () => {
      // Only refetch if data is stale or we don't have data
      const isStale = Date.now() - lastFetchTime > staleTime;
      if (isStale || !data) {
        performQuery();
      }
    };

    // Listen for auth state buffer changes
    const bufferState = authStateBuffer.getBufferState();
    if (!bufferState.isBuffering) {
      handleAuthChange();
    }

    // Disabled periodic auth state checking to prevent infinite loops
    // const interval = setInterval(() => {
    //   const currentBufferState = authStateBuffer.getBufferState();
    //   if (!currentBufferState.isBuffering && bufferState.isBuffering) {
    //     handleAuthChange();
    //   }
    // }, 1000);

    // return () => clearInterval(interval);
  }, [options.refetchOnAuthChange, lastFetchTime, staleTime, data]);

  const isStale = Date.now() - lastFetchTime > staleTime;

  return {
    data,
    isLoading,
    error,
    executionMode,
    fromCache,
    refetch,
    isStale
  };
}

/**
 * Hook specifically for articles with optimized defaults
 */
export function useArticlesIndependent(filters?: Record<string, any>) {
  return useDataLoadingIndependence({
    table: 'articles',
    select: `
      *,
      categories (
        id,
        name,
        slug,
        color
      ),
      profiles (
        id,
        username,
        full_name
      )
    `,
    filters: {
      status: 'published',
      ...filters
    },
    orderBy: { column: 'created_at', ascending: false },
    limit: 20,
    priority: 'high',
    enabled: true,
    refetchOnAuthChange: false, // Articles don't need to refetch on auth change
    staleTime: 10 * 60 * 1000 // 10 minutes for articles
  });
}

/**
 * Hook specifically for categories with optimized defaults
 */
export function useCategoriesIndependent() {
  return useDataLoadingIndependence({
    table: 'categories',
    select: '*',
    orderBy: { column: 'name', ascending: true },
    priority: 'normal',
    enabled: true,
    refetchOnAuthChange: false, // Categories don't change with auth
    staleTime: 30 * 60 * 1000 // 30 minutes for categories
  });
}

/**
 * Hook specifically for featured articles
 */
export function useFeaturedArticlesIndependent() {
  return useDataLoadingIndependence({
    table: 'articles',
    select: `
      *,
      categories (
        id,
        name,
        slug,
        color
      ),
      profiles (
        id,
        username,
        full_name
      )
    `,
    filters: {
      status: 'published',
      featured: true
    },
    orderBy: { column: 'created_at', ascending: false },
    limit: 5,
    priority: 'high',
    enabled: true,
    refetchOnAuthChange: false,
    staleTime: 15 * 60 * 1000 // 15 minutes for featured articles
  });
}

/**
 * Hook for user-specific data that requires auth
 */
export function useUserDataIndependent(userId?: string) {
  return useDataLoadingIndependence({
    table: 'profiles',
    select: '*',
    filters: userId ? { id: userId } : undefined,
    requireAuth: true,
    priority: 'normal',
    enabled: !!userId,
    refetchOnAuthChange: true, // User data should refetch on auth change
    staleTime: 5 * 60 * 1000 // 5 minutes for user data
  });
}