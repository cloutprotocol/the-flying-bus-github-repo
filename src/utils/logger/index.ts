
/**
 * Logger Index
 * Main export file for the logger system
 */

// Re-export types with proper 'export type' syntax for isolatedModules
export type { LogLevel, LogSource, LogEntry, LoggerConfig } from './types';

// Re-export configuration
export { configureLogger } from './config';

// Re-export logger
export { logMessage, logger } from './logger';

// Default export
import { logger } from './logger';
export default logger;
