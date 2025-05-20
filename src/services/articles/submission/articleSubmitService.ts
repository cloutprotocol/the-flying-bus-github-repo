
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { validateArticle } from '@/utils/validation/articleValidation';

/**
 * Submit an article for review using an optimized stored procedure
 * This version uses a single database transaction via a stored procedure
 * to improve performance and reduce database calls
 */
export const submitForReview = async (
  articleId: string
): Promise<{ success: boolean; error?: any; submissionId?: string }> => {
  try {
    // Fast fail with basic validation
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

    // Call the optimized stored procedure to handle the entire submission process
    // This runs as a single database transaction and handles all validation and updates
    const { data, error } = await supabase
      .rpc('submit_article_for_review', {
        p_article_id: articleId,
        p_user_id: userId
      })
      .single();

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
    
    if (!data.success) {
      return {
        success: false,
        error: new ApiError(data.error_message || 'Submission failed', ApiErrorType.VALIDATION)
      };
    }

    return { 
      success: true, 
      submissionId: data.article_id 
    };
  } catch (e) {
    // Minimal error logging for performance
    logger.error(LogSource.DATABASE, 'Unexpected error in article submission', { error: e });
    
    return { 
      success: false, 
      error: new ApiError('An unexpected error occurred during submission', ApiErrorType.UNKNOWN)
    };
  }
};
