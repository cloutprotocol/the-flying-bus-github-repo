
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

// Track how many logs we've created recently to prevent excessive logging
const recentLogCounts = {
  totalCount: 0,
  bySource: {} as Record<string, number>,
  byMessage: {} as Record<string, number>,
  lastReset: Date.now()
};

// Reset recent log counts every minute
setInterval(() => {
  recentLogCounts.totalCount = 0;
  recentLogCounts.bySource = {};
  recentLogCounts.byMessage = {};
  recentLogCounts.lastReset = Date.now();
}, 60000);

/**
 * Check if we should rate limit this log message
 */
function shouldRateLimit(source: LogSource, message: string): boolean {
  const now = Date.now();
  
  // Reset counts if it's been more than a minute
  if (now - recentLogCounts.lastReset > 60000) {
    recentLogCounts.totalCount = 0;
    recentLogCounts.bySource = {};
    recentLogCounts.byMessage = {};
    recentLogCounts.lastReset = now;
  }
  
  // Increment counters
  recentLogCounts.totalCount++;
  recentLogCounts.bySource[source] = (recentLogCounts.bySource[source] || 0) + 1;
  
  // Use truncated message as key to handle slightly different messages with same meaning
  const messageKey = message.slice(0, 50);
  recentLogCounts.byMessage[messageKey] = (recentLogCounts.byMessage[messageKey] || 0) + 1;
  
  // Rate limit if:
  // - More than 100 logs in the last minute overall
  // - More than 20 logs from the same source
  // - More than 5 logs with similar messages
  return (
    recentLogCounts.totalCount > 100 ||
    recentLogCounts.bySource[source] > 20 ||
    recentLogCounts.byMessage[messageKey] > 5
  );
}

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
    
    // Apply rate limiting for non-error logs to prevent filling up storage
    if (level !== LogLevel.ERROR && level !== LogLevel.FATAL && shouldRateLimit(source, message)) {
      // If rate limited, still output critical rate limiting warnings to console
      if (recentLogCounts.totalCount % 50 === 0) {
        originalConsole.warn(`[LOGGER] Rate limiting applied, suppressed ${recentLogCounts.totalCount} logs in the last minute`);
      }
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

    // Persist to storage if enabled (only for warnings and errors)
    if (config.persistToStorage && getSeverityLevel(level) >= getSeverityLevel(LogLevel.WARN)) {
      persistLogToStorage(entry);
    }

    // Send to server if enabled (only for errors and fatal)
    if (config.sendToServer && getSeverityLevel(level) >= getSeverityLevel(LogLevel.ERROR)) {
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
