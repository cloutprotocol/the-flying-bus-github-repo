
import { ARTICLE_STATUS, ARTICLE_TYPE, FORM_TO_DB_FIELD_MAP } from '@/constants/articleConstants';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Maps frontend form data to database-compatible format
 * Ensures all field names and values match database constraints
 */
export const mapFormDataToDatabase = (formData: ArticleFormData, userId: string) => {
  logger.debug(LogSource.ARTICLE, 'Mapping form data to database format', {
    articleType: formData.articleType,
    hasId: !!formData.id,
    status: formData.status
  });

  // Map frontend status to database status
  const mapStatus = (status?: string) => {
    switch (status) {
      case 'pending_review':
        return ARTICLE_STATUS.PENDING; // Fix the status mismatch
      case 'draft':
        return ARTICLE_STATUS.DRAFT;
      case 'published':
        return ARTICLE_STATUS.PUBLISHED;
      case 'rejected':
        return ARTICLE_STATUS.REJECTED;
      case 'archived':
        return ARTICLE_STATUS.ARCHIVED;
      default:
        return ARTICLE_STATUS.DRAFT; // Safe fallback
    }
  };

  // Base article data with proper field mapping
  const baseData = {
    id: formData.id,
    title: formData.title?.trim() || '',
    content: formData.content?.trim() || '',
    excerpt: formData.excerpt?.trim() || '',
    cover_image: formData.imageUrl?.trim() || '', // Map to DB field name
    category_id: formData.categoryId?.trim() || '', // Map to DB field name
    slug: formData.slug?.trim() || '',
    article_type: formData.articleType || ARTICLE_TYPE.STANDARD, // Map to DB field name
    status: mapStatus(formData.status),
    author_id: userId,
    publish_date: formData.publishDate,
    should_highlight: formData.shouldHighlight,
    allow_voting: formData.allowVoting
  };

  // Add type-specific fields based on article type
  const enhancedData = { ...baseData };

  switch (formData.articleType) {
    case ARTICLE_TYPE.VIDEO:
      if (formData.videoUrl) {
        enhancedData.videoUrl = formData.videoUrl.trim();
      }
      break;

    case ARTICLE_TYPE.DEBATE:
      if (formData.debateSettings) {
        enhancedData.debateSettings = {
          question: formData.debateSettings.question?.trim() || '',
          yesPosition: formData.debateSettings.yesPosition?.trim() || '',
          noPosition: formData.debateSettings.noPosition?.trim() || '',
          votingEnabled: formData.debateSettings.votingEnabled,
          voting_ends_at: formData.debateSettings.voting_ends_at
        };
      }
      break;

    case ARTICLE_TYPE.STORYBOARD:
      if (formData.storyboardEpisodes) {
        enhancedData.storyboardEpisodes = formData.storyboardEpisodes.map(episode => ({
          title: episode.title?.trim() || '',
          description: episode.description?.trim() || '',
          videoUrl: episode.videoUrl?.trim() || '',
          thumbnailUrl: episode.thumbnailUrl?.trim() || '',
          duration: episode.duration?.trim() || '',
          number: episode.number,
          content: episode.content?.trim() || ''
        }));
      }
      break;

    default:
      // Standard article - no additional fields needed
      break;
  }

  logger.debug(LogSource.ARTICLE, 'Successfully mapped form data', {
    mappedStatus: enhancedData.status,
    mappedType: enhancedData.article_type
  });

  return enhancedData;
};

/**
 * Validates mapped article data before submission
 */
export const validateMappedData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required field validation
  if (!data.title?.trim()) {
    errors.push('Title is required');
  }

  if (!data.content?.trim() && data.article_type !== ARTICLE_TYPE.DEBATE) {
    errors.push('Content is required for non-debate articles');
  }

  if (!data.category_id?.trim()) {
    errors.push('Category is required');
  }

  // Type-specific validation
  if (data.article_type === ARTICLE_TYPE.VIDEO && !data.videoUrl?.trim()) {
    errors.push('Video URL is required for video articles');
  }

  if (data.article_type === ARTICLE_TYPE.DEBATE && data.debateSettings) {
    const { question, yesPosition, noPosition } = data.debateSettings;
    if (!question?.trim()) errors.push('Debate question is required');
    if (!yesPosition?.trim()) errors.push('Yes position is required');
    if (!noPosition?.trim()) errors.push('No position is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
