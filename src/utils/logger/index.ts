
/**
 * Logger Index
 * Main export file for the logger system
 */

// Export all types and the logger
export { LogLevel, LogSource } from './types';
export type { LogEntry, LoggerConfig } from './types';
export { configureLogger } from './config';
export { logMessage, logger } from './logger';

// Default export
import { logger } from './logger';
export default logger;
