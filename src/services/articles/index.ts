
/**
 * Articles Service - Main entry point
 * 
 * This file exports a unified API for working with articles,
 * providing a clean interface to the underlying services.
 */

// Re-export all functionality from services for clean imports
export * from './articleMetricsService';
export * from './articleMutationService';
export * from './articleQueryService';
export * from './articleReviewService';
