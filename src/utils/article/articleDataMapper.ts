
import { ArticleFormData } from '@/types/ArticleEditorTypes';

/**
 * Maps form data to database field names for consistency
 */
export const mapFormDataToDatabase = (formData: ArticleFormData, userId: string) => {
  return {
    id: formData.id,
    title: formData.title,
    content: formData.content || '',
    excerpt: formData.excerpt,
    // Map both field names for compatibility
    cover_image: formData.imageUrl,
    imageUrl: formData.imageUrl,
    // Map both field names for compatibility
    category_id: formData.categoryId,
    categoryId: formData.categoryId,
    author_id: userId,
    status: formData.status || 'draft',
    // Map both field names for compatibility
    article_type: formData.articleType,
    articleType: formData.articleType,
    slug: formData.slug,
    publishDate: formData.publishDate,
    shouldHighlight: formData.shouldHighlight,
    allowVoting: formData.allowVoting,
    debateSettings: formData.debateSettings,
    storyboardEpisodes: formData.storyboardEpisodes,
    videoUrl: (formData as any).videoUrl
  };
};

/**
 * Validates mapped data for database submission
 */
export const validateMappedData = (data: any) => {
  const errors: string[] = [];
  
  if (!data.title?.trim()) {
    errors.push('Title is required');
  }
  
  if (!data.categoryId && !data.category_id) {
    errors.push('Category is required');
  }
  
  if (!data.author_id) {
    errors.push('Author ID is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
