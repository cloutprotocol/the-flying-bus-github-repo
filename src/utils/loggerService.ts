/**
 * Logger Service
 * Centralized logging system for frontend and backend interactions
 */

import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Log levels in order of severity
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// Log source
export enum LogSource {
  CLIENT = 'client',
  API = 'api',
  AUTH = 'auth',
  DATABASE = 'database',
  STORAGE = 'storage',
  BACKGROUND = 'background'
}

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  message: string;
  source: LogSource;
  timestamp: string;
  details?: any;
  userId?: string | null;
  url?: string;
  userAgent?: string;
}

/**
 * Configuration for the logger
 */
export interface LoggerConfig {
  minLevel: LogLevel;  // Minimum level to log
  consoleOutput: boolean; // Whether to output to console
  toastOutput: boolean; // Whether to show toast notifications
  persistToStorage: boolean; // Whether to persist logs to localStorage
  sendToServer: boolean; // Whether to send logs to server
}

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.INFO,
  consoleOutput: true,
  toastOutput: false,
  persistToStorage: false,
  sendToServer: true
};

// Current configuration
let config: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get severity level as number for comparison
 */
function getSeverityLevel(level: LogLevel): number {
  const levels = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.FATAL]: 4
  };
  return levels[level] || 0;
}

/**
 * Format log entry for console output
 */
function formatConsoleMessage(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]: ${entry.message}`;
}

/**
 * Send log to server
 */
async function sendLogToServer(entry: LogEntry): Promise<void> {
  try {
    // Check if auth session exists to get user ID
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (userId) {
      entry.userId = userId;
    }

    // Add browser information
    entry.url = window.location.href;
    entry.userAgent = navigator.userAgent;

    // Send to Supabase logs table if it exists
    // This is a fire-and-forget operation
    supabase.from('logs').insert([entry]).then(() => {
      // Successful log submission
    }).catch(error => {
      // If error sending log, output to console as fallback
      console.error('Failed to send log to server:', error);
    });
  } catch (error) {
    // Fallback to console if everything fails
    console.error('Error in logging system:', error);
  }
}

/**
 * Persist log to localStorage
 */
function persistLogToStorage(entry: LogEntry): void {
  try {
    const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
    logs.push(entry);
    
    // Keep only the last 100 logs to prevent storage overflow
    if (logs.length > 100) {
      logs.shift();
    }
    
    localStorage.setItem('app_logs', JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to persist log to localStorage:', error);
  }
}

/**
 * Show toast notification for log
 */
function showToastForLog(entry: LogEntry): void {
  const variant = entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL 
    ? 'destructive' 
    : entry.level === LogLevel.WARN 
    ? 'default' 
    : 'default';

  toast({
    title: `${entry.level.toUpperCase()}: ${entry.source}`,
    description: entry.message,
    variant
  });
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

  // Send to server if enabled and level is info or higher
  if (config.sendToServer) {
    sendLogToServer(entry).catch(e => {
      console.error('Failed to send log to server:', e);
    });
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

// Export as default and named
export default logger;
