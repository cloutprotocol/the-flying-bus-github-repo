
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ArticleFormData } from '@/types/ArticleEditorTypes';

export const saveDraftOptimized = async (
  userId: string,
  formData: ArticleFormData
): Promise<{ success: boolean; error?: string; articleId?: string }> => {
  try {
    console.log('saveDraftOptimized: Starting save with data:', {
      title: formData.title,
      categoryId: formData.categoryId,
      hasContent: !!formData.content
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
        console.error('saveDraftOptimized: Update error:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, articleId: formData.id };
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select()
        .single();
      
      if (error) {
        console.error('saveDraftOptimized: Insert error:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, articleId: data.id };
    }
  } catch (error) {
    console.error('saveDraftOptimized: Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
