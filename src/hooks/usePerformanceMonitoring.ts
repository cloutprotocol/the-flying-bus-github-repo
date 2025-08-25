/**
 * Performance Monitoring Hook
 * 
 * Provides easy integration of performance monitoring in React components
 */

import { useCallback, useEffect, useRef } from 'react';
import { performanceMonitoringService } from '../services/performanceMonitoringService';

interface UsePerformanceMonitoringOptions {
  component: string;
  enableMemoryMonitoring?: boolean;
  enableAutoCleanup?: boolean;
}

interface PerformanceTimers {
  startFormSubmission: (formName: string, metadata?: Record<string, any>) => string;
  endFormSubmission: (id: string, status?: 'completed' | 'failed', metadata?: Record<string, any>) => number | null;
  startDataLoading: (operation: string, metadata?: Record<string, any>) => string;
  endDataLoading: (id: string, status?: 'completed' | 'failed', metadata?: Record<string, any>) => number | null;
  startAuthSync: (operation: string, metadata?: Record<string, any>) => string;
  endAuthSync: (id: string, status?: 'completed' | 'failed', metadata?: Record<string, any>) => number | null;
  recordMemoryUsage: (operation?: string) => void;
}

export function usePerformanceMonitoring(options: UsePerformanceMonitoringOptions): PerformanceTimers {
  const { component, enableMemoryMonitoring = false, enableAutoCleanup = true } = options;
  const activeTimersRef = useRef<Set<string>>(new Set());

  // Record memory usage on mount if enabled
  useEffect(() => {
    if (enableMemoryMonitoring) {
      performanceMonitoringService.recordMemoryUsage(component, 'component-mount');
    }
  }, [component, enableMemoryMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (enableAutoCleanup) {
        // End any active timers
        activeTimersRef.current.forEach(timerId => {
          performanceMonitoringService.endTiming(timerId, 'failed', { reason: 'component-unmount' });
        });
        activeTimersRef.current.clear();
      }

      if (enableMemoryMonitoring) {
        performanceMonitoringService.recordMemoryUsage(component, 'component-unmount');
      }
    };
  }, [component, enableAutoCleanup, enableMemoryMonitoring]);

  const startFormSubmission = useCallback((formName: string, metadata?: Record<string, any>) => {
    const timerId = performanceMonitoringService.startTiming(
      `form-submission-${formName}`,
      component,
      { formName, ...metadata }
    );
    activeTimersRef.current.add(timerId);
    return timerId;
  }, [component]);

  const endFormSubmission = useCallback((id: string, status: 'completed' | 'failed' = 'completed', metadata?: Record<string, any>) => {
    activeTimersRef.current.delete(id);
    return performanceMonitoringService.endTiming(id, status, metadata);
  }, []);

  const startDataLoading = useCallback((operation: string, metadata?: Record<string, any>) => {
    const timerId = performanceMonitoringService.startTiming(
      `data-loading-${operation}`,
      component,
      { operation, ...metadata }
    );
    activeTimersRef.current.add(timerId);
    return timerId;
  }, [component]);

  const endDataLoading = useCallback((id: string, status: 'completed' | 'failed' = 'completed', metadata?: Record<string, any>) => {
    activeTimersRef.current.delete(id);
    return performanceMonitoringService.endTiming(id, status, metadata);
  }, []);

  const startAuthSync = useCallback((operation: string, metadata?: Record<string, any>) => {
    const timerId = performanceMonitoringService.startTiming(
      `auth-sync-${operation}`,
      component,
      { operation, ...metadata }
    );
    activeTimersRef.current.add(timerId);
    return timerId;
  }, [component]);

  const endAuthSync = useCallback((id: string, status: 'completed' | 'failed' = 'completed', metadata?: Record<string, any>) => {
    activeTimersRef.current.delete(id);
    return performanceMonitoringService.endTiming(id, status, metadata);
  }, []);

  const recordMemoryUsage = useCallback((operation?: string) => {
    performanceMonitoringService.recordMemoryUsage(component, operation);
  }, [component]);

  return {
    startFormSubmission,
    endFormSubmission,
    startDataLoading,
    endDataLoading,
    startAuthSync,
    endAuthSync,
    recordMemoryUsage
  };
}

/**
 * Hook for request deduplication
 */
export function useRequestDeduplication() {
  const executeWithDeduplication = useCallback(async <T>(
    requestKey: string,
    operation: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    return performanceMonitoringService.executeWithDeduplication(requestKey, operation, ttl);
  }, []);

  return { executeWithDeduplication };
}

/**
 * Hook for caching
 */
export function usePerformanceCache() {
  const setCache = useCallback(<T>(key: string, data: T, ttl?: number) => {
    performanceMonitoringService.setCache(key, data, ttl);
  }, []);

  const getCache = useCallback(<T>(key: string): T | null => {
    return performanceMonitoringService.getCache<T>(key);
  }, []);

  const executeWithCache = useCallback(async <T>(
    cacheKey: string,
    operation: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    return performanceMonitoringService.executeWithCache(cacheKey, operation, ttl);
  }, []);

  return {
    setCache,
    getCache,
    executeWithCache
  };
}

/**
 * Hook for performance metrics summary
 */
export function usePerformanceMetrics() {
  const getPerformanceSummary = useCallback(() => {
    return performanceMonitoringService.getPerformanceSummary();
  }, []);

  const clearPerformanceData = useCallback(() => {
    performanceMonitoringService.clearPerformanceData();
  }, []);

  return {
    getPerformanceSummary,
    clearPerformanceData
  };
}