
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { validateArticleFields } from './validation/articleValidationService';
import { updateArticleStatus } from './status/articleStatusService';
import { saveDraft } from '@/services/draftService';
import { measureApiCall } from '@/services/monitoringService';

/**
 * A unified service for article submission that handles both submitting for review
 * and saving drafts with consistent error handling and logging
 */
export const articleSubmissionService = {
  /**
   * Submit an article for review
   */
  submitForReview: async (
    articleId: string
  ): Promise<{ success: boolean; error?: any; submissionId?: string }> => {
    const endMeasure = measureApiCall('submit-for-review');
    
    try {
      console.log("submitForReview called with articleId:", articleId);
      
      if (!articleId) {
        logger.error(LogSource.ARTICLE, 'Cannot submit article: Missing article ID');
        return { success: false, error: new Error('Missing article ID') };
      }

      logger.info(LogSource.ARTICLE, 'Starting article submission for review', { articleId });

      // Get current user session - CRITICAL for author_id validation
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        logger.error(LogSource.ARTICLE, 'Failed to get user session', sessionError);
        return { 
          success: false, 
          error: new ApiError('Authentication error', ApiErrorType.AUTH, 401, sessionError)
        };
      }
      
      const userId = session?.user?.id;
      
      console.log("User session check:", { userId, hasSession: !!session });
      
      if (!userId) {
        logger.error(LogSource.ARTICLE, 'User authentication required to submit article');
        endMeasure();
        return { 
          success: false, 
          error: new ApiError('User authentication required', ApiErrorType.AUTH)
        };
      }

      // First, fetch the article to validate required fields
      const fetchEnd = measureApiCall('fetch-article-for-validation');
      console.log("Fetching article for validation:", articleId);
      
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('title, content, category_id, author_id, slug')
        .eq('id', articleId)
        .single();
      fetchEnd();

      if (fetchError) {
        console.error("Failed to fetch article:", fetchError);
        logger.error(LogSource.ARTICLE, `Failed to fetch article ${articleId} for validation`, fetchError);
        endMeasure();
        return { 
          success: false, 
          error: new ApiError('Could not find the article', ApiErrorType.NOTFOUND)
        };
      }

      console.log("Article fetched for validation:", { 
        title: article.title,
        hasContent: !!article.content,
        contentLength: article.content?.length || 0,
        categoryId: article.category_id,
        hasSlug: !!article.slug,
        contentPreview: article.content?.substring(0, 100) + '...'
      });
      
      logger.info(LogSource.ARTICLE, 'Article fetched for validation', {
        articleId,
        title: article.title,
        contentLength: article.content?.length || 0,
        hasContent: !!article.content,
        categoryId: article.category_id,
        hasSlug: !!article.slug
      });

      // Validate author ownership - if author_id is set, ensure it belongs to current user
      if (article.author_id && article.author_id !== userId) {
        console.error("Authorization error: User doesn't own this article", {
          requestingUser: userId,
          articleOwner: article.author_id
        });
        
        logger.error(LogSource.ARTICLE, `User ${userId} attempted to submit article ${articleId} owned by ${article.author_id}`);
        endMeasure();
        return { 
          success: false, 
          error: new ApiError('You do not have permission to submit this article', ApiErrorType.AUTH)
        };
      }

      // Update author_id if missing
      if (!article.author_id) {
        console.log("Article missing author_id, setting to current user:", userId);
        const { error: authorUpdateError } = await supabase
          .from('articles')
          .update({ author_id: userId })
          .eq('id', articleId);
          
        if (authorUpdateError) {
          console.error("Failed to update article with author_id:", authorUpdateError);
          logger.warn(LogSource.ARTICLE, 'Failed to update article with author_id', { 
            articleId, 
            error: authorUpdateError 
          });
        }
      }

      // Generate slug if missing - this helps prevent database constraints
      if (!article.slug) {
        console.log("Article missing slug, generating one from title");
        const slug = article.title
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, '-');
          
        // Try to update the article with the slug
        const { error: slugError } = await supabase
          .from('articles')
          .update({ slug })
          .eq('id', articleId);
          
        if (slugError) {
          console.error("Failed to update article with slug:", slugError);
          // Continue with submission but log the error
          logger.warn(LogSource.ARTICLE, 'Failed to update article with slug', { 
            articleId, 
            error: slugError 
          });
        }
      }

      // Validate required fields
      try {
        console.log("Validating article fields");
        validateArticleFields(article);
        console.log("Article validation successful");
      } catch (validationError) {
        console.error("Article validation error:", validationError);
        logger.error(LogSource.ARTICLE, 'Article validation error when submitting for review', { 
          validationError,
          articleId 
        });
        endMeasure();
        return { 
          success: false, 
          error: new ApiError('Missing required fields', ApiErrorType.VALIDATION, undefined, validationError)
        };
      }

      console.log("Updating article status to 'pending'", { articleId });
      logger.info(LogSource.ARTICLE, `Submitting article ${articleId} for review`);
      const updateEnd = measureApiCall('update-article-status');
      const result = await updateArticleStatus(articleId, 'pending');
      updateEnd();
      
      if (!result.success) {
        console.error("Failed to update article status:", result.error);
        logger.error(LogSource.ARTICLE, `Failed to submit article ${articleId} for review`, result.error);
      } else {
        console.log("Successfully submitted article for review");
        logger.info(LogSource.ARTICLE, `Successfully submitted article ${articleId} for review`);
      }
      
      endMeasure();
      return { 
        success: result.success, 
        error: result.error, 
        submissionId: articleId // Return the ID for tracking purposes
      };
    } catch (e) {
      console.error("Exception in submitForReview:", e);
      logger.error(LogSource.ARTICLE, 'Exception submitting article for review', e);
      endMeasure();
      return { 
        success: false, 
        error: new ApiError('An unexpected error occurred during submission', ApiErrorType.UNKNOWN)
      };
    }
  },

  /**
   * Save article as draft with performance optimization and improved handling
   */
  saveDraft: async (
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
      
      // Generate a slug if we have a title but no slug
      if (sanitizedData.title && !sanitizedData.slug && sanitizedData.title !== 'Untitled Draft') {
        sanitizedData.slug = sanitizedData.title
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, '-');
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
  }
};
