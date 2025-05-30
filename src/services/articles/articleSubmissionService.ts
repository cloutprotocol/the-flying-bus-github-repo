
import { supabase } from '@/integrations/supabase/client';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { createStoryboardSeries } from '@/services/storyboardService';

export interface ArticleSubmissionResult {
  success: boolean;
  articleId?: string;
  error?: string;
}

export const submitArticleOptimized = async (
  userId: string,
  articleData: ArticleFormData,
  saveAsDraft: boolean = false
): Promise<ArticleSubmissionResult> => {
  try {
    logger.info(LogSource.ARTICLE, 'Submitting article', {
      articleType: articleData.articleType,
      title: articleData.title,
      isDraft: saveAsDraft
    });

    // Handle storyboard articles differently
    if (articleData.articleType === 'storyboard') {
      return await submitStoryboardArticle(userId, articleData);
    }

    // Handle regular articles using the optimized submission function
    const submissionData = {
      id: articleData.id,
      title: articleData.title || 'Untitled Article',
      content: articleData.content || '',
      excerpt: articleData.excerpt,
      imageUrl: articleData.imageUrl,
      categoryId: articleData.categoryId,
      author_id: userId,
      articleType: articleData.articleType || 'standard',
      slug: articleData.slug,
      videoUrl: articleData.videoUrl,
      debateSettings: articleData.debateSettings
    };

    const { data, error } = await supabase.rpc('submit_article_optimized', {
      p_user_id: userId,
      p_article_data: submissionData,
      p_save_draft: saveAsDraft
    });

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error submitting article', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No response from submission function');
    }

    const result = data[0];
    
    if (!result.success) {
      logger.error(LogSource.ARTICLE, 'Article submission failed', {
        error: result.error_message
      });
      return {
        success: false,
        error: result.error_message
      };
    }

    logger.info(LogSource.ARTICLE, 'Article submitted successfully', {
      articleId: result.article_id,
      duration: result.duration_ms
    });

    return {
      success: true,
      articleId: result.article_id
    };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception submitting article', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

const submitStoryboardArticle = async (
  userId: string,
  articleData: ArticleFormData
): Promise<ArticleSubmissionResult> => {
  try {
    if (!articleData.storyboardEpisodes || articleData.storyboardEpisodes.length === 0) {
      return {
        success: false,
        error: 'Storyboard articles must have at least one episode'
      };
    }

    const seriesData = {
      title: articleData.title || 'Untitled Series',
      slug: articleData.slug || generateSlug(articleData.title || 'untitled-series'),
      description: articleData.content,
      coverImage: articleData.imageUrl,
      categoryId: articleData.categoryId || '',
      excerpt: articleData.excerpt,
      status: 'active'
    };

    const episodes = articleData.storyboardEpisodes.map((episode, index) => ({
      title: episode.title || `Episode ${index + 1}`,
      description: episode.description,
      videoUrl: episode.videoUrl,
      thumbnailUrl: episode.thumbnailUrl,
      duration: episode.duration,
      number: index + 1,
      content: episode.content || ''
    }));

    const result = await createStoryboardSeries(userId, {
      seriesData,
      episodes
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error_message || 'Failed to create storyboard series'
      };
    }

    return {
      success: true,
      articleId: result.series_id
    };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Error submitting storyboard article', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create storyboard series'
    };
  }
};

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export { submitStoryboardArticle };
