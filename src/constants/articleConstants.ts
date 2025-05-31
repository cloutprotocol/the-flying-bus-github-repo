
export const ARTICLE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
} as const;

export const ARTICLE_TYPES = {
  STANDARD: 'standard',
  VIDEO: 'video',
  DEBATE: 'debate',
  STORYBOARD: 'storyboard'
} as const;

export type ArticleStatus = typeof ARTICLE_STATUS[keyof typeof ARTICLE_STATUS];
export type ArticleType = typeof ARTICLE_TYPES[keyof typeof ARTICLE_TYPES];
