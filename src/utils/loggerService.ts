
/**
 * Logger Service
 * Centralized logging system for frontend and backend interactions
 * 
 * This file is maintained for backward compatibility.
 * New code should import directly from @/utils/logger/index.
 */

// Re-export everything from the new logger module structure
export { LogLevel, LogSource } from './logger/types';
export type { LogEntry, LoggerConfig } from './logger/types';
export { configureLogger } from './logger/config';
export { logMessage, logger } from './logger/logger';
export { default } from './logger/logger';
