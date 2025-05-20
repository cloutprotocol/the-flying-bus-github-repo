
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';

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
    const slug = articleData.slug || generateSlug(articleData.title || 'untitled-draft');
    
    // Build complete article data for the RPC call
    const completeArticleData = {
      ...articleData,
      slug: slug,
      author_id: userId,
      imageUrl: articleData.imageUrl || articleData.cover_image,
      categoryId: articleData.categoryId || articleData.category_id
    };

    // Call the database function to save the draft (single DB call)
    const { data, error } = await supabase
      .rpc('save_article_draft', { p_article_data: completeArticleData })
      .single();
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error saving draft', { 
        error, 
        title: articleData.title,
        slug: slug
      });
      return { success: false, error };
    }
    
    logger.info(LogSource.DATABASE, 'Draft saved successfully', { 
      articleId: data,
      title: articleData.title
    });
    
    return { success: true, error: null, articleId: data };
    
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception saving draft', { error: e });
    return { success: false, error: e };
  }
};

/**
 * Generate a slug on the client-side to avoid database queries
 * Uses timestamp suffix to ensure uniqueness
 */
const generateSlug = (title: string): string => {
  if (!title || typeof title !== 'string') {
    return `draft-${Date.now()}`;
  }
  
  // Create base slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Remove consecutive hyphens
    .trim();
    
  // Add timestamp to ensure uniqueness without needing additional DB queries
  return `${baseSlug}-${Date.now().toString().slice(-8)}`;
};
