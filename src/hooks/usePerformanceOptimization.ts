import { useCallback, useEffect, useState } from 'react';
import { performanceOptimizationService } from '../services/performanceOptimizationService';

interface PerformanceMetrics {
  dataLoadingTime: number;
  authStateChangeTime: number;
  queryExecutionTime: number;
  cacheHitRate: number;
  errorRate: number;
  totalQueries: number;
  cacheSize: number;
}

interface UsePerformanceOptimizationOptions {
  enableMonitoring?: boolean;
  reportingInterval?: number;
}

export const usePerformanceOptimization = (
  options: UsePerformanceOptimizationOptions = {}
) => {
  const { enableMonitoring = true, reportingInterval = 30000 } = options;
  
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Optimized query execution
  const optimizeQuery = useCallback(async <T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: { 
      ttl?: number; 
      skipCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> => {
    return performanceOptimizationService.optimizeQuery(queryKey, queryFn, options);
  }, []);

  // Optimized data loading
  const optimizeDataLoading = useCallback(async <T>(
    queries: Array<{
      key: string;
      fn: () => Promise<T>;
      priority?: 'high' | 'medium' | 'low';
    }>
  ): Promise<T[]> => {
    return performanceOptimizationService.optimizeDataLoading(queries);
  }, []);

  // Optimized auth state change
  const optimizeAuthStateChange = useCallback(async (
    authStateFn: () => Promise<void>
  ): Promise<void> => {
    return performanceOptimizationService.optimizeAuthStateChange(authStateFn);
  }, []);

  // Clear cache
  const clearCache = useCallback((pattern?: string) => {
    performanceOptimizationService.clearCache(pattern);
  }, []);

  // Get current metrics
  const getCurrentMetrics = useCallback(() => {
    return performanceOptimizationService.getMetrics();
  }, []);

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    return performanceOptimizationService.getPerformanceRecommendations();
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    performanceOptimizationService.resetMetrics();
    setMetrics(null);
    setRecommendations([]);
  }, []);

  // Performance monitoring - DISABLED to prevent infinite loops
  useEffect(() => {
    // Disabled to prevent infinite loops and rate limiting issues
    // if (!enableMonitoring) return;

    // const interval = setInterval(() => {
    //   const currentMetrics = getCurrentMetrics();
    //   const currentRecommendations = getRecommendations();
    //   
    //   setMetrics(currentMetrics);
    //   setRecommendations(currentRecommendations);
    // }, reportingInterval);

    // return () => clearInterval(interval);
  }, [enableMonitoring, reportingInterval, getCurrentMetrics, getRecommendations]);

  // Performance benchmark validation
  const validatePerformanceBenchmarks = useCallback(() => {
    const currentMetrics = getCurrentMetrics();
    const benchmarks = {
      dataLoadingTime: 2000, // 2 seconds
      authStateChangeTime: 500, // 500ms
      queryExecutionTime: 1000, // 1 second
      cacheHitRate: 0.5, // 50%
      errorRate: 0.05 // 5%
    };

    const violations: string[] = [];

    if (currentMetrics.dataLoadingTime > benchmarks.dataLoadingTime) {
      violations.push(`Data loading time exceeded: ${currentMetrics.dataLoadingTime}ms > ${benchmarks.dataLoadingTime}ms`);
    }

    if (currentMetrics.authStateChangeTime > benchmarks.authStateChangeTime) {
      violations.push(`Auth state change time exceeded: ${currentMetrics.authStateChangeTime}ms > ${benchmarks.authStateChangeTime}ms`);
    }

    if (currentMetrics.queryExecutionTime > benchmarks.queryExecutionTime) {
      violations.push(`Query execution time exceeded: ${currentMetrics.queryExecutionTime}ms > ${benchmarks.queryExecutionTime}ms`);
    }

    if (currentMetrics.cacheHitRate < benchmarks.cacheHitRate) {
      violations.push(`Cache hit rate below threshold: ${currentMetrics.cacheHitRate} < ${benchmarks.cacheHitRate}`);
    }

    if (currentMetrics.errorRate > benchmarks.errorRate) {
      violations.push(`Error rate above threshold: ${currentMetrics.errorRate} > ${benchmarks.errorRate}`);
    }

    return {
      passed: violations.length === 0,
      violations,
      metrics: currentMetrics,
      benchmarks
    };
  }, [getCurrentMetrics]);

  // Measure specific operation performance
  const measurePerformance = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      console.log(`Performance: ${operationName} completed in ${duration.toFixed(2)}ms`);
      
      return { result, duration };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`Performance: ${operationName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }, []);

  return {
    // Core optimization functions
    optimizeQuery,
    optimizeDataLoading,
    optimizeAuthStateChange,
    
    // Cache management
    clearCache,
    
    // Metrics and monitoring
    metrics,
    recommendations,
    getCurrentMetrics,
    getRecommendations,
    resetMetrics,
    
    // Performance validation
    validatePerformanceBenchmarks,
    measurePerformance,
    
    // Utility functions
    isPerformanceOptimal: metrics ? 
      metrics.errorRate < 0.05 && 
      metrics.cacheHitRate > 0.5 && 
      metrics.dataLoadingTime < 2000 : 
      null
  };
};