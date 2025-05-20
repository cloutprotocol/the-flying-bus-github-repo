
/**
 * Article Service
 * 
 * This file provides a unified API for all article-related functionality.
 * It acts as a facade over the more specific article services.
 */

// Export all article services through this facade
export * from './articles/articleMetricsService';
export * from './articles/articleMutationService';
export * from './articles/articleQueryService';
export * from './articles/articleReviewService';
export * from './articles/articleSubmissionService';
export * from './articles/draft/unifiedDraftService';
