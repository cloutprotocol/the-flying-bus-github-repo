
/**
 * Logger Types
 * Type definitions for the logging system
 */

/**
 * Log levels for severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Log sources to categorize log messages
 */
export enum LogSource {
  APP = 'app',
  API = 'api',
  AUTH = 'auth',
  DATABASE = 'database',
  MODERATION = 'moderation',
  EDITOR = 'editor',
  VALIDATION = 'validation',
  CLIENT = 'client',
  SERVER = 'server'
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  consoleOutput: boolean;
  toastOutput: boolean;
  persistToStorage: boolean;
  sendToServer: boolean;
}
