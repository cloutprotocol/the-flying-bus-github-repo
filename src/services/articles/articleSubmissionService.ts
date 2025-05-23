
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { submitForReview } from './submission/articleSubmitService';
import { saveDraftOptimized } from './draft/optimizedDraftService';
import * as unifiedDraftService from './draft/unifiedDraftService';
import { supabase } from '@/integrations/supabase/client';

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
  getUserDrafts: unifiedDraftService.getUserDrafts,
  
  // Check if user session is valid
  checkSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        logger.error(LogSource.AUTH, "Session check failed", { error });
        return { data: { valid: false }, error };
      }
      
      // Check if the session is valid
      const userId = session.user?.id;
      
      if (!userId) {
        logger.error(LogSource.AUTH, "Session missing user ID");
        return { data: { valid: false }, error: new Error("Invalid session") };
      }
      
      logger.info(LogSource.AUTH, "Session check successful", { 
        userId,
        expiresAt: session.expires_at
      });
      
      return { data: { valid: true, userId }, error: null };
    } catch (error) {
      logger.error(LogSource.AUTH, "Exception checking session", error);
      return { data: { valid: false }, error };
    }
  }
};
