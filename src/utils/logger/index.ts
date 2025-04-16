
/**
 * Logger Index
 * Main export file for the logger system
 */

// Re-export types
export { LogLevel, LogSource, LogEntry, LoggerConfig } from './types';

// Re-export configuration
export { configureLogger } from './config';

// Re-export logger
export { logMessage, logger } from './logger';

// Default export
export default logger;
