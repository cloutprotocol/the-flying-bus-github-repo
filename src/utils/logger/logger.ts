
/**
 * Logger Implementation
 * Core logger functionality
 */

import { LogLevel, LogSource, LogEntry } from './types';
import { getLoggerConfig } from './config';
import { getSeverityLevel, formatConsoleMessage } from './formatters';
import { persistLogToStorage, sendLogToServer } from './storage';
import { showToastForLog } from './toast';

// Flag to prevent recursive logging
let isLogging = false;

// Store original console methods
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

/**
 * Log a message with the specified level and source
 */
export function logMessage(
  level: LogLevel, 
  source: LogSource, 
  message: string, 
  details?: any
): void {
  // Prevent recursive logging
  if (isLogging) {
    // Fallback to original console logging if we're already logging
    const method = level === LogLevel.DEBUG ? 'debug' :
                  level === LogLevel.INFO ? 'info' :
                  level === LogLevel.WARN ? 'warn' :
                  'error';
    originalConsole[method](`[LOGGER RECURSION PREVENTED]: ${message}`, details || '');
    return;
  }

  try {
    isLogging = true;
    const config = getLoggerConfig();
    
    // Check if we should log based on minimum level
    if (getSeverityLevel(level) < getSeverityLevel(config.minLevel)) {
      isLogging = false;
      return;
    }

    const entry: LogEntry = {
      level,
      source,
      message,
      timestamp: new Date().toISOString()
    };

    // Only add details if they exist to avoid unnecessary data
    if (details !== undefined) {
      entry.data = details;
    }

    // Output to console if enabled
    if (config.consoleOutput) {
      const method = level === LogLevel.DEBUG ? 'debug' :
                    level === LogLevel.INFO ? 'info' :
                    level === LogLevel.WARN ? 'warn' :
                    'error';
      
      // Use original console methods to prevent infinite recursion
      originalConsole[method](formatConsoleMessage(entry), details || '');
    }

    // Show toast if enabled and level is warn or higher
    if (config.toastOutput && getSeverityLevel(level) >= getSeverityLevel(LogLevel.WARN)) {
      showToastForLog(entry);
    }

    // Persist to storage if enabled
    if (config.persistToStorage) {
      persistLogToStorage(entry);
    }

    // Send to server if enabled
    if (config.sendToServer) {
      // We use void to indicate we're intentionally not waiting for this promise
      void sendLogToServer(entry);
    }
  } finally {
    isLogging = false;
  }
}

// Convenience methods for different log levels
export const logger = {
  debug: (source: LogSource, message: string, details?: any) => 
    logMessage(LogLevel.DEBUG, source, message, details),
  
  info: (source: LogSource, message: string, details?: any) => 
    logMessage(LogLevel.INFO, source, message, details),
  
  warn: (source: LogSource, message: string, details?: any) => 
    logMessage(LogLevel.WARN, source, message, details),
  
  error: (source: LogSource, message: string, details?: any) => 
    logMessage(LogLevel.ERROR, source, message, details),
  
  fatal: (source: LogSource, message: string, details?: any) => 
    logMessage(LogLevel.FATAL, source, message, details)
};

// Create a default export of the logger
const defaultLogger = logger;
export default defaultLogger;
