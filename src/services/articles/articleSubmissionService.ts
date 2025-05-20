
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { submitForReview } from './submission/articleSubmitService';
import { saveDraftOptimized } from './draft/optimizedDraftService';
import * as unifiedDraftService from './draft/unifiedDraftService';

/**
 * A unified service for article submission that handles both submitting for review
 * and saving drafts with optimized database operations
 */
export const articleSubmissionService = {
  // Submit for review with optimized DB operations
  submitForReview,
  
  // Save draft with optimized DB operations
  saveDraft: saveDraftOptimized,
  
  // Get draft by ID with optimized performance
  getDraftById: unifiedDraftService.getDraftById,
  
  // Get user drafts with optimized performance
  getUserDrafts: unifiedDraftService.getUserDrafts
};
