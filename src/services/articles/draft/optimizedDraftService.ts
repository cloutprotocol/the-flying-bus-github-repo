
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';
import { measureApiCall } from '@/services/monitoringService';

/**
 * Optimized draft save service using the new Supabase stored procedure
 * This reduces the number of database operations and improves performance
 */
export const saveDraftOptimized = async (
  articleData: any
): Promise<{ success: boolean; error?: any; draftId?: string }> => {
  try {
    // Get current user session
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
    
    // Generate slug on client-side if needed
    if (!articleData.slug && articleData.title) {
      articleData.slug = generateClientSideSlug(articleData.title);
    }
    
    // Prepare article data with proper structure for debate articles
    const preparedData = {
      ...articleData,
      author_id: userId
    };
    
    // Handle debate-specific data structure
    if (articleData.articleType === 'debate' && (articleData.question || articleData.yesPosition || articleData.noPosition)) {
      preparedData.debateSettings = {
        question: articleData.question || '',
        yesPosition: articleData.yesPosition || '',
        noPosition: articleData.noPosition || '',
        votingEnabled: articleData.votingEnabled ?? true,
        votingEndsAt: articleData.votingEndsAt || null
      };
    }
    
    logger.debug(LogSource.DATABASE, 'Saving draft with optimized function', {
      userId,
      hasId: !!articleData.id,
      title: articleData.title?.substring(0, 30),
      articleType: articleData.articleType,
      hasDebateSettings: !!preparedData.debateSettings
    });
    
    const endMeasure = measureApiCall('save-draft-optimized');
    
    // Call the optimized stored procedure
    const { data, error } = await supabase.rpc('save_draft_optimized', {
      p_user_id: userId,
      p_article_data: preparedData
    });
    
    endMeasure();
    
    if (error) {
      const errorDetails = {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      };
      
      logger.error(LogSource.DATABASE, 'Error calling save_draft_optimized', errorDetails);
      
      return { 
        success: false, 
        error: new ApiError(
          error.message || 'Error saving draft', 
          ApiErrorType.SERVER, 
          error.code === '23505' ? 409 : undefined,
          error
        )
      };
    }
    
    // Handle the structured response from the function
    if (data === null || (Array.isArray(data) && data.length === 0)) {
      return {
        success: false,
        error: new ApiError('Draft save failed - null response from database', ApiErrorType.VALIDATION)
      };
    }

    // Check if we got an array result (handle both object and array responses)
    const result = Array.isArray(data) ? data[0] : data;

    // Check if save was successful
    if (!result.success) {
      const errorMessage = result.error_message || 'Draft save failed';
      return {
        success: false,
        error: new ApiError(errorMessage, ApiErrorType.VALIDATION)
      };
    }

    // Extract the article_id from the response
    const draftId = result.article_id;

    // Log performance metrics
    if (result.duration_ms) {
      logger.debug(LogSource.DATABASE, 'Draft save performance', { 
        durationMs: result.duration_ms,
        draftId
      });
    }

    logger.info(LogSource.DATABASE, 'Draft saved successfully', { 
      draftId,
      originalId: articleData.id
    });

    return { 
      success: true, 
      draftId
    };
  } catch (e) {
    const errorDetails = e instanceof Error ? {
      message: e.message,
      stack: e.stack,
      name: e.name
    } : e;
    
    logger.error(LogSource.DATABASE, 'Unexpected error in draft save', errorDetails);
    
    return { 
      success: false, 
      error: new ApiError('An unexpected error occurred during draft save', ApiErrorType.UNKNOWN)
    };
  }
};
