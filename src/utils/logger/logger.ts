
/**
 * Logger Implementation
 * Core logger functionality
 */

import { LogLevel, LogSource, LogEntry, LoggerConfig } from './types';
import { getLoggerConfig } from './config';
import { getSeverityLevel, formatConsoleMessage } from './formatters';
import { persistLogToStorage, sendLogToServer } from './storage';
import { showToastForLog } from './toast';

/**
 * Log a message with the specified level and source
 */
export function logMessage(
  level: LogLevel, 
  source: LogSource, 
  message: string, 
  details?: any
): void {
  const config = getLoggerConfig();
  
  // Check if we should log based on minimum level
  if (getSeverityLevel(level) < getSeverityLevel(config.minLevel)) {
    return;
  }

  const entry: LogEntry = {
    level,
    source,
    message,
    details,
    timestamp: new Date().toISOString()
  };

  // Output to console if enabled
  if (config.consoleOutput) {
    const method = level === LogLevel.DEBUG ? 'debug' :
                   level === LogLevel.INFO ? 'info' :
                   level === LogLevel.WARN ? 'warn' :
                   'error';
    
    console[method](formatConsoleMessage(entry), details || '');
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
