
import { ArticleFormData } from '@/types/ArticleEditorTypes';

/**
 * Maps form data to database field names for consistency
 */
export const mapFormDataToDatabase = (formData: ArticleFormData, userId: string) => {
  console.log('mapFormDataToDatabase: Input data:', {
    shouldHighlight: formData.shouldHighlight,
    title: formData.title?.substring(0, 30),
    articleType: formData.articleType
  });
  
  const mappedData = {
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
    // CRITICAL: Map shouldHighlight to featured field with explicit boolean conversion
    featured: Boolean(formData.shouldHighlight),
    shouldHighlight: Boolean(formData.shouldHighlight),
    allowVoting: formData.allowVoting,
    debateSettings: formData.debateSettings,
    storyboardEpisodes: formData.storyboardEpisodes,
    videoUrl: (formData as any).videoUrl
  };
  
  console.log('mapFormDataToDatabase: Mapped data:', {
    featured: mappedData.featured,
    shouldHighlight: mappedData.shouldHighlight,
    title: mappedData.title?.substring(0, 30)
  });
  
  return mappedData;
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
  
  console.log('validateMappedData: Validation result:', {
    isValid: errors.length === 0,
    errors,
    featured: data.featured,
    shouldHighlight: data.shouldHighlight
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
