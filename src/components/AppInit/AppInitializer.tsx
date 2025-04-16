
import { useEffect } from 'react';
import { LogLevel, LogSource } from '@/utils/logger/types';
import { configureLogger } from '@/utils/logger/config';
import { logger } from '@/utils/logger/logger';
import { registerPerformanceObservers } from '@/services/monitoringService';

const AppInitializer = () => {
  useEffect(() => {
    // Configure the logger
    configureLogger({
      minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      consoleOutput: true,
      toastOutput: false,
      persistToStorage: true,
      sendToServer: true
    });
    
    // Initialize performance monitoring
    registerPerformanceObservers();
    
    logger.info(LogSource.APP, 'Application initialized', {
      version: '1.0.0',
      environment: import.meta.env.MODE,
      buildTime: new Date().toISOString()
    });
  }, []);

  return null;
};

export default AppInitializer;
