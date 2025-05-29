
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Helper function to measure API call duration and log results to both
 * client console and server performance_logs table
 * 
 * @param functionName The name of the function being measured
 * @param context Optional context data for the measurement
 * @returns A function to call when the operation is complete
 */
export const measureApiCall = (
  functionName: string, 
  context: Record<string, any> = {}
): (() => void) => {
  const startTime = performance.now();
  
  return () => {
    try {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      
      // Log to client console
      logger.debug(LogSource.PERFORMANCE, `${functionName} completed`, { 
        durationMs,
        ...context 
      });
      
      // Log to server (fire and forget)
      supabase.rpc('log_db_performance', {
        p_function_name: functionName,
        p_duration_ms: durationMs,
        p_context: context
      }).then(({ error }) => {
        if (error) {
          logger.error(LogSource.PERFORMANCE, 'Error logging performance', { error });
        }
      });
      
      return durationMs;
    } catch (error) {
      logger.error(LogSource.PERFORMANCE, 'Error in performance measurement', { error });
      return 0;
    }
  };
};

/**
 * General performance measurement function
 * 
 * @param category The category of the measurement
 * @param name The name of the operation
 * @param metadata Additional metadata to log
 * @returns A function to call when the operation is complete
 */
export const measurePerformance = (
  category: string,
  name: string,
  metadata: Record<string, any> = {}
): (() => void) => {
  const startTime = performance.now();
  
  return () => {
    try {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      
      // Log to client console
      logger.debug(LogSource.PERFORMANCE, `${category}: ${name} completed`, { 
        durationMs,
        category,
        name,
        ...metadata 
      });
      
      return durationMs;
    } catch (error) {
      logger.error(LogSource.PERFORMANCE, 'Error in performance measurement', { error });
      return 0;
    }
  };
};

/**
 * Get performance logs for analysis
 */
export const getPerformanceLogs = async (
  limit: number = 20
): Promise<{ logs: any[]; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('performance_logs')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      logger.error(LogSource.PERFORMANCE, 'Error fetching performance logs', { error });
      return { logs: [], error };
    }
    
    return { logs: data || [], error: null };
  } catch (e) {
    logger.error(LogSource.PERFORMANCE, 'Exception fetching performance logs', e);
    return { logs: [], error: e };
  }
};
