
import { supabase } from '@/integrations/supabase/client';
import { ArticleFormData } from '@/types/ArticleEditorTypes';

export interface ArticleSubmissionResult {
  success: boolean;
  error?: string;
  articleId?: string;
}

export const submitArticleOptimized = async (
  userId: string,
  formData: ArticleFormData,
  publishImmediately: boolean = false
): Promise<ArticleSubmissionResult> => {
  try {
    console.log('submitArticleOptimized: Starting submission with data:', {
      title: formData.title,
      categoryId: formData.categoryId,
      imageUrl: formData.imageUrl,
      contentLength: formData.content?.length,
      articleType: formData.articleType,
      publishImmediately
    });

    // Validate required fields
    if (!formData.title?.trim()) {
      return { success: false, error: 'Title is required' };
    }
    if (!formData.content?.trim()) {
      return { success: false, error: 'Content is required' };
    }
    if (!formData.imageUrl?.trim()) {
      return { success: false, error: 'Featured image is required' };
    }
    if (!formData.categoryId?.trim()) {
      return { success: false, error: 'Category is required' };
    }

    // Map form data to database fields
    const articleData = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      excerpt: formData.excerpt?.trim() || '',
      cover_image: formData.imageUrl.trim(), // Map imageUrl to cover_image
      category_id: formData.categoryId.trim(), // Map categoryId to category_id
      status: publishImmediately ? 'published' : 'pending_review',
      article_type: formData.articleType || 'standard',
      slug: formData.slug?.trim() || formData.title?.toLowerCase().replace(/\s+/g, '-'),
      author_id: userId,
      published_at: publishImmediately ? new Date().toISOString() : null
    };

    console.log('Mapped article data for database:', articleData);

    if (formData.id) {
      // Update existing article
      console.log('Updating existing article with ID:', formData.id);
      const { error } = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', formData.id);
      
      if (error) {
        console.error('submitArticleOptimized: Update error:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Article updated successfully');
      return { success: true, articleId: formData.id };
    } else {
      // Create new article
      console.log('Creating new article');
      const { data, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select()
        .single();
      
      if (error) {
        console.error('submitArticleOptimized: Insert error:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Article created successfully with ID:', data.id);
      return { success: true, articleId: data.id };
    }
  } catch (error) {
    console.error('submitArticleOptimized: Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
