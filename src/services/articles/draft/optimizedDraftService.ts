
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';

/**
 * Save an article draft with optimized database operations
 * Uses the new save_article_draft database function for efficient saving
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
    
    // Build complete article data for the DB call
    const completeArticleData = {
      ...articleData,
      slug: slug,
      author_id: userId,
      imageUrl: articleData.imageUrl || articleData.cover_image,
      categoryId: articleData.categoryId || articleData.category_id
    };
    
    logger.debug(LogSource.DATABASE, 'Calling save_article_draft with data', {
      dataKeys: Object.keys(completeArticleData)
    });

    // Call the new database function to save the draft (single DB call)
    const { data, error } = await supabase
      .rpc('save_article_draft', {
        p_article_data: completeArticleData
      });
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error saving draft', { 
        error, 
        title: articleData.title,
        slug: slug
      });
      return { success: false, error };
    }
    
    // Log the data returned to help with debugging
    logger.debug(LogSource.DATABASE, 'save_article_draft response', { data });
    
    // Handle different response formats - could be direct UUID or structured response
    let articleId;
    if (typeof data === 'string') {
      // Direct UUID return
      articleId = data;
    } else if (data && typeof data === 'object') {
      // Object with article_id field
      articleId = data.article_id;
    } else {
      // Fallback to the original ID if provided
      articleId = articleData.id;
      logger.warn(LogSource.DATABASE, 'Unexpected response format from save_article_draft', { data });
    }
    
    logger.info(LogSource.DATABASE, 'Draft saved successfully', { 
      articleId,
      title: articleData.title
    });
    
    return { success: true, error: null, articleId };
    
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception saving draft', { error: e });
    return { success: false, error: e };
  }
};
