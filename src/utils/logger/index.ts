
/**
 * Logger Index
 * Main export file for the logger system
 */

// Export enums directly since they're values, not just types
export { LogLevel, LogSource } from './types';

// Export interfaces using 'export type' for isolatedModules
export type { LogEntry, LoggerConfig } from './types';

// Re-export configuration
export { configureLogger } from './config';

// Re-export logger
export { logMessage, logger } from './logger';

// Default export
import { logger } from './logger';
export default logger;
