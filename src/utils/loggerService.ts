
/**
 * Logger Service
 * Centralized logging system for frontend and backend interactions
 * 
 * This file is maintained for backward compatibility.
 * New code should import directly from @/utils/logger/index.
 */

// Re-export everything from the new logger module structure
export * from './logger/types';
export * from './logger/logger';
export * from './logger/config';
export { default } from './logger/logger';
