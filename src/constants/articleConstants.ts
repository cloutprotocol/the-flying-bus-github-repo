
/**
 * Article Constants
 * Centralized constants for article statuses and types that match database constraints
 */

// Article status values that match database enum
export const ARTICLE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending', // Changed from 'pending_review' to match DB constraint
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
} as const;

export type ArticleStatus = typeof ARTICLE_STATUS[keyof typeof ARTICLE_STATUS];

// Article type values that match database enum
export const ARTICLE_TYPE = {
  STANDARD: 'standard',
  VIDEO: 'video',
  DEBATE: 'debate',
  STORYBOARD: 'storyboard'
} as const;

export type ArticleType = typeof ARTICLE_TYPE[keyof typeof ARTICLE_TYPE];

// Field mapping between frontend form and database
export const FORM_TO_DB_FIELD_MAP = {
  imageUrl: 'cover_image',
  categoryId: 'category_id',
  articleType: 'article_type'
} as const;

// Validation constants
export const VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 200,
  CONTENT_MIN_LENGTH: 1,
  EXCERPT_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 1
} as const;
