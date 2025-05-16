
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { saveDraft } from '@/services/draftService';
import { measureApiCall } from '@/services/monitoringService';
import { generateUniqueSlug } from '../slug/slugGenerationService';

/**
 * Save article as draft with performance optimization and improved handling
 */
export const saveDraftArticle = async (
  articleId: string | undefined, 
  formData: any
): Promise<{ success: boolean; error?: any; articleId?: string }> => {
  const endMeasure = measureApiCall('save-draft');
  
  try {
    // Handle HTML content - ensure we don't strip important markup
    const content = formData.content || '';
    
    // Sanitize and validate the data before saving
    const sanitizedData = { 
      ...formData,
      title: formData.title?.trim() || 'Untitled Draft',
      content // Preserve the HTML content
    };

    console.log("saveDraft called with:", {
      articleId,
      hasFormData: !!formData,
      title: sanitizedData.title,
      contentLength: content.length || 0,
      contentStartsWith: content.substring(0, 30) + '...',
      hasHTML: content.includes('<') && content.includes('>')
    });
    
    // Check if we're saving empty content - warn but continue
    if (!content || content.length === 0) {
      logger.warn(LogSource.EDITOR, 'Saving draft with empty content', { 
        articleId: articleId || 'new'
      });
    }
    
    // Generate a slug if needed
    if (!sanitizedData.slug && sanitizedData.title !== 'Untitled Draft') {
      try {
        sanitizedData.slug = await generateUniqueSlug(sanitizedData.title, articleId);
      } catch (slugError) {
        logger.warn(LogSource.EDITOR, 'Error generating slug', {
          articleId,
          error: slugError
        });
      }
    }
    
    logger.info(LogSource.EDITOR, 'Saving article draft via unified service', { 
      articleId: articleId || 'new', 
      formDataKeys: Object.keys(formData),
      hasContent: !!content,
      contentLength: content.length || 0,
      contentType: typeof content
    });
    
    // Get current user session for author_id
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (userId && !sanitizedData.author_id) {
      console.log("Adding missing author_id to draft:", userId);
      sanitizedData.author_id = userId;
    }
    
    const result = await saveDraft(articleId || '', sanitizedData);
    
    if (result.success) {
      console.log("Draft saved successfully:", result.articleId);
      logger.info(LogSource.EDITOR, 'Draft saved successfully', {
        articleId: result.articleId
      });
    } else {
      console.error("Draft save failed:", result.error);
      logger.error(LogSource.EDITOR, 'Draft save failed', {
        error: result.error
      });
    }
    
    endMeasure();
    return { 
      success: result.success, 
      error: result.error, 
      articleId: result.articleId 
    };
  } catch (error) {
    console.error("Error in unified draft save service:", error);
    logger.error(LogSource.EDITOR, 'Error in unified draft save service', { error });
    endMeasure();
    return { 
      success: false, 
      error: new ApiError('An unexpected error occurred while saving the draft', ApiErrorType.UNKNOWN), 
      articleId 
    };
  }
};
