import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';

/**
 * Generate a unique slug for an article
 * Always generates fresh slugs to avoid database constraint violations
 */
export const generateUniqueSlug = async (title: string | undefined, articleId?: string): Promise<string> => {
  // If title is undefined or empty, use a timestamp-based fallback
  if (!title || title.trim() === '') {
    return `draft-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
  
  // For existing articles, we could keep the existing slug if needed
  // But for now, always generate fresh to avoid duplicates
  if (articleId) {
    // If this is an update and article has existing slug, we might want to keep it
    // To keep logic simple post-migration, generate fresh client-side slugs only
    logger.info(LogSource.ARTICLE, 'Generating fresh slug for existing article', {
      articleId
    });
  }

  // Always use client-side generation for consistency and to avoid DB queries
  return generateClientSideSlug(title);
};
