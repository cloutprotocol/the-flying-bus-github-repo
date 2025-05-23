
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { validateArticle } from '@/utils/validation/articleValidation';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';

/**
 * Submit an article for review using the new optimized stored procedure
 * This version uses submit_article_optimized for combined draft saving and submission
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
      const errorMsg = 'Authentication required - no valid session found';
      logger.error(LogSource.DATABASE, errorMsg, { sessionError });
      return { 
        success: false, 
        error: new ApiError(errorMsg, ApiErrorType.AUTH, 401, sessionError)
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
      saveDraft,
      title: articleData.title?.substring(0, 30),
      articleId: articleData.id,
      contentLength: articleData.content?.length || 0
    });
    
    // First run client-side validation to catch obvious issues
    const validationResult = validateArticle(articleData, true);
    if (!validationResult.isValid) {
      const errorMsg = `Validation error before submission: ${validationResult.errors.join(', ')}`;
      logger.error(LogSource.DATABASE, errorMsg);
      return {
        success: false,
        error: new ApiError(errorMsg, ApiErrorType.VALIDATION)
      };
    }
    
    // Call the new optimized stored procedure for validation and submission
    logger.info(LogSource.DATABASE, 'Calling submit_article_optimized function', {
      hasId: !!articleData.id,
      title: articleData.title?.substring(0, 30)
    });
    
    const { data, error } = await supabase.rpc('submit_article_optimized', {
      p_user_id: userId,
      p_article_data: articleData,
      p_save_draft: saveDraft
    });

    if (error) {
      // Log with more details for debugging
      const errorDetails = {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      };
      
      logger.error(LogSource.DATABASE, 'Error calling submit_article_optimized', errorDetails);
      
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
    logger.debug(LogSource.DATABASE, 'submit_article_optimized response', { data });
    
    // Handle the structured response from the function
    if (data === null) {
      return {
        success: false,
        error: new ApiError('Submission failed - null response from database', ApiErrorType.VALIDATION)
      };
    }

    // Check if we got an array result (handle both object and array responses)
    const result = Array.isArray(data) ? data[0] : data;

    // Check if submission was successful
    if (!result.success) {
      const errorMessage = result.error_message || 'Submission failed';
      return {
        success: false,
        error: new ApiError(errorMessage, ApiErrorType.VALIDATION)
      };
    }

    // Extract the article_id from the response
    const submissionId = result.article_id;

    // Log performance metrics
    if (result.duration_ms) {
      logger.debug(LogSource.DATABASE, 'Article submission performance', { 
        durationMs: result.duration_ms,
        articleId: submissionId
      });
    }

    logger.info(LogSource.DATABASE, 'Article submitted successfully', { 
      submissionId,
      articleId: articleData.id
    });

    return { 
      success: true, 
      submissionId
    };
  } catch (e) {
    // Log error with detailed stack trace
    const errorDetails = e instanceof Error ? {
      message: e.message,
      stack: e.stack,
      name: e.name
    } : e;
    
    logger.error(LogSource.DATABASE, 'Unexpected error in article submission', errorDetails);
    
    return { 
      success: false, 
      error: new ApiError('An unexpected error occurred during submission', ApiErrorType.UNKNOWN)
    };
  }
};
