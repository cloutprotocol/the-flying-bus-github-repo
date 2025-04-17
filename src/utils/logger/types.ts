/**
 * API Error types
 * Types and classes for structured error handling
 */

/**
 * Logger level enum
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Log source identifier for better filtering
 */
export enum LogSource {
  CLIENT = 'client',
  API = 'api',
  AUTH = 'auth',
  EDITOR = 'editor',
  MODERATION = 'moderation',
  ADMIN = 'admin',
  DASHBOARD = 'dashboard',
  APP = 'app',
  DATABASE = 'database',
  CONTENT = 'content',
  REALTIME = 'realtime',
  VOTING = 'voting',
  SAFETY = 'safety',
  VALIDATION = 'validation',
  ARTICLE = 'article'
}

/**
 * Log entry structure used throughout the logging system
 */
export interface LogEntry {
  level: LogLevel;
  source: LogSource;
  message: string;
  timestamp: string;
  data?: any;
  userId?: string; // Add userId field for tracking which user generated the log
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
  maxStorageEntries: number;
}
