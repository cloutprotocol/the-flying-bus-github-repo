
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
  METRICS = 'metrics' // Added METRICS to the enum
}

export interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  data?: any;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  showToasts: boolean;
  consoleOutput: boolean;
  persistLogs: boolean;
}
