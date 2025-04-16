
import { useEffect, useRef } from 'react';
import { measurePerformance } from '@/services/monitoringService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Hook to monitor component performance
 * 
 * @param componentName Name of the component to monitor
 * @param metadata Additional metadata to log
 */
export function usePerformanceMonitoring(
  componentName: string,
  metadata?: Record<string, any>
): void {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    
    // Create a performance measurement for this render cycle
    const endMeasurement = measurePerformance(
      'component-render',
      `${componentName}-render`,
      {
        renderCount: renderCount.current,
        ...metadata
      }
    );
    
    // End measurement when component updates or unmounts
    return () => {
      endMeasurement();
    };
  });
  
  // Also measure the initial mount duration
  useEffect(() => {
    logger.debug(LogSource.APP, `Component mounted: ${componentName}`, metadata);
    
    const unmountTimer = performance.now();
    
    return () => {
      const mountDuration = performance.now() - unmountTimer;
      logger.debug(
        LogSource.APP, 
        `Component unmounted: ${componentName}`,
        { 
          mountDuration,
          finalRenderCount: renderCount.current,
          ...metadata
        }
      );
    };
  }, [componentName, metadata]);
}

/**
 * Hook to measure the duration of a specific operation
 * 
 * @returns A function to start timing and a function to end timing
 */
export function usePerformanceMeasurement(): [
  (name: string) => void, 
  (metadata?: Record<string, any>) => void
] {
  const timerRef = useRef<{ name: string; startTime: number } | null>(null);
  
  const startTiming = (name: string): void => {
    timerRef.current = {
      name,
      startTime: performance.now()
    };
  };
  
  const endTiming = (metadata?: Record<string, any>): void => {
    if (timerRef.current) {
      const duration = performance.now() - timerRef.current.startTime;
      
      measurePerformance(
        'user-interaction',
        timerRef.current.name,
        { duration, ...metadata }
      )();
      
      timerRef.current = null;
    }
  };
  
  return [startTiming, endTiming];
}

export default usePerformanceMonitoring;
