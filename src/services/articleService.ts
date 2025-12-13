
/**
 * Article Service
 * 
 * This file provides a unified API for all article-related functionality.
 * It acts as a facade over the more specific article services.
 */

// Export Convex-backed article services through this facade
export * from './articles/articleMutationService';
export * from './articles/articleQueryService';
export * from './articles/validation/articleValidationService';
export { reviewArticle } from './articles/review/articleReviewHandlerService';
