
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { generateUniqueSlug } from './slug/slugGenerationService';
import { submitForReview } from './submission/articleSubmitService';
import { saveDraftArticle } from './draft/draftSaveService';

/**
 * A unified service for article submission that handles both submitting for review
 * and saving drafts with consistent error handling and logging
 */
export const articleSubmissionService = {
  // Re-export the slug generation function for backward compatibility
  generateUniqueSlug,
  
  // Re-export submitForReview with the same signature
  submitForReview,
  
  // Re-export saveDraft with the same signature
  saveDraft: saveDraftArticle
};
