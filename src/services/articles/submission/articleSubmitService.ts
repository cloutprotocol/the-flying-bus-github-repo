
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { validateArticle } from '@/utils/validation/articleValidation';

/**
 * Submit an article for review using an optimized stored procedure
 * This version uses a single database operation to reduce latency
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
    
    // Get the article ID if it exists
    const articleId = articleData.id;
    
    // Generate slug on client-side to avoid extra DB query
    const slug = articleData.slug || generateClientSideSlug(articleData.title);
    
    // Call the optimized stored procedure using the existing submit_article_for_review function
    const { data, error } = await supabase
      .rpc('submit_article_for_review', {
        p_article_id: articleId || null,
        p_user_id: userId
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
    
    // Fix: Make sure we properly handle the response data type
    if (data === null) {
      return {
        success: false,
        error: new ApiError('Submission failed', ApiErrorType.VALIDATION)
      };
    }

    // Properly check if data is an object and has the success property
    if (typeof data === 'object' && 'success' in data && data.success === false) {
      return {
        success: false,
        error: new ApiError(
          data.error_message || 'Submission failed', 
          ApiErrorType.VALIDATION
        )
      };
    }

    // Get the article_id from data if it exists
    let submissionId = null;
    if (typeof data === 'object' && 'article_id' in data) {
      submissionId = data.article_id;
    }

    return { 
      success: true, 
      submissionId
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

/**
 * Generate a slug on the client-side to avoid database queries
 * Uses timestamp suffix to ensure uniqueness
 */
const generateClientSideSlug = (title: string): string => {
  if (!title || typeof title !== 'string') {
    return `draft-${Date.now()}`;
  }
  
  // Create base slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Remove consecutive hyphens
    .trim();
    
  // Add timestamp to ensure uniqueness without needing additional DB queries
  return `${baseSlug}-${Date.now().toString().slice(-8)}`;
};
