/**
 * Simple Loading State Hook
 * 
 * A simplified version of enhanced loading that focuses on the core requirements:
 * - Debounced loading to prevent rapid successive API calls
 * - Proper loading indicators that don't flash continuously
 * - Timeout handling for API calls
 * - Skeleton loading states for better user experience
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface SimpleLoadingOptions {
  /** Minimum time to show loading state (prevents flashing) */
  minLoadingTime?: number;
  /** Maximum time before timing out */
  timeout?: number;
  /** Debounce time for rapid successive calls */
  debounceTime?: number;
  /** Log source for debugging */
  logSource?: LogSource;
  /** Operation name for logging */
  operationName?: string;
}

export interface SimpleLoadingState {
  isLoading: boolean;
  error: string | null;
  shouldShowSkeleton: boolean;
  hasTimedOut: boolean;
}

export const useSimpleLoadingState = (options: SimpleLoadingOptions = {}) => {
  const {
    minLoadingTime = 300,
    timeout = 30000,
    debounceTime = 500,
    logSource = LogSource.DASHBOARD,
    operationName = 'operation'
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingStartTimeRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minLoadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (minLoadingTimerRef.current) {
      clearTimeout(minLoadingTimerRef.current);
      minLoadingTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Execute operation with enhanced loading management
  const execute = useCallback(async <T>(
    operation: (abortSignal?: AbortSignal) => Promise<T>
  ): Promise<T> => {
    // Clear any existing timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (minLoadingTimerRef.current) {
      clearTimeout(minLoadingTimerRef.current);
      minLoadingTimerRef.current = null;
    }

    // If already loading, debounce the request
    if (isLoading) {
      logger.info(logSource, `Debouncing ${operationName} request`);
      
      return new Promise((resolve, reject) => {
        debounceTimerRef.current = setTimeout(async () => {
          try {
            const result = await execute(operation);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, debounceTime);
      });
    }

    try {
      logger.info(logSource, `Starting ${operationName}`);
      
      // Start loading
      setIsLoading(true);
      setError(null);
      setHasTimedOut(false);
      setShouldShowSkeleton(true);
      loadingStartTimeRef.current = Date.now();

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Set timeout
      timeoutTimerRef.current = setTimeout(() => {
        setHasTimedOut(true);
        abortControllerRef.current?.abort();
      }, timeout);

      // Execute operation
      const result = await operation(abortControllerRef.current.signal);

      // Calculate minimum loading time
      const elapsed = Date.now() - (loadingStartTimeRef.current || 0);
      const remainingMinTime = Math.max(0, minLoadingTime - elapsed);

      if (remainingMinTime > 0) {
        // Wait for minimum loading time
        await new Promise(resolve => {
          minLoadingTimerRef.current = setTimeout(resolve, remainingMinTime);
        });
      }

      // Success
      setIsLoading(false);
      setShouldShowSkeleton(false);
      
      logger.info(logSource, `${operationName} completed successfully`);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      
      // Check if it was a timeout
      if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
        setError('Request timed out');
        logger.error(logSource, `${operationName} timed out`);
      } else {
        setError(errorMessage);
        logger.error(logSource, `${operationName} failed`, err);
      }

      setIsLoading(false);
      setShouldShowSkeleton(false);
      
      throw err;
    }
  }, [
    isLoading,
    debounceTime,
    timeout,
    minLoadingTime,
    logSource,
    operationName
  ]);

  // Reset state
  const reset = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (minLoadingTimerRef.current) {
      clearTimeout(minLoadingTimerRef.current);
      minLoadingTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setIsLoading(false);
    setError(null);
    setShouldShowSkeleton(false);
    setHasTimedOut(false);
    loadingStartTimeRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const state: SimpleLoadingState = {
    isLoading,
    error,
    shouldShowSkeleton,
    hasTimedOut
  };

  return {
    state,
    execute,
    reset
  };
};

/**
 * Hook specifically for dashboard operations with appropriate defaults
 */
export const useDashboardLoadingState = (operationName: string) => {
  return useSimpleLoadingState({
    minLoadingTime: 300, // Prevent flashing
    timeout: 15000, // 15 second timeout for dashboard operations
    debounceTime: 500, // 500ms debounce
    logSource: LogSource.DASHBOARD,
    operationName
  });
};