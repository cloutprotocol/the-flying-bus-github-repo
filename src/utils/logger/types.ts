
/**
 * Logger Types
 * Type definitions for the logging system
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum LogSource {
  API = 'api',
  AUTH = 'auth',
  UI = 'ui',
  DATABASE = 'database',
  EDITOR = 'editor',
  APP = 'app',
  SERVICE = 'service',
  METRICS = 'metrics',
  // Restore the missing values to fix build errors
  CLIENT = 'client',
  MODERATION = 'moderation',
  ADMIN = 'admin',
  DASHBOARD = 'dashboard',
  CONTENT = 'content',
  REALTIME = 'realtime',
  VOTING = 'voting',
  SAFETY = 'safety',
  VALIDATION = 'validation',
  ARTICLE = 'article',
  ACTIVITY = 'activity'
}

export interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  data?: any;
  userId?: string; // Added missing userId property as optional
}

export interface LoggerConfig {
  minLevel: LogLevel;
  consoleOutput: boolean;
  toastOutput: boolean;
  persistToStorage: boolean;
  sendToServer: boolean;
  maxStorageEntries?: number;
}
