import { useState, useCallback, useRef, useEffect } from 'react';

interface ErrorRecoveryConfig {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

interface ErrorRecoveryState {
  retryCount: number;
  lastRetryTime: number;
  isRecovering: boolean;
}

export const useErrorRecovery = (config: ErrorRecoveryConfig = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true
  } = config;

  const [state, setState] = useState<ErrorRecoveryState>({
    retryCount: 0,
    lastRetryTime: 0,
    isRecovering: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canRetry = state.retryCount < maxRetries;

  const getRetryDelay = useCallback(() => {
    if (!exponentialBackoff) {
      return retryDelay;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return retryDelay * Math.pow(2, state.retryCount);
  }, [retryDelay, exponentialBackoff, state.retryCount]);

  const retry = useCallback(async (retryFn: () => Promise<void> | void) => {
    if (!canRetry || state.isRecovering) {
      return false;
    }

    const now = Date.now();
    const delay = getRetryDelay();

    // Prevent rapid successive retries
    if (now - state.lastRetryTime < delay) {
      return false;
    }

    setState(prev => ({
      ...prev,
      isRecovering: true,
      retryCount: prev.retryCount + 1,
      lastRetryTime: now
    }));

    try {
      // Add delay to prevent immediate retry loops
      await new Promise(resolve => {
        timeoutRef.current = setTimeout(resolve, Math.min(delay, 5000));
      });

      await retryFn();
      
      // Reset retry count on successful recovery
      setState(prev => ({
        ...prev,
        isRecovering: false,
        retryCount: 0
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isRecovering: false
      }));
      
      console.error('Retry failed:', error);
      return false;
    }
  }, [canRetry, state.isRecovering, state.lastRetryTime, getRetryDelay]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setState({
      retryCount: 0,
      lastRetryTime: 0,
      isRecovering: false
    });
  }, []);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    retry,
    reset,
    cleanup,
    canRetry,
    retryCount: state.retryCount,
    isRecovering: state.isRecovering,
    maxRetries
  };
};

export default useErrorRecovery;