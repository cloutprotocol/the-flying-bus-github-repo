
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';

/**
 * Save an article draft with optimized database operations
 * Uses the new save_article_draft database function for efficient saving
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
    
    // IMPORTANT: Check if we have a draft ID - crucial for preventing duplicates
    const originalId = articleData.id;
    
    // If no draft ID but we have content, check for existing drafts by this author with this title
    // This helps prevent duplicate article creation during auto-saves
    if (!originalId && articleData.title) {
      logger.info(LogSource.DATABASE, 'No draft ID provided, checking for existing drafts', {
        title: articleData.title,
        authorId: userId
      });
      
      const { data: existingDrafts, error: searchError } = await supabase
        .from('articles')
        .select('id')
        .eq('author_id', userId)
        .eq('title', articleData.title)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!searchError && existingDrafts && existingDrafts.length > 0) {
        const existingId = existingDrafts[0].id;
        logger.info(LogSource.DATABASE, 'Found existing draft with same title', { 
          existingId,
          title: articleData.title 
        });
        
        // Use the existing draft ID to prevent duplicates
        articleData.id = existingId;
      }
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
      articleId: completeArticleData.id || 'new',
      title: completeArticleData.title,
      hasContent: !!completeArticleData.content,
      contentLength: completeArticleData.content?.length || 0
    });

    // Call the database function to save the draft (single DB call)
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
    
    // Handle different response formats
    let articleId: string | undefined;
    
    // Properly handle the response from save_article_draft function with correct type handling
    if (typeof data === 'string') {
      // Direct UUID return
      articleId = data;
    } else if (data && typeof data === 'object') {
      // Type assertion to access properties safely
      const responseObj = data as Record<string, unknown>;
      
      // Check if data is structured and has article_id or id property
      articleId = 
        (typeof responseObj.article_id === 'string' ? responseObj.article_id : undefined) || 
        (typeof responseObj.id === 'string' ? responseObj.id : undefined);
    }
    
    // If we still don't have an article ID, log this issue but return the original ID
    if (!articleId) {
      logger.warn(LogSource.DATABASE, 'No article ID returned from save_article_draft', { 
        originalId, 
        responseData: data 
      });
      articleId = originalId;
    }
    
    logger.info(LogSource.DATABASE, 'Draft saved successfully', { 
      articleId,
      originalId,
      title: articleData.title
    });
    
    return { success: true, error: null, articleId };
    
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception saving draft', { error: e });
    return { success: false, error: e };
  }
};
