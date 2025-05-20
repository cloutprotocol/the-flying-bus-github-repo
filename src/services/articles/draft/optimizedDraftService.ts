
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';

/**
 * Save an article draft with optimized database operations
 * Uses a single RPC call to save all article data
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

    // Call the database function to save the draft (single DB call)
    const { data, error } = await supabase
      .rpc('submit_article_for_review', { 
        p_article_id: completeArticleData.id || null,
        p_user_id: userId 
      });
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error saving draft', { 
        error, 
        title: articleData.title,
        slug: slug
      });
      return { success: false, error };
    }
    
    // Fix: Make sure data is treated as a single object, not an array
    let articleId = null;
    
    // Type guard to ensure data has the expected structure
    if (data !== null && typeof data === 'object' && 'article_id' in data) {
      articleId = data.article_id as string;
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
