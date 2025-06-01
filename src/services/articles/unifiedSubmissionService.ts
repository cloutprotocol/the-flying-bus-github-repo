
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { mapFormDataToDatabase, validateMappedData } from '@/utils/article/articleDataMapper';
import { ARTICLE_STATUS } from '@/constants/articleConstants';

export interface SubmissionResult {
  success: boolean;
  error?: string;
  articleId?: string;
}

/**
 * Unified Article Submission Service
 * Uses proven database functions to avoid ambiguous column errors
 */
export class UnifiedSubmissionService {
  /**
   * Submit article for review using the proven submit_article_with_validation function
   */
  static async submitForReview(formData: ArticleFormData, userId: string): Promise<SubmissionResult> {
    try {
      logger.info(LogSource.ARTICLE, 'Starting unified article submission', {
        articleType: formData.articleType,
        hasId: !!formData.id,
        title: formData.title?.substring(0, 30),
        shouldHighlight: formData.shouldHighlight
      });

      // Validate required fields before processing
      if (!formData.title?.trim()) {
        return { success: false, error: 'Title is required' };
      }
      
      if (!formData.categoryId) {
        return { success: false, error: 'Category is required' };
      }

      // Handle featured article constraint with detailed logging
      if (formData.shouldHighlight) {
        logger.debug(LogSource.ARTICLE, 'Article marked as featured, unfeaturing existing featured articles');
        
        // First, unfeatured any existing featured articles
        const { error: unfeaturedError } = await supabase
          .from('articles')
          .update({ featured: false })
          .eq('featured', true);
        
        if (unfeaturedError) {
          logger.error(LogSource.ARTICLE, 'Error unfeaturing existing articles', unfeaturedError);
          return { success: false, error: 'Failed to update existing featured article' };
        }
        
        logger.debug(LogSource.ARTICLE, 'Successfully unfeatured existing articles');
      }

      // Map and validate form data with updated field mapping
      const mappedData = mapFormDataToDatabase(formData, userId);
      
      // CRITICAL: Ensure featured field is explicitly set
      mappedData.featured = Boolean(formData.shouldHighlight);
      
      logger.debug(LogSource.ARTICLE, 'Final mapped data before submission', {
        featured: mappedData.featured,
        shouldHighlight: mappedData.shouldHighlight,
        title: mappedData.title?.substring(0, 30)
      });
      
      const validation = validateMappedData(mappedData);

      if (!validation.isValid) {
        logger.error(LogSource.ARTICLE, 'Validation failed', { errors: validation.errors });
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Use the proven submit_article_with_validation function
      const { data, error } = await supabase.rpc('submit_article_with_validation', {
        p_user_id: userId,
        p_article_data: mappedData,
        p_save_draft: true
      });

      logger.debug(LogSource.ARTICLE, 'Database response', { data, error });

      if (error) {
        logger.error(LogSource.ARTICLE, 'Database submission failed', { 
          error: error.message,
          code: error.code 
        });
        
        // Handle specific database constraint violations
        if (error.code === '23514') {
          return {
            success: false,
            error: 'Invalid article status or type. Please check your submission.'
          };
        }
        
        if (error.code === '23503') {
          return {
            success: false,
            error: 'Invalid category selected. Please choose a valid category.'
          };
        }
        
        return {
          success: false,
          error: error.message || 'Failed to submit article'
        };
      }

      // Handle the response from submit_article_with_validation function
      const result = Array.isArray(data) ? data[0] : data;
      
      logger.debug(LogSource.ARTICLE, 'Processed result', result);
      
      if (!result?.success) {
        logger.error(LogSource.ARTICLE, 'Submission validation failed', { 
          errorMessage: result?.error_message 
        });
        return {
          success: false,
          error: result?.error_message || 'Submission failed'
        };
      }

      logger.info(LogSource.ARTICLE, 'Article submitted successfully', { 
        articleId: result.article_id 
      });

      return {
        success: true,
        articleId: result.article_id
      };

    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Unexpected submission error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Save article as draft using the proven save_article_draft function
   */
  static async saveDraft(formData: ArticleFormData, userId: string): Promise<SubmissionResult> {
    try {
      logger.info(LogSource.ARTICLE, 'Saving article draft', {
        articleType: formData.articleType,
        hasId: !!formData.id,
        shouldHighlight: formData.shouldHighlight
      });

      // Basic validation for drafts
      if (!formData.title?.trim()) {
        return { success: false, error: 'Title is required' };
      }

      // Handle featured article constraint for drafts too
      if (formData.shouldHighlight) {
        logger.debug(LogSource.ARTICLE, 'Draft marked as featured, unfeaturing existing featured articles');
        
        const { error: unfeaturedError } = await supabase
          .from('articles')
          .update({ featured: false })
          .eq('featured', true);
        
        if (unfeaturedError) {
          logger.error(LogSource.ARTICLE, 'Error unfeaturing existing articles', unfeaturedError);
          return { success: false, error: 'Failed to update existing featured article' };
        }
        
        logger.debug(LogSource.ARTICLE, 'Successfully unfeatured existing articles for draft');
      }

      const mappedData = mapFormDataToDatabase(formData, userId);
      // Override status to draft for save operations and ensure featured mapping
      mappedData.status = ARTICLE_STATUS?.DRAFT || 'draft';
      mappedData.featured = Boolean(formData.shouldHighlight);

      logger.debug(LogSource.ARTICLE, 'Draft save - final mapped data', {
        featured: mappedData.featured,
        shouldHighlight: mappedData.shouldHighlight,
        title: mappedData.title?.substring(0, 30)
      });

      // Use the proven save_article_draft function (returns UUID directly)
      const { data: articleId, error } = await supabase.rpc('save_article_draft', {
        p_article_data: mappedData
      });

      logger.debug(LogSource.ARTICLE, 'Draft save response', { articleId, error });

      if (error) {
        logger.error(LogSource.ARTICLE, 'Draft save failed', { error: error.message });
        return {
          success: false,
          error: error.message || 'Failed to save draft'
        };
      }

      if (!articleId) {
        logger.error(LogSource.ARTICLE, 'Draft save returned no article ID');
        return {
          success: false,
          error: 'Failed to save draft - no article ID returned'
        };
      }

      logger.info(LogSource.ARTICLE, 'Draft saved successfully', { 
        articleId 
      });

      return {
        success: true,
        articleId
      };

    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Unexpected draft save error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
