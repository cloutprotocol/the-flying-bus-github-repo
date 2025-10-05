/**
 * Enhanced Loading Hook
 * 
 * Provides advanced loading state management with debouncing,
 * timeout handling, and skeleton loading states.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadingStateManager, LoadingStateOptions } from '@/utils/loadingStateManager';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface EnhancedLoadingOptions extends LoadingStateOptions {
  /** Enable automatic retry on timeout */
  autoRetry?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Log source for debugging */
  logSource?: LogSource;
  /** Operation name for logging */
  operationName?: string;
}

export interface EnhancedLoadingState {
  isLoading: boolean;
  isDebouncing: boolean;
  hasTimedOut: boolean;
  error: string | null;
  retryCount: number;
  canRetry: boolean;
  shouldShowSkeleton: boolean;
}

export interface EnhancedLoadingActions {
  execute: <T>(operation: (abortSignal?: AbortSignal) => Promise<T>) => Promise<T>;
  retry: () => Promise<void>;
  reset: () => void;
  cancel: () => void;
}

export const useEnhancedLoading = (
  options: EnhancedLoadingOptions = {}
): [EnhancedLoadingState, EnhancedLoadingActions] => {
  const {
    autoRetry = false,
    maxRetries = 3,
    retryDelay = 1000,
    logSource = LogSource.DASHBOARD,
    operationName = 'operation',
    ...loadingOptions
  } = options;

  const loadingManager = useLoadingStateManager(loadingOptions);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const lastOperationRef = useRef<((abortSignal?: AbortSignal) => Promise<any>) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure loadingManager is properly initialized
  if (!loadingManager) {
    throw new Error('Loading manager failed to initialize');
  }

  // Enhanced loading state
  const state: EnhancedLoadingState = {
    isLoading: loadingManager.shouldShowLoading(),
    isDebouncing: loadingManager.state.isDebouncing,
    hasTimedOut: loadingManager.hasTimedOut(),
    error,
    retryCount,
    canRetry: retryCount < maxRetries && !loadingManager.state.isLoading,
    shouldShowSkeleton: loadingManager.shouldShowLoading() || loadingManager.state.isDebouncing
  };

  // Execute operation with enhanced loading management
  const execute = useCallback(async <T>(
    operation: (abortSignal?: AbortSignal) => Promise<T>
  ): Promise<T> => {
    lastOperationRef.current = operation;
    
    try {
      logger.info(logSource, `Starting ${operationName}`, { retryCount });
      
      // Start loading with debouncing and timeout
      await loadingManager.startLoading();
      setError(null);

      // Execute the operation with abort signal
      const abortController = loadingManager.getAbortController();
      const result = await operation(abortController?.signal);

      // Stop loading
      await loadingManager.stopLoading();
      
      // Reset retry count on success
      setRetryCount(0);
      
      logger.info(logSource, `${operationName} completed successfully`);
      return result;

    } catch (err) {
      await loadingManager.stopLoading();
      
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      logger.error(logSource, `${operationName} failed`, {
        error: errorMessage,
        retryCount,
        hasTimedOut: loadingManager.hasTimedOut()
      });

      // Handle timeout with auto-retry
      if (loadingManager.hasTimedOut() && autoRetry && retryCount < maxRetries) {
        logger.info(logSource, `Auto-retrying ${operationName} after timeout`, {
          retryCount: retryCount + 1,
          maxRetries
        });
        
        setRetryCount(prev => prev + 1);
        
        // Schedule retry with delay
        retryTimeoutRef.current = setTimeout(async () => {
          try {
            await execute(operation);
          } catch (retryError) {
            // Error already handled by recursive call
          }
        }, retryDelay);
        
        throw err;
      }

      throw err;
    }
  }, [
    loadingManager,
    logSource,
    operationName,
    retryCount,
    autoRetry,
    maxRetries,
    retryDelay
  ]);

  // Manual retry function
  const retry = useCallback(async (): Promise<void> => {
    if (!lastOperationRef.current || !state.canRetry) {
      return;
    }

    setRetryCount(prev => prev + 1);
    
    try {
      await execute(lastOperationRef.current);
    } catch (error) {
      // Error already handled by execute function
    }
  }, [execute, state.canRetry]);

  // Reset all state
  const reset = useCallback(() => {
    loadingManager.reset();
    setError(null);
    setRetryCount(0);
    lastOperationRef.current = null;
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [loadingManager]);

  // Cancel current operation
  const cancel = useCallback(() => {
    loadingManager.reset();
    setError('Operation cancelled');
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [loadingManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const actions: EnhancedLoadingActions = {
    execute,
    retry,
    reset,
    cancel
  };

  return [state, actions];
};

/**
 * Simplified hook for basic enhanced loading without retry logic
 */
export const useSimpleEnhancedLoading = (options: LoadingStateOptions = {}) => {
  return useEnhancedLoading({
    ...options,
    autoRetry: false,
    maxRetries: 0
  });
};

/**
 * Hook specifically for dashboard operations with appropriate defaults
 */
export const useDashboardLoading = (operationName: string) => {
  return useEnhancedLoading({
    minLoadingTime: 300, // Prevent flashing
    timeout: 15000, // 15 second timeout for dashboard operations
    debounceTime: 500, // 500ms debounce
    autoRetry: true,
    maxRetries: 2,
    retryDelay: 1000,
    logSource: LogSource.DASHBOARD,
    operationName
  });
};