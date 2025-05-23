
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';

/**
 * Save an article draft with optimized database operations
 * Uses the new save_draft_optimized database function for efficient saving
 * with improved duplicate detection
 */
export const saveDraftOptimized = async (
  articleData: any
): Promise<{ success: boolean; error: any; articleId?: string }> => {
  try {
    // Get current user session - CRITICAL for author_id
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      logger.error(LogSource.DATABASE, 'No authenticated user found when saving draft');
      return { 
        success: false, 
        error: new ApiError('User authentication required', ApiErrorType.AUTH)
      };
    }
    
    // Generate client-side slug if not provided
    const slug = articleData.slug || generateClientSideSlug(articleData.title || 'untitled-draft');
    
    // Ensure we have the minimum required data
    if (!articleData.title) {
      articleData.title = 'Untitled Draft';
    }
    
    // Build complete article data for the DB call
    const completeArticleData = {
      ...articleData,
      slug: slug,
      imageUrl: articleData.imageUrl || articleData.cover_image,
      categoryId: articleData.categoryId || articleData.category_id
    };
    
    logger.debug(LogSource.DATABASE, 'Calling save_draft_optimized with data', {
      articleId: completeArticleData.id || 'new',
      title: completeArticleData.title,
      hasContent: !!completeArticleData.content,
      contentLength: completeArticleData.content?.length || 0,
      keys: Object.keys(completeArticleData)
    });

    // Call the database function to save the draft (single DB call)
    const { data, error } = await supabase
      .rpc('save_draft_optimized', {
        p_user_id: userId,
        p_article_data: completeArticleData
      });
    
    if (error) {
      // Log detailed error information
      const errorDetails = {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      };
      
      logger.error(LogSource.DATABASE, 'Error saving draft', { 
        errorDetails, 
        title: articleData.title,
        slug: slug
      });
      
      return { success: false, error };
    }
    
    // Log the data returned to help with debugging
    logger.debug(LogSource.DATABASE, 'save_draft_optimized response', { data });
    
    // Handle different response formats
    const result = Array.isArray(data) ? data[0] : data;
    
    if (!result || !result.success) {
      const errorMessage = result?.error_message || 'Unknown error saving draft';
      logger.error(LogSource.DATABASE, errorMessage);
      return { 
        success: false, 
        error: new ApiError(errorMessage, ApiErrorType.SERVER)
      };
    }
    
    // Log performance metrics
    if (result.duration_ms) {
      logger.debug(LogSource.DATABASE, 'Draft save performance', { 
        durationMs: result.duration_ms 
      });
    }
    
    logger.info(LogSource.DATABASE, 'Draft saved successfully', { 
      articleId: result.article_id,
      originalId: articleData.id,
      title: articleData.title
    });
    
    return { success: true, error: null, articleId: result.article_id };
    
  } catch (e) {
    const errorDetails = e instanceof Error ? {
      message: e.message,
      name: e.name,
      stack: e.stack
    } : e;
    
    logger.error(LogSource.DATABASE, 'Exception saving draft', errorDetails);
    return { success: false, error: e };
  }
};
