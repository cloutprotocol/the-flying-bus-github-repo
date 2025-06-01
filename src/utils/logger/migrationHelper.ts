
/**
 * Logger Migration Helper
 * 
 * This utility helps identify console.log statements that need to be migrated
 * to the professional logging system.
 */

import { logger } from './logger';
import { LogSource, LogLevel } from './types';

/**
 * Temporary wrapper for console.log during migration
 * This helps identify where console.log is still being used
 */
export const migratedConsole = {
  log: (message: string, ...args: any[]) => {
    logger.warn(LogSource.APP, 'Unmigrated console.log detected', { 
      message, 
      args,
      stack: new Error().stack 
    });
    // Still output to console during migration period
    console.log(message, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    logger.warn(LogSource.APP, message, args);
  },
  
  error: (message: string, ...args: any[]) => {
    logger.error(LogSource.APP, message, args);
  },
  
  info: (message: string, ...args: any[]) => {
    logger.info(LogSource.APP, message, args);
  },
  
  debug: (message: string, ...args: any[]) => {
    logger.debug(LogSource.APP, message, args);
  }
};

/**
 * Migration status tracker
 */
export const migrationStatus = {
  totalConsoleLogsFound: 0,
  migrated: 0,
  remaining: 0,
  
  reportMigration: (filename: string, lineNumber?: number) => {
    logger.info(LogSource.APP, 'Console.log migrated to logger', { 
      filename, 
      lineNumber 
    });
  },
  
  getSummary: () => ({
    total: migrationStatus.totalConsoleLogsFound,
    migrated: migrationStatus.migrated,
    remaining: migrationStatus.remaining,
    progress: migrationStatus.totalConsoleLogsFound > 0 
      ? (migrationStatus.migrated / migrationStatus.totalConsoleLogsFound) * 100 
      : 0
  })
};

/**
 * Helper function to determine appropriate log level based on context
 */
export const getLogLevelFromContext = (message: string, context?: any): LogLevel => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('exception')) {
    return LogLevel.ERROR;
  }
  
  if (lowerMessage.includes('warn') || lowerMessage.includes('warning')) {
    return LogLevel.WARN;
  }
  
  if (lowerMessage.includes('debug') || lowerMessage.includes('trace')) {
    return LogLevel.DEBUG;
  }
  
  // Default to info for most cases
  return LogLevel.INFO;
};

/**
 * Helper function to determine appropriate log source based on context
 */
export const getLogSourceFromContext = (filename?: string, context?: any): LogSource => {
  if (!filename) return LogSource.APP;
  
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.includes('auth')) return LogSource.AUTH;
  if (lowerFilename.includes('article')) return LogSource.ARTICLE;
  if (lowerFilename.includes('comment')) return LogSource.COMMENT;
  if (lowerFilename.includes('media')) return LogSource.MEDIA;
  if (lowerFilename.includes('user')) return LogSource.USER;
  if (lowerFilename.includes('dashboard')) return LogSource.DASHBOARD;
  if (lowerFilename.includes('editor')) return LogSource.EDITOR;
  if (lowerFilename.includes('moderation')) return LogSource.MODERATION;
  if (lowerFilename.includes('api') || lowerFilename.includes('service')) return LogSource.API;
  if (lowerFilename.includes('database') || lowerFilename.includes('supabase')) return LogSource.DATABASE;
  
  return LogSource.APP;
};
