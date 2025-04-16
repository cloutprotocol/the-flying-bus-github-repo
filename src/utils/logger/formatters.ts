
/**
 * Logger Formatters
 * Utility functions for formatting log entries
 */

import { LogLevel, LogEntry } from './types';

/**
 * Get severity level as number for comparison
 */
export function getSeverityLevel(level: LogLevel): number {
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
export function formatConsoleMessage(entry: LogEntry): string {
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]: ${entry.message}`;
}
