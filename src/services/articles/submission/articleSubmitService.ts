
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { validateArticle } from '@/utils/validation/articleValidation';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';

/**
 * Submit an article for review using the new optimized stored procedure
 * This version uses submit_article_with_validation for combined draft saving and submission
 */
export const submitForReview = async (
  articleData: any,
  saveDraft: boolean = true
): Promise<{ success: boolean; error?: any; submissionId?: string }> => {
  try {
    // Basic validation
    if (!articleData) {
      return { success: false, error: new Error('Missing article data') };
    }

    // Get current user session once for auth validation
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      return { 
        success: false, 
        error: new ApiError('Authentication required', ApiErrorType.AUTH, 401, sessionError)
      };
    }
    
    const userId = session.user.id;
    
    // Generate slug on client-side to avoid extra DB query if needed
    if (!articleData.slug && articleData.title) {
      articleData.slug = generateClientSideSlug(articleData.title);
    }
    
    // Call the new optimized stored procedure for validation and submission
    const { data, error } = await supabase
      .rpc('submit_article_with_validation', {
        p_user_id: userId,
        p_article_data: articleData,
        p_save_draft: saveDraft
      });

    if (error) {
      return { 
        success: false, 
        error: new ApiError(
          error.message || 'Error submitting article', 
          ApiErrorType.SERVER, 
          error.code === '23505' ? 409 : undefined, 
          error
        )
      };
    }
    
    // Handle the structured response from the function
    if (data === null) {
      return {
        success: false,
        error: new ApiError('Submission failed', ApiErrorType.VALIDATION)
      };
    }

    // Check if submission was successful based on function response
    if ('success' in data && !data.success) {
      const errorMessage = 'error_message' in data ? String(data.error_message) : 'Submission failed';
      return {
        success: false,
        error: new ApiError(errorMessage, ApiErrorType.VALIDATION)
      };
    }

    // Extract the article_id from the response
    let submissionId = null;
    if ('article_id' in data) {
      submissionId = data.article_id;
    }

    return { 
      success: true, 
      submissionId
    };
  } catch (e) {
    // Log error
    logger.error(LogSource.DATABASE, 'Unexpected error in article submission', { error: e });
    
    return { 
      success: false, 
      error: new ApiError('An unexpected error occurred during submission', ApiErrorType.UNKNOWN)
    };
  }
};
