
// Export types
export * from './types';

// Export core functions
export { logModerationAction } from './loggingService';
export { getModerationStats } from './statsService';
export { getModeratorPerformance } from './performanceService';

// For backward compatibility
export const getModerationMetrics = getModerationStats;
