
/**
 * Moderation Service main exports
 * This index file re-exports all functionality from the moderation service modules
 */

export * from './types';
export * from './moderationService';
export * from './statsService';

// Re-export these for backward compatibility
export { getModerationStats } from './statsService';
export { logModerationAction } from './loggingService';
export { getModeratorPerformance } from './performanceService';
