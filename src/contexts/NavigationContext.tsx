
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useComponentLifecycle } from '@/utils/componentLifecycleManager';

interface LoadingState {
  componentId: string;
  operation: string;
  startTime: number;
  timeout?: NodeJS.Timeout;
}

interface AuthSyncProgress {
  isInProgress: boolean;
  stage: 'idle' | 'session-check' | 'profile-load' | 'complete' | 'error';
  startTime?: number;
  error?: string;
}

interface NavigationContextType {
  previousPath: string | null;
  navigationType: string;
  navigationCount: number;
  isTransitioning: boolean;
  // Enhanced state management
  loadingStates: Map<string, LoadingState>;
  authSyncProgress: AuthSyncProgress;
  isNavigationDebounced: boolean;
  // Methods for state management
  setComponentLoading: (componentId: string, operation: string, isLoading: boolean) => void;
  clearAllLoadingStates: () => void;
  setAuthSyncProgress: (progress: Partial<AuthSyncProgress>) => void;
  dispatchNavigationChange: (detail?: any) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  previousPath: null,
  navigationType: 'UNKNOWN',
  navigationCount: 0,
  isTransitioning: false,
  loadingStates: new Map(),
  authSyncProgress: { isInProgress: false, stage: 'idle' },
  isNavigationDebounced: false,
  setComponentLoading: () => {},
  clearAllLoadingStates: () => {},
  setAuthSyncProgress: () => {},
  dispatchNavigationChange: () => {}
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [navigationCount, setNavigationCount] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());
  const [authSyncProgress, setAuthSyncProgressState] = useState<AuthSyncProgress>({
    isInProgress: false,
    stage: 'idle'
  });
  const [isNavigationDebounced, setIsNavigationDebounced] = useState(false);
  
  const location = useLocation();
  const navigationType = useNavigationType();
  
  // Use component lifecycle manager for proper cleanup
  const { 
    addTimeout, 
    addEventListener, 
    safeSetState,
    dispatchNavigationChange: dispatchNavChange
  } = useComponentLifecycle('NavigationProvider', true);
  
  // Debounce timeout ref for rapid navigation handling
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationTimeRef = useRef<number>(0);
  
  // Constants for debouncing and timeouts
  const NAVIGATION_DEBOUNCE_DELAY = 150; // ms
  const TRANSITION_TIMEOUT = 300; // ms
  const LOADING_STATE_TIMEOUT = 10000; // 10 seconds max for loading states
  const AUTH_SYNC_TIMEOUT = 5000; // 5 seconds max for auth sync

  // Clear any lingering states on component mount
  useEffect(() => {
    safeSetState(setIsTransitioning, false);
    safeSetState(setIsNavigationDebounced, false);
    
    // Clear any stale loading states on mount
    const currentTime = Date.now();
    setLoadingStates(prevStates => {
      const newStates = new Map();
      prevStates.forEach((state, key) => {
        // Keep only recent loading states (within last 30 seconds)
        if (currentTime - state.startTime < 30000) {
          newStates.set(key, state);
        } else {
          logger.warn(LogSource.APP, 'Cleared stale loading state on mount', { 
            componentId: state.componentId, 
            operation: state.operation,
            age: currentTime - state.startTime 
          });
        }
      });
      return newStates;
    });
  }, [safeSetState]);

  // Enhanced method to set component loading states
  const setComponentLoading = useCallback((componentId: string, operation: string, isLoading: boolean) => {
    const stateKey = `${componentId}_${operation}`;
    
    setLoadingStates(prevStates => {
      const newStates = new Map(prevStates);
      
      if (isLoading) {
        // Clear any existing timeout for this state
        const existingState = newStates.get(stateKey);
        if (existingState?.timeout) {
          clearTimeout(existingState.timeout);
        }
        
        // Set timeout to automatically clear loading state
        const timeout = addTimeout(() => {
          logger.warn(LogSource.APP, 'Loading state timeout reached', {
            componentId,
            operation,
            duration: LOADING_STATE_TIMEOUT
          });
          
          setLoadingStates(states => {
            const updatedStates = new Map(states);
            updatedStates.delete(stateKey);
            return updatedStates;
          });
        }, LOADING_STATE_TIMEOUT);
        
        newStates.set(stateKey, {
          componentId,
          operation,
          startTime: Date.now(),
          timeout
        });
        
        logger.info(LogSource.APP, 'Component loading state set', {
          componentId,
          operation,
          totalLoadingStates: newStates.size
        });
      } else {
        // Clear loading state
        const existingState = newStates.get(stateKey);
        if (existingState) {
          if (existingState.timeout) {
            clearTimeout(existingState.timeout);
          }
          newStates.delete(stateKey);
          
          const duration = Date.now() - existingState.startTime;
          logger.info(LogSource.APP, 'Component loading state cleared', {
            componentId,
            operation,
            duration,
            remainingLoadingStates: newStates.size
          });
        }
      }
      
      return newStates;
    });
  }, [addTimeout]);

  // Method to clear all loading states
  const clearAllLoadingStates = useCallback(() => {
    setLoadingStates(prevStates => {
      // Clear all timeouts
      prevStates.forEach(state => {
        if (state.timeout) {
          clearTimeout(state.timeout);
        }
      });
      
      logger.info(LogSource.APP, 'All loading states cleared', {
        clearedCount: prevStates.size
      });
      
      return new Map();
    });
  }, []);

  // Enhanced method to set auth sync progress
  const setAuthSyncProgress = useCallback((progress: Partial<AuthSyncProgress>) => {
    setAuthSyncProgressState(prevProgress => {
      const newProgress = { ...prevProgress, ...progress };
      
      // Set timeout for auth sync if it's starting
      if (progress.isInProgress && !prevProgress.isInProgress) {
        newProgress.startTime = Date.now();
        
        addTimeout(() => {
          logger.warn(LogSource.APP, 'Auth sync timeout reached', {
            stage: newProgress.stage,
            duration: AUTH_SYNC_TIMEOUT
          });
          
          setAuthSyncProgressState(current => ({
            ...current,
            isInProgress: false,
            stage: 'error',
            error: 'Auth sync timeout'
          }));
        }, AUTH_SYNC_TIMEOUT);
      }
      
      logger.info(LogSource.APP, 'Auth sync progress updated', {
        stage: newProgress.stage,
        isInProgress: newProgress.isInProgress,
        duration: newProgress.startTime ? Date.now() - newProgress.startTime : 0
      });
      
      return newProgress;
    });
  }, [addTimeout]);

  // Enhanced navigation change dispatcher with detailed context
  const dispatchNavigationChange = useCallback((detail?: any) => {
    const navigationDetail = {
      from: previousPath,
      to: location.pathname,
      navigationType,
      key: location.key,
      timestamp: Date.now(),
      loadingStatesCount: loadingStates.size,
      authSyncInProgress: authSyncProgress.isInProgress,
      ...detail
    };
    
    logger.info(LogSource.APP, 'Dispatching navigation change event', navigationDetail);
    dispatchNavChange(navigationDetail);
  }, [previousPath, location.pathname, location.key, navigationType, loadingStates.size, authSyncProgress.isInProgress, dispatchNavChange]);

  // Debounced navigation handler for rapid page changes
  const handleNavigationChange = useCallback(() => {
    const currentTime = Date.now();
    const timeSinceLastNavigation = currentTime - lastNavigationTimeRef.current;
    
    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // If navigation is happening too rapidly, debounce it
    if (timeSinceLastNavigation < NAVIGATION_DEBOUNCE_DELAY) {
      safeSetState(setIsNavigationDebounced, true);
      
      debounceTimeoutRef.current = addTimeout(() => {
        safeSetState(setIsNavigationDebounced, false);
        processNavigation();
      }, NAVIGATION_DEBOUNCE_DELAY);
      
      logger.info(LogSource.APP, 'Navigation debounced', {
        timeSinceLastNavigation,
        debounceDelay: NAVIGATION_DEBOUNCE_DELAY
      });
    } else {
      processNavigation();
    }
    
    lastNavigationTimeRef.current = currentTime;
  }, [addTimeout, safeSetState]);

  // Process navigation with enhanced state management
  const processNavigation = useCallback(() => {
    if (location.pathname !== previousPath && previousPath !== null) {
      logger.info(LogSource.APP, 'Navigation occurred', {
        from: previousPath,
        to: location.pathname,
        navigationType,
        key: location.key,
        loadingStatesCount: loadingStates.size,
        authSyncInProgress: authSyncProgress.isInProgress
      });
      
      // Set transitioning state
      safeSetState(setIsTransitioning, true);
      
      // Clear all loading states on navigation to prevent conflicts
      clearAllLoadingStates();
      
      // Reset auth sync if it's in progress (new navigation should restart auth flow)
      if (authSyncProgress.isInProgress) {
        logger.info(LogSource.APP, 'Resetting auth sync due to navigation');
        setAuthSyncProgress({
          isInProgress: false,
          stage: 'idle'
        });
      }
      
      // Set timeout to clear transitioning state
      addTimeout(() => {
        safeSetState(setIsTransitioning, false);
      }, TRANSITION_TIMEOUT);
      
      // Dispatch navigation change event with enhanced context
      dispatchNavigationChange();
    }
    
    // Update previous path
    setPreviousPath(location.pathname);
  }, [
    location.pathname, 
    location.key, 
    navigationType, 
    previousPath, 
    loadingStates.size, 
    authSyncProgress.isInProgress,
    safeSetState,
    addTimeout,
    clearAllLoadingStates,
    setAuthSyncProgress,
    dispatchNavigationChange
  ]);

  // Main navigation effect with debouncing
  useEffect(() => {
    // Track navigation count
    setNavigationCount(count => count + 1);
    
    // Handle navigation change with debouncing
    handleNavigationChange();
  }, [location.pathname, location.key, navigationType, handleNavigationChange]);

  // Cleanup effect for loading states
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setLoadingStates(prevStates => {
        const newStates = new Map();
        let cleanedCount = 0;
        
        prevStates.forEach((state, key) => {
          const age = currentTime - state.startTime;
          // Clean up loading states older than 30 seconds
          if (age < 30000) {
            newStates.set(key, state);
          } else {
            if (state.timeout) {
              clearTimeout(state.timeout);
            }
            cleanedCount++;
          }
        });
        
        if (cleanedCount > 0) {
          logger.info(LogSource.APP, 'Cleaned up stale loading states', {
            cleanedCount,
            remainingCount: newStates.size
          });
        }
        
        return newStates;
      });
    }, 10000); // Clean up every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Memoized context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    previousPath,
    navigationType,
    navigationCount,
    isTransitioning,
    loadingStates,
    authSyncProgress,
    isNavigationDebounced,
    setComponentLoading,
    clearAllLoadingStates,
    setAuthSyncProgress,
    dispatchNavigationChange
  }), [
    previousPath,
    navigationType,
    navigationCount,
    isTransitioning,
    loadingStates,
    authSyncProgress,
    isNavigationDebounced,
    setComponentLoading,
    clearAllLoadingStates,
    setAuthSyncProgress,
    dispatchNavigationChange
  ]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationContext;

/**
 * Hook for managing component loading states through NavigationContext
 * Requirements: 3.1, 3.2 - Loading state management across components to prevent conflicts
 */
export const useNavigationLoading = (componentId: string) => {
  const { setComponentLoading, loadingStates } = useNavigation();
  
  const setLoading = useCallback((operation: string, isLoading: boolean) => {
    setComponentLoading(componentId, operation, isLoading);
  }, [componentId, setComponentLoading]);
  
  const isLoading = useCallback((operation?: string) => {
    if (operation) {
      return loadingStates.has(`${componentId}_${operation}`);
    }
    // Check if any operation for this component is loading
    for (const [key] of loadingStates) {
      if (key.startsWith(`${componentId}_`)) {
        return true;
      }
    }
    return false;
  }, [componentId, loadingStates]);
  
  const getLoadingOperations = useCallback(() => {
    const operations: string[] = [];
    for (const [key, state] of loadingStates) {
      if (state.componentId === componentId) {
        operations.push(state.operation);
      }
    }
    return operations;
  }, [componentId, loadingStates]);
  
  return {
    setLoading,
    isLoading,
    getLoadingOperations
  };
};

/**
 * Hook for managing authentication sync progress
 * Requirements: 4.1, 4.2, 4.3 - Authentication sync progress tracking to prevent navigation interference
 */
export const useAuthSyncProgress = () => {
  const { authSyncProgress, setAuthSyncProgress } = useNavigation();
  
  const startAuthSync = useCallback((stage: AuthSyncProgress['stage'] = 'session-check') => {
    setAuthSyncProgress({
      isInProgress: true,
      stage,
      startTime: Date.now(),
      error: undefined
    });
  }, [setAuthSyncProgress]);
  
  const updateAuthSyncStage = useCallback((stage: AuthSyncProgress['stage']) => {
    setAuthSyncProgress({ stage });
  }, [setAuthSyncProgress]);
  
  const completeAuthSync = useCallback((success: boolean = true, error?: string) => {
    setAuthSyncProgress({
      isInProgress: false,
      stage: success ? 'complete' : 'error',
      error
    });
  }, [setAuthSyncProgress]);
  
  const getAuthSyncDuration = useCallback(() => {
    if (authSyncProgress.startTime) {
      return Date.now() - authSyncProgress.startTime;
    }
    return 0;
  }, [authSyncProgress.startTime]);
  
  return {
    authSyncProgress,
    startAuthSync,
    updateAuthSyncStage,
    completeAuthSync,
    getAuthSyncDuration
  };
};

/**
 * Hook for listening to navigation change events with proper cleanup
 * Requirements: 3.3, 6.6 - Proper navigation-change event dispatching and cleanup
 */
export const useNavigationChangeListener = (
  callback: (detail: any) => void,
  dependencies: any[] = []
) => {
  const { addEventListener } = useComponentLifecycle('NavigationChangeListener');
  
  useEffect(() => {
    const handleNavigationChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };
    
    addEventListener('navigation-change', handleNavigationChange);
  }, [addEventListener, callback, ...dependencies]);
};

/**
 * Hook for debounced navigation handling
 * Requirements: 3.4, 3.5 - Debounced navigation handling for rapid page changes
 */
export const useNavigationDebounce = (callback: () => void, delay: number = 150) => {
  const { isNavigationDebounced } = useNavigation();
  const { addTimeout } = useComponentLifecycle('NavigationDebounce');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCallback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = addTimeout(() => {
      callback();
      timeoutRef.current = null;
    }, delay);
  }, [callback, delay, addTimeout]);
  
  return {
    debouncedCallback,
    isDebounced: isNavigationDebounced
  };
};

/**
 * Hook for navigation state cleanup
 * Requirements: 3.6, 6.5 - Proper cleanup of navigation-related event listeners and timeouts
 */
export const useNavigationCleanup = (componentId: string) => {
  const { clearAllLoadingStates, setComponentLoading } = useNavigation();
  
  const clearComponentLoadingStates = useCallback(() => {
    // Clear all loading states for this component
    setComponentLoading(componentId, '', false); // This will clear all operations for the component
  }, [componentId, setComponentLoading]);
  
  const clearAllStates = useCallback(() => {
    clearAllLoadingStates();
  }, [clearAllLoadingStates]);
  
  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      clearComponentLoadingStates();
    };
  }, [clearComponentLoadingStates]);
  
  return {
    clearComponentLoadingStates,
    clearAllStates
  };
};