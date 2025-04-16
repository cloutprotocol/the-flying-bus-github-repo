import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

// Performance metric types
export type PerformanceMetricType = 
  | 'page-load' 
  | 'api-call' 
  | 'component-render' 
  | 'user-interaction';

// Performance metric data
export interface PerformanceMetric {
  type: PerformanceMetricType;
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

// In-memory storage for metrics
const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 50;
let isProcessingMetrics = false;

/**
 * Record performance metric
 */
export const recordPerformanceMetric = (
  type: PerformanceMetricType,
  name: string,
  duration: number,
  metadata?: Record<string, any>
): void => {
  const metric: PerformanceMetric = {
    type,
    name,
    duration,
    timestamp: new Date().toISOString(),
    metadata
  };
  
  // Add to in-memory storage
  performanceMetrics.push(metric);
  
  // Ensure we don't exceed the max size
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.shift();
  }
  
  // Store in localStorage as a backup
  try {
    const storedMetrics = JSON.parse(localStorage.getItem('performance_metrics') || '[]');
    storedMetrics.push(metric);
    
    // Keep only the last 100 metrics
    if (storedMetrics.length > 100) {
      storedMetrics.shift();
    }
    
    localStorage.setItem('performance_metrics', JSON.stringify(storedMetrics));
  } catch (error) {
    logger.error(LogSource.APP, 'Failed to store performance metric in localStorage', error);
  }
};

/**
 * Create a performance measurement helper
 */
export const measurePerformance = (
  type: PerformanceMetricType,
  name: string,
  metadata?: Record<string, any>
): (() => void) => {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    recordPerformanceMetric(type, name, duration, metadata);
  };
};

/**
 * Measure API call performance
 */
export const measureApiCall = (name: string, metadata?: Record<string, any>): (() => void) => {
  return measurePerformance('api-call', name, metadata);
};

/**
 * Process and send performance metrics to the server
 */
const processPerformanceMetrics = async (): Promise<void> => {
  if (isProcessingMetrics || performanceMetrics.length === 0) {
    return;
  }
  
  try {
    isProcessingMetrics = true;
    
    // Take a snapshot of current metrics
    const metricsToProcess = [...performanceMetrics];
    
    // Clear the processed metrics
    performanceMetrics.splice(0, metricsToProcess.length);
    
    // Log summary of performance metrics
    logger.info(LogSource.APP, 'Performance metrics summary', {
      count: metricsToProcess.length,
      types: metricsToProcess.reduce((acc, metric) => {
        acc[metric.type] = (acc[metric.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageDuration: metricsToProcess.reduce((sum, metric) => sum + metric.duration, 0) / metricsToProcess.length
    });
    
    // Future improvement: Send to server when proper table is available
  } catch (error) {
    logger.error(LogSource.APP, 'Error processing performance metrics', error);
  } finally {
    isProcessingMetrics = false;
  }
};

// Set up periodic processing of performance metrics (every minute)
if (typeof window !== 'undefined') {
  setInterval(() => {
    void processPerformanceMetrics();
  }, 60000);
}

/**
 * Get all stored performance metrics
 */
export const getPerformanceMetrics = (): PerformanceMetric[] => {
  return [...performanceMetrics];
};

/**
 * Register performance observers for automatic monitoring
 */
export const registerPerformanceObservers = (): void => {
  // Only run in browser environment
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }
  
  try {
    // Observe page load metrics
    if (PerformanceObserver.supportedEntryTypes.includes('navigation')) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;
          recordPerformanceMetric('page-load', 'navigation', navEntry.duration, {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            load: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstContentfulPaint: navEntry.responseEnd - navEntry.responseStart,
            url: navEntry.name
          });
        }
      });
      navObserver.observe({ type: 'navigation', buffered: true });
    }
    
    // Observe resource load metrics
    if (PerformanceObserver.supportedEntryTypes.includes('resource')) {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Only track API calls
          if (resourceEntry.initiatorType === 'fetch' || resourceEntry.initiatorType === 'xmlhttprequest') {
            recordPerformanceMetric('api-call', resourceEntry.name, resourceEntry.duration, {
              size: resourceEntry.transferSize,
              type: resourceEntry.initiatorType
            });
          }
        }
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
    }
    
    // Observe long tasks that might cause UI jank
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          recordPerformanceMetric('component-render', 'long-task', entry.duration);
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    }
    
    logger.info(LogSource.APP, 'Performance observers registered successfully');
  } catch (error) {
    logger.error(LogSource.APP, 'Failed to register performance observers', error);
  }
};
