
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { ARTICLE_STATUS } from '@/constants/articleConstants';

export interface DatabaseArticleData {
  id?: string;
  title: string;
  content: string;
  excerpt?: string;
  image_url?: string;
  category_id: string;
  slug?: string;
  article_type: string;
  video_url?: string;
  status: string;
  publish_date?: string | null;
  should_highlight?: boolean;
  allow_voting?: boolean;
  debate_settings?: any;
  storyboard_episodes?: any[];
  author_id: string;
  [key: string]: any; // Index signature for JSON compatibility
}

export function mapFormDataToDatabase(
  formData: ArticleFormData, 
  userId: string
): DatabaseArticleData {
  const baseData: DatabaseArticleData = {
    id: formData.id,
    title: formData.title,
    content: formData.content,
    excerpt: formData.excerpt || '',
    image_url: formData.imageUrl || '',
    category_id: formData.categoryId,
    slug: formData.slug || '',
    article_type: formData.articleType,
    status: formData.status || ARTICLE_STATUS.DRAFT,
    publish_date: formData.publishDate || null,
    should_highlight: formData.shouldHighlight || false,
    allow_voting: formData.allowVoting || false,
    author_id: userId
  };

  // Add type-specific fields
  if (formData.articleType === 'video' && formData.videoUrl) {
    baseData.video_url = formData.videoUrl;
  }

  if (formData.articleType === 'debate' && formData.debateSettings) {
    baseData.debate_settings = formData.debateSettings;
  }

  if (formData.articleType === 'storyboard' && formData.storyboardEpisodes) {
    baseData.storyboard_episodes = formData.storyboardEpisodes;
  }

  return baseData;
}

export function validateMappedData(data: DatabaseArticleData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.title?.trim()) {
    errors.push('Title is required');
  }

  if (!data.category_id?.trim()) {
    errors.push('Category is required');
  }

  if (!data.author_id?.trim()) {
    errors.push('Author ID is required');
  }

  // Content validation based on article type
  if (data.article_type !== 'debate' && !data.content?.trim()) {
    errors.push('Content is required');
  }

  // Type-specific validations
  if (data.article_type === 'video' && !data.video_url?.trim()) {
    errors.push('Video URL is required for video articles');
  }

  if (data.article_type === 'debate') {
    if (!data.debate_settings?.question?.trim()) {
      errors.push('Debate question is required');
    }
    if (!data.debate_settings?.yesPosition?.trim()) {
      errors.push('Yes position is required');
    }
    if (!data.debate_settings?.noPosition?.trim()) {
      errors.push('No position is required');
    }
  }

  if (data.article_type === 'storyboard') {
    if (!data.storyboard_episodes || data.storyboard_episodes.length === 0) {
      errors.push('At least one episode is required for storyboard articles');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
