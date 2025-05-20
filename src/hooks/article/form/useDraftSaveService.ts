import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';

/**
 * Optimized service for saving article drafts with minimal validation
 * using the new save_article_draft database function
 */
export const useDraftSaveService = () => {
  const saveDraftOptimized = async (formData: any) => {
    try {
      // If there's no actual content change, skip saving to reduce DB load
      if (formData.id && !formData.isDirty && !formData.forceSave) {
        return { 
          success: true, 
          articleId: formData.id, 
          error: null 
        };
      }
      
      // Minimal client-side validation to improve performance
      if (!formData.title) {
        formData.title = 'Untitled Draft';
      }
      
      // Slug generation moved to client-side
      if (!formData.slug) {
        formData.slug = generateClientSideSlug(formData.title);
      }
      
      // Get current user session - CRITICAL for author_id
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        logger.error(LogSource.DATABASE, 'No authenticated user found when saving draft');
        return { 
          success: false, 
          error: { message: 'User authentication required' },
          articleId: formData.id
        };
      }
      
      // Prepare article data with author_id
      const articleData = {
        ...formData,
        author_id: session.user.id
      };
      
      // Log the data we're sending to the function
      logger.debug(LogSource.DATABASE, 'Calling save_article_draft from hook', {
        id: articleData.id,
        title: articleData.title?.substring(0, 20)
      });
      
      // Call the new database function to save the draft with correct parameter name
      const { data, error } = await supabase.rpc('save_article_draft', {
        p_article_data: articleData
      });
      
      if (error) {
        logger.error(LogSource.DATABASE, 'Error saving draft', { error });
        return { success: false, error, articleId: formData.id };
      }
      
      // Log the response data
      logger.debug(LogSource.DATABASE, 'save_article_draft hook response', { data });
      
      // Handle different response formats - could be direct UUID or structured response
      let articleId: string | undefined = formData.id;
      
      if (typeof data === 'string') {
        // Direct UUID return
        articleId = data;
      } else if (data && typeof data === 'object') {
        // Use type assertion to safely access properties
        const responseObj = data as Record<string, unknown>;
        
        // Try to extract article_id or id with proper type checking
        if (typeof responseObj.article_id === 'string') {
          articleId = responseObj.article_id;
        } else if (typeof responseObj.id === 'string') {
          articleId = responseObj.id;
        }
        // Otherwise keep the original id
      }
      
      if (!articleId) {
        logger.warn(LogSource.DATABASE, 'Could not determine article ID from response', { data });
      }
      
      return { success: true, articleId, error: null };
    } catch (error) {
      logger.error(LogSource.DATABASE, 'Exception saving draft in hook', { error });
      return { success: false, error, articleId: formData.id };
    }
  };

  return { saveDraftOptimized };
};
