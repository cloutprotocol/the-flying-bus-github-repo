
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
    
    // Log the parameters being sent to the function
    logger.debug(LogSource.DATABASE, 'Submitting article with parameters', {
      userId,
      articleDataKeys: Object.keys(articleData),
      saveDraft
    });
    
    // Call the new optimized stored procedure for validation and submission
    const { data, error } = await supabase.rpc('submit_article_with_validation', {
      p_user_id: userId,
      p_article_data: articleData,
      p_save_draft: saveDraft
    });

    if (error) {
      logger.error(LogSource.DATABASE, 'Error calling submit_article_with_validation', { error });
      
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
    
    // Add debug logging to see the response format
    logger.debug(LogSource.DATABASE, 'submit_article_with_validation response', { data });
    
    // Handle the structured response from the function
    if (data === null) {
      return {
        success: false,
        error: new ApiError('Submission failed', ApiErrorType.VALIDATION)
      };
    }

    // Check if we got an array result (handle both object and array responses)
    const result = Array.isArray(data) ? data[0] : data;

    // Check if submission was successful based on function response
    if (result && 'success' in result && !result.success) {
      const errorMessage = result.error_message || 'Submission failed';
      return {
        success: false,
        error: new ApiError(errorMessage, ApiErrorType.VALIDATION)
      };
    }

    // Extract the article_id from the response
    let submissionId = null;
    if (result && 'article_id' in result) {
      submissionId = result.article_id;
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
