
import { supabase } from '@/integrations/supabase/client';
import { ArticleFormData } from '@/types/ArticleEditorTypes';

export const submitArticleOptimized = async (
  userId: string,
  formData: ArticleFormData,
  publishImmediately: boolean = false
): Promise<{ success: boolean; error?: string; articleId?: string }> => {
  try {
    console.log('submitArticleOptimized: Starting submission with data:', {
      title: formData.title,
      categoryId: formData.categoryId,
      publishImmediately
    });

    const articleData = {
      title: formData.title,
      content: formData.content,
      excerpt: formData.excerpt || '',
      cover_image: formData.imageUrl || '',
      category_id: formData.categoryId,
      status: publishImmediately ? 'published' : 'pending_review',
      article_type: formData.articleType || 'standard',
      slug: formData.slug || formData.title?.toLowerCase().replace(/\s+/g, '-'),
      author_id: userId,
      published_at: publishImmediately ? new Date().toISOString() : null
    };

    if (formData.id) {
      // Update existing article
      const { error } = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', formData.id);
      
      if (error) {
        console.error('submitArticleOptimized: Update error:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, articleId: formData.id };
    } else {
      // Create new article
      const { data, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select()
        .single();
      
      if (error) {
        console.error('submitArticleOptimized: Insert error:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, articleId: data.id };
    }
  } catch (error) {
    console.error('submitArticleOptimized: Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
