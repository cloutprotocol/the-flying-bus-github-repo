
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';

/**
 * Optimized service for saving article drafts with minimal validation
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
      
      // Create or update the article using our custom RPC function
      const { data, error } = await supabase
        .rpc('submit_article_for_review', {
          p_article_id: formData.id || null,
          p_user_id: session.user.id,
          // Additional parameters to be added if needed
        });
      
      if (error) {
        logger.error(LogSource.DATABASE, 'Error saving draft', { error });
        return { success: false, error, articleId: formData.id };
      }
      
      // Fix: Make sure data is treated as a single object, not an array
      let articleId = formData.id;
      
      // Type guard to ensure data has the expected structure
      if (data !== null && typeof data === 'object' && 'article_id' in data) {
        articleId = data.article_id as string || formData.id;
      }
      
      return { success: true, articleId, error: null };
    } catch (error) {
      logger.error(LogSource.DATABASE, 'Exception saving draft', { error });
      return { success: false, error, articleId: formData.id };
    }
  };

  return { saveDraftOptimized };
};
