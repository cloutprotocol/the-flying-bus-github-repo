
import { useEffect } from 'react';
import { logger } from '@/utils/logger/logger';
import { LogLevel, LogSource } from '@/utils/logger/types';
import { configureLogger } from '@/utils/logger/config';
import { clearLogsFromStorage } from '@/utils/logger/storage';

export function useAppInitialization() {
  useEffect(() => {
    // Clear existing logs to prevent storage issues on startup
    clearLogsFromStorage();
    
    // Configure the logger
    configureLogger({
      minLevel: import.meta.env.DEV ? LogLevel.INFO : LogLevel.WARN, // Reduce log level
      consoleOutput: true,
      toastOutput: false,
      persistToStorage: true,
      sendToServer: import.meta.env.PROD // Only send logs to server in production
    });
    
    logger.info(LogSource.APP, 'Application initialized', {
      version: '1.0.0',
      environment: import.meta.env.MODE,
      buildTime: new Date().toISOString()
    });
    
    // Store original console.error without overriding it
    // This reduces the risk of causing infinite error loops
    const originalError = console.error;
    
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      logger.error(LogSource.APP, 'Uncaught global error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      logger.error(LogSource.APP, 'Unhandled promise rejection', {
        reason: event.reason ? (event.reason.message || String(event.reason)) : 'Unknown reason'
      });
    });
    
    return () => {
      // Remove event listeners
      window.removeEventListener('error', () => {});
      window.removeEventListener('unhandledrejection', () => {});
    };
  }, []);
}
