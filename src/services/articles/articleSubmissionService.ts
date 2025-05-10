
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
   * Generate a unique slug for an article
   */
  generateUniqueSlug: async (title: string | undefined, articleId?: string): Promise<string> => {
    // If title is undefined or empty, use a timestamp-based fallback
    if (!title || title.trim() === '') {
      return `draft-${Date.now()}`;
    }
    
    // Create base slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
      
    // Add timestamp to ensure uniqueness
    const timestamp = new Date().getTime().toString().slice(-6);
    const proposedSlug = `${baseSlug}-${timestamp}`;
    
    // If we have an article ID, check if this slug already exists
    if (articleId) {
      const { data: existingArticle, error } = await supabase
        .from('articles')
        .select('slug')
        .eq('id', articleId)
        .single();
        
      // If article already has a slug, we can keep it
      if (!error && existingArticle && existingArticle.slug) {
        return existingArticle.slug;
      }
    }
    
    return proposedSlug;
  },
  
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
        .select('title, content, category_id, author_id, slug, status')
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

      // Ensure article exists and has the necessary fields
      if (!article) {
        logger.error(LogSource.ARTICLE, `Article ${articleId} not found`);
        endMeasure();
        return {
          success: false,
          error: new ApiError('Article not found', ApiErrorType.NOTFOUND)
        };
      }

      console.log("Article fetched for validation:", { 
        title: article.title,
        hasContent: !!article.content,
        contentLength: article.content?.length || 0,
        categoryId: article.category_id,
        hasSlug: !!article.slug,
        status: article.status,
        contentPreview: article.content?.substring(0, 100) + '...'
      });
      
      logger.info(LogSource.ARTICLE, 'Article fetched for validation', {
        articleId,
        title: article.title,
        contentLength: article.content?.length || 0,
        hasContent: !!article.content,
        categoryId: article.category_id,
        hasSlug: !!article.slug,
        status: article.status
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

      // Only update author_id if missing - avoids unnecessary updates
      let updateNeeded = false;
      const updates: any = {};
      
      if (!article.author_id) {
        updateNeeded = true;
        updates.author_id = userId;
        console.log("Article missing author_id, will set to current user:", userId);
      }

      // Generate and update slug if missing
      if (!article.slug) {
        try {
          console.log("Article missing slug, generating one from title");
          // Pass title as is - generateUniqueSlug handles undefined titles
          const uniqueSlug = await this.generateUniqueSlug(article.title, articleId);
          updates.slug = uniqueSlug;
          updateNeeded = true;
          
          console.log("Generated unique slug:", uniqueSlug);
        } catch (slugError) {
          console.error("Error generating slug:", slugError);
          logger.warn(LogSource.DATABASE, 'Error generating slug', { 
            articleId, 
            error: slugError 
          });
          // Continue with submission despite slug generation error
        }
      }
      
      // If we need to update author_id or slug, do it now
      if (updateNeeded) {
        console.log("Updating article with missing fields:", updates);
        const { error: updateError } = await supabase
          .from('articles')
          .update(updates)
          .eq('id', articleId);
          
        if (updateError) {
          console.error("Failed to update article with fields:", updateError);
          logger.warn(LogSource.DATABASE, 'Failed to update article fields', { 
            articleId, 
            updates,
            error: updateError 
          });
          
          // Only fail if this is a duplicate slug error
          if (updateError.message?.includes('articles_slug_key')) {
            endMeasure();
            return { 
              success: false, 
              error: new ApiError('Duplicate article slug. Please try again.', ApiErrorType.VALIDATION)
            };
          }
          // For other errors, continue with submission
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

      // Don't update status if it's already pending - avoid duplicate operations
      if (article.status === 'pending') {
        console.log("Article already has 'pending' status, skipping status update");
        endMeasure();
        return { 
          success: true,
          submissionId: articleId
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
      
      // Generate a slug if needed
      if (!sanitizedData.slug && sanitizedData.title !== 'Untitled Draft') {
        try {
          // Pass title as is - generateUniqueSlug handles undefined titles
          sanitizedData.slug = await this.generateUniqueSlug(sanitizedData.title, articleId);
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
  }
};
