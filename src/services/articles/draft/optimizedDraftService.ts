
import { supabase } from '@/integrations/supabase/client';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface DraftSaveResult {
  success: boolean;
  articleId?: string;
  error?: string;
}

export const saveDraftOptimized = async (
  userId: string,
  articleData: ArticleFormData
): Promise<DraftSaveResult> => {
  try {
    logger.info(LogSource.ARTICLE, 'Saving draft', {
      articleType: articleData.articleType,
      title: articleData.title
    });

    const submissionData = {
      id: articleData.id,
      title: articleData.title || 'Untitled Draft',
      content: articleData.content || '',
      excerpt: articleData.excerpt,
      imageUrl: articleData.imageUrl,
      categoryId: articleData.categoryId,
      author_id: userId,
      articleType: articleData.articleType || 'standard',
      slug: articleData.slug,
      videoUrl: articleData.videoUrl,
      debateSettings: articleData.debateSettings ? {
        ...articleData.debateSettings
      } : undefined
    };

    const { data, error } = await supabase.rpc('save_draft_optimized', {
      p_user_id: userId,
      p_article_data: submissionData as any
    });

    if (error) {
      logger.error(LogSource.ARTICLE, 'Error saving draft', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No response from draft save function');
    }

    const result = data[0];
    
    if (!result.success) {
      logger.error(LogSource.ARTICLE, 'Draft save failed', {
        error: result.error_message
      });
      return {
        success: false,
        error: result.error_message
      };
    }

    logger.info(LogSource.ARTICLE, 'Draft saved successfully', {
      articleId: result.article_id,
      duration: result.duration_ms
    });

    return {
      success: true,
      articleId: result.article_id
    };

  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception saving draft', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
