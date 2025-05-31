
import { ArticleFormData } from '@/types/ArticleEditorTypes';

export interface MappedArticleData {
  id?: string;
  title: string;
  content: string;
  excerpt?: string;
  imageUrl?: string;
  categoryId: string;
  slug?: string;
  articleType: string;
  status: string;
  author_id: string;
  videoUrl?: string;
  debateSettings?: any;
  storyboardEpisodes?: any[];
  [key: string]: any; // Add index signature for Supabase Json compatibility
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const mapFormDataToDatabase = (formData: ArticleFormData, userId: string): MappedArticleData => {
  return {
    id: formData.id,
    title: formData.title,
    content: formData.content,
    excerpt: formData.excerpt,
    imageUrl: formData.imageUrl,
    categoryId: formData.categoryId,
    slug: formData.slug,
    articleType: formData.articleType,
    status: formData.status || 'draft',
    author_id: userId,
    videoUrl: formData.videoUrl,
    debateSettings: formData.debateSettings,
    storyboardEpisodes: formData.storyboardEpisodes
  };
};

export const validateMappedData = (data: MappedArticleData): ValidationResult => {
  const errors: string[] = [];

  if (!data.title?.trim()) {
    errors.push('Title is required');
  }

  if (!data.categoryId) {
    errors.push('Category is required');
  }

  if (!data.author_id) {
    errors.push('Author ID is required');
  }

  // Article type specific validation
  if (data.articleType === 'video' && !data.videoUrl) {
    errors.push('Video URL is required for video articles');
  }

  if (data.articleType === 'debate' && !data.debateSettings?.question) {
    errors.push('Debate question is required for debate articles');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
