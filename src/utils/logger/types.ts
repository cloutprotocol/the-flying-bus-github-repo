
/**
 * Logger Types
 * Type definitions for the logging system
 */

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
