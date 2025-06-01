
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ArticleFormData } from '@/types/ArticleEditorTypes';

export const saveDraftOptimized = async (
  userId: string,
  formData: ArticleFormData
): Promise<{ success: boolean; error?: string; articleId?: string }> => {
  try {
    logger.debug(LogSource.ARTICLE, 'Starting optimized draft save', {
      title: formData.title,
      categoryId: formData.categoryId,
      hasContent: !!formData.content,
      articleId: formData.id
    });

    const articleData = {
      title: formData.title || 'Untitled Draft',
      content: formData.content || '',
      excerpt: formData.excerpt || '',
      cover_image: formData.imageUrl || '',
      category_id: formData.categoryId || null,
      status: 'draft',
      article_type: formData.articleType || 'standard',
      slug: formData.slug || formData.title?.toLowerCase().replace(/\s+/g, '-') || 'untitled',
      author_id: userId
    };

    if (formData.id) {
      // Update existing draft
      const { error } = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', formData.id);
      
      if (error) {
        logger.error(LogSource.ARTICLE, 'Failed to update existing draft', { 
          articleId: formData.id, 
          error: error.message,
          userId 
        });
        return { success: false, error: error.message };
      }
      
      logger.info(LogSource.ARTICLE, 'Draft updated successfully', { 
        articleId: formData.id,
        title: articleData.title 
      });
      return { success: true, articleId: formData.id };
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select()
        .single();
      
      if (error) {
        logger.error(LogSource.ARTICLE, 'Failed to create new draft', { 
          error: error.message,
          userId,
          title: articleData.title 
        });
        return { success: false, error: error.message };
      }
      
      logger.info(LogSource.ARTICLE, 'New draft created successfully', { 
        articleId: data.id,
        title: articleData.title 
      });
      return { success: true, articleId: data.id };
    }
  } catch (error) {
    logger.error(LogSource.ARTICLE, 'Exception during draft save operation', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      formDataId: formData.id 
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
