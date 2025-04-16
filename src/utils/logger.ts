
/**
 * Logger Utility
 * 
 * DEPRECATED: This file is maintained for backward compatibility.
 * Please import from '@/utils/logger/index' directly in new code.
 */

// Re-export all types and the logger from the new structure
export { LogLevel, LogSource } from './logger/types';
export type { LogEntry, LoggerConfig } from './logger/types';
export { configureLogger } from './logger/config';
export { logMessage, logger } from './logger/logger';

// For backward compatibility with code that uses the default export
import { logger } from './logger/logger';
export default logger;
