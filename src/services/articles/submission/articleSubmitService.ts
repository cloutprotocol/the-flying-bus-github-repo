
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { validateArticleFields } from '../validation/articleValidationService';
import { updateArticleStatus } from '../status/articleStatusService';
import { generateUniqueSlug } from '../slug/slugGenerationService'; 

/**
 * Submit an article for review - Optimized version
 */
export const submitForReview = async (
  articleId: string
): Promise<{ success: boolean; error?: any; submissionId?: string }> => {
  try {
    // Basic validation for articleId
    if (!articleId) {
      return { success: false, error: new Error('Missing article ID') };
    }

    // Get current user session for auth validation
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      return { 
        success: false, 
        error: new ApiError('Authentication required', ApiErrorType.AUTH, 401, sessionError)
      };
    }
    
    const userId = session.user.id;

    // Fetch the article with minimal fields needed for validation
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('title, content, category_id, author_id, slug, status')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      return { 
        success: false, 
        error: new ApiError('Could not find the article', ApiErrorType.NOTFOUND)
      };
    }

    // Validate author ownership
    if (article.author_id && article.author_id !== userId) {
      return { 
        success: false, 
        error: new ApiError('You do not have permission to submit this article', ApiErrorType.AUTH)
      };
    }

    // Batch update for missing fields to reduce database calls
    let updateNeeded = false;
    const updates: any = {};
    
    // Only update author_id if missing
    if (!article.author_id) {
      updateNeeded = true;
      updates.author_id = userId;
    }

    // Generate slug only if missing
    if (!article.slug) {
      try {
        const uniqueSlug = await generateUniqueSlug(article.title, articleId);
        updates.slug = uniqueSlug;
        updateNeeded = true;
      } catch (slugError) {
        // Continue despite slug errors - not critical
        logger.warn(LogSource.DATABASE, 'Error generating slug', { articleId, error: slugError });
      }
    }
    
    // Perform a single update if needed
    if (updateNeeded) {
      const { error: updateError } = await supabase
        .from('articles')
        .update(updates)
        .eq('id', articleId);
        
      if (updateError && updateError.message?.includes('articles_slug_key')) {
        return { 
          success: false, 
          error: new ApiError('Duplicate article slug. Please try again.', ApiErrorType.VALIDATION)
        };
      }
      // Continue with minor update errors
    }

    // Validate required fields
    try {
      validateArticleFields(article);
    } catch (validationError) {
      return { 
        success: false, 
        error: new ApiError('Missing required fields', ApiErrorType.VALIDATION, undefined, validationError)
      };
    }

    // Skip status update if already pending
    if (article.status === 'pending') {
      return { success: true, submissionId: articleId };
    }

    // Update status to pending
    const result = await updateArticleStatus(articleId, 'pending');
    
    return { 
      success: result.success, 
      error: result.error, 
      submissionId: articleId
    };
  } catch (e) {
    return { 
      success: false, 
      error: new ApiError('An unexpected error occurred during submission', ApiErrorType.UNKNOWN)
    };
  }
};
