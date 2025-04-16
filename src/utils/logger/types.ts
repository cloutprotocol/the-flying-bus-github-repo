
/**
 * Logger types
 * Type definitions for the logger system
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum LogSource {
  APP = 'app',
  API = 'api',
  AUTH = 'auth',
  CONTENT = 'content',
  MEDIA = 'media',
  MODERATION = 'moderation',
  SAFETY = 'safety',
  VALIDATION = 'validation',
  VOTING = 'voting',
  REALTIME = 'realtime'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  data?: any;
}

export interface LoggerInterface {
  debug: (source: LogSource, message: string, data?: any) => void;
  info: (source: LogSource, message: string, data?: any) => void;
  warn: (source: LogSource, message: string, data?: any) => void;
  error: (source: LogSource, message: string, data?: any) => void;
  getEntries: () => LogEntry[];
  clear: () => void;
}
