
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

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
  static async submitForReview(formData: ArticleFormData, _userId: string): Promise<SubmissionResult> {
    try {
      console.log('🚀 UnifiedSubmissionService.submitForReview called with data:', {
        title: formData.title,
        articleType: formData.articleType,
        videoUrl: formData.videoUrl,
        storyboardEpisodes: formData.storyboardEpisodes?.length,
        shouldHighlight: formData.shouldHighlight
      });

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

      const convexUrl = import.meta.env.VITE_CONVEX_URL!;
      const convex = new ConvexHttpClient(convexUrl);

      const publishImmediately = formData.status === 'published';
      const articleId = await convex.mutation(api.articles.submit, {
        id: formData.id ? (formData.id as Id<'articles'>) : undefined,
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || undefined,
        imageUrl: formData.imageUrl || undefined,
        categoryId: formData.categoryId || undefined,
        articleType: formData.articleType,
        slug: formData.slug || undefined,
        shouldHighlight: Boolean(formData.shouldHighlight),
        publishImmediately,
        status: publishImmediately ? 'published' : 'pending_review',
      });

      logger.info(LogSource.ARTICLE, 'Article submitted successfully', { articleId });
      return { success: true, articleId };

    } catch (error) {
      console.error('Unexpected submission error:', error);
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
  static async saveDraft(formData: ArticleFormData, _userId: string): Promise<SubmissionResult> {
    try {
      console.log('UnifiedSubmissionService.saveDraft called with shouldHighlight:', formData.shouldHighlight);

      logger.info(LogSource.ARTICLE, 'Saving article draft', {
        articleType: formData.articleType,
        hasId: !!formData.id,
        shouldHighlight: formData.shouldHighlight
      });

      // Basic validation for drafts
      if (!formData.title?.trim()) {
        return { success: false, error: 'Title is required' };
      }

      const convexUrl = import.meta.env.VITE_CONVEX_URL!;
      const convex = new ConvexHttpClient(convexUrl);

      const articleId = await convex.mutation(api.articles.submit, {
        id: formData.id ? (formData.id as Id<'articles'>) : undefined,
        title: formData.title,
        content: formData.content || '',
        excerpt: formData.excerpt || undefined,
        imageUrl: formData.imageUrl || undefined,
        categoryId: formData.categoryId || undefined,
        articleType: formData.articleType,
        slug: formData.slug || undefined,
        shouldHighlight: Boolean(formData.shouldHighlight),
        status: 'draft',
      });

      logger.info(LogSource.ARTICLE, 'Draft saved successfully', { articleId });
      return { success: true, articleId };

    } catch (error) {
      console.error('Unexpected draft save error:', error);
      logger.error(LogSource.ARTICLE, 'Unexpected draft save error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
