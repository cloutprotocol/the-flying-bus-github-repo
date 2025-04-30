
/**
 * Logger Types
 * Type definitions for the logger system
 */

/**
 * Log levels enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Log sources enum
 * Used to categorize the source of log messages
 */
export enum LogSource {
  APP = 'app',
  API = 'api',
  AUTH = 'auth',
  DATABASE = 'database',
  ACTIVITY = 'activity',
  MODERATION = 'moderation',
  APPROVAL = 'approval',
  ARTICLE = 'article',
  COMMENT = 'comment',
  MEDIA = 'media',
  USER = 'user',
  VALIDATION = 'validation',
  TRACKING = 'tracking'
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  source: LogSource;
  message: string;
  timestamp: string;
  data?: any;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  consoleOutput: boolean;
  persistToStorage: boolean;
  sendToServer: boolean;
  toastOutput: boolean;
}
