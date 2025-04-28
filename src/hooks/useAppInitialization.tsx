
import { useEffect } from 'react';
import { logger } from '@/utils/logger/logger';
import { LogLevel, LogSource } from '@/utils/logger/types';
import { configureLogger } from '@/utils/logger/config';
import { registerPerformanceObservers } from '@/services/monitoringService';

export function useAppInitialization() {
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
    
    // Store original console.error
    const originalError = console.error;
    
    // Safely override console.error to log through our system
    console.error = function(...args) {
      // Check if this is coming from our logger to prevent recursion
      const isInternalError = args[0] && typeof args[0] === 'string' && 
                              args[0].includes('[LOGGER RECURSION PREVENTED]');
      
      if (isInternalError) {
        // Use the original console.error directly to avoid recursion
        originalError.apply(console, args);
      } else {
        // Normal path for logging errors
        logger.error(LogSource.APP, 'Uncaught console error', args);
      }
    };
    
    // Setup global error handlers
    window.addEventListener('error', (event) => {
      logger.error(LogSource.APP, 'Uncaught global error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      logger.error(LogSource.APP, 'Unhandled promise rejection', {
        reason: event.reason
      });
    });
    
    return () => {
      // Restore original console.error when component unmounts
      console.error = originalError;
      
      // Remove event listeners
      window.removeEventListener('error', () => {});
      window.removeEventListener('unhandledrejection', () => {});
    };
  }, []);
}
