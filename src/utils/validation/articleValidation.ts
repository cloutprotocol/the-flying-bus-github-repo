
/**
 * Article Validation
 * Validation schemas for article-related operations
 */

import { z } from 'zod';
import { uuidSchema, slugSchema, urlSchema } from './validationUtils';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

// Article status enum
export const ArticleStatusEnum = z.enum([
  'draft', 
  'pending', 
  'published', 
  'archived',
  'rejected'
]);

// Article type enum
export const ArticleTypeEnum = z.enum([
  'standard',
  'debate',
  'storyboard',
  'video'
]);

// Reading level enum
export const ReadingLevelEnum = z.enum([
  'Beginner',
  'Intermediate',
  'Advanced'
]);

// Debate settings schema for nested structure
const debateSettingsSchema = z.object({
  question: z.string()
    .min(10, 'Question must be at least 10 characters long')
    .refine(q => !q.includes("<script>"), "Question cannot contain script tags"),
  yesPosition: z.string()
    .min(50, 'Yes position argument must be at least 50 characters long')
    .refine(pos => !pos.includes("<script>"), "Position argument cannot contain script tags"),
  noPosition: z.string()
    .min(50, 'No position argument must be at least 50 characters long')
    .refine(pos => !pos.includes("<script>"), "Position argument cannot contain script tags"),
  votingEnabled: z.boolean().optional().default(true),
  votingEndsAt: z.string().datetime().optional().nullable()
});

// Base article schema with common fields
const baseArticleSchemaObject = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(150, 'Title is too long')
    .refine(title => !title.includes("<script>"), "Title cannot contain script tags"),
  content: z.string()
    .min(1, 'Content is required')
    .refine(content => !content.includes("<script>"), "Content cannot contain script tags"),
  excerpt: z.string()
    .max(300, 'Excerpt is too long')
    .optional()
    .refine(excerpt => !excerpt || !excerpt.includes("<script>"), "Excerpt cannot contain script tags"),
  categoryId: uuidSchema,
  imageUrl: urlSchema
    .refine(url => url.startsWith('https://'), "Image URL must use HTTPS")
    .optional(),
  slug: slugSchema.optional(),
  status: ArticleStatusEnum.optional().default('draft'),
  articleType: ArticleTypeEnum.optional().default('standard'),
  readingLevel: ReadingLevelEnum.optional().default('Intermediate'),
  videoUrl: urlSchema
    .refine(url => url.startsWith('https://'), "Video URL must use HTTPS")
    .optional(),
  // Support both flat fields (for backward compatibility) and nested structure
  question: z.string()
    .min(10, 'Question must be at least 10 characters long')
    .refine(q => !q.includes("<script>"), "Question cannot contain script tags")
    .optional(),
  yesPosition: z.string()
    .min(50, 'Yes position argument must be at least 50 characters long')
    .refine(pos => !pos.includes("<script>"), "Position argument cannot contain script tags")
    .optional(),
  noPosition: z.string()
    .min(50, 'No position argument must be at least 50 characters long')
    .refine(pos => !pos.includes("<script>"), "Position argument cannot contain script tags")
    .optional(),
  votingEnabled: z.boolean().optional().default(true),
  votingEndsAt: z.string().datetime().optional(),
  // Nested debate settings (preferred structure)
  debateSettings: debateSettingsSchema.optional()
});

// Enhanced validation with support for both flat and nested debate structure
const baseArticleSchema = baseArticleSchemaObject.refine((data) => {
  if (data.articleType === 'video' && !data.videoUrl) {
    return false;
  }
  if (data.articleType === 'debate') {
    // Check if we have nested debateSettings or flat fields
    const hasNestedSettings = data.debateSettings && 
      data.debateSettings.question && 
      data.debateSettings.yesPosition && 
      data.debateSettings.noPosition;
    
    const hasFlatSettings = data.question && data.yesPosition && data.noPosition;
    
    if (!hasNestedSettings && !hasFlatSettings) {
      return false;
    }
  }
  return true;
}, {
  message: "Video URL is required for video articles, and debate question with both positions are required for debate articles",
  path: ["videoUrl", "question", "yesPosition", "noPosition", "debateSettings"]
});

// Schema for creating a new article
export const createArticleSchema = baseArticleSchema;

// Schema for updating an existing article
export const updateArticleSchema = baseArticleSchemaObject.partial().extend({
  id: uuidSchema
}).refine((data) => {
  if (data.articleType === 'video' && !data.videoUrl) {
    return false;
  }
  if (data.articleType === 'debate') {
    // Check if we have nested debateSettings or flat fields
    const hasNestedSettings = data.debateSettings && 
      data.debateSettings.question && 
      data.debateSettings.yesPosition && 
      data.debateSettings.noPosition;
    
    const hasFlatSettings = data.question && data.yesPosition && data.noPosition;
    
    if (!hasNestedSettings && !hasFlatSettings) {
      return false;
    }
  }
  return true;
}, {
  message: "Video URL is required for video articles, and debate question with both positions are required for debate articles",
  path: ["videoUrl", "question", "yesPosition", "noPosition", "debateSettings"]
});

// Schema for article status update
export const updateArticleStatusSchema = z.object({
  id: uuidSchema,
  status: ArticleStatusEnum
});

// Schema for debate article
export const debateArticleSchema = baseArticleSchemaObject.extend({
  articleType: z.literal('debate'),
  debateSettings: debateSettingsSchema
});

// Schema for video article
export const videoArticleSchema = baseArticleSchemaObject.extend({
  articleType: z.literal('video'),
  videoUrl: urlSchema
    .refine(url => url.startsWith('https://'), "Video URL must use HTTPS"),
  duration: z.number().int().positive().optional(),
  transcript: z.string()
    .refine(text => !text.includes("<script>"), "Transcript cannot contain script tags")
    .optional()
});

// Schema for storyboard article
export const storyboardArticleSchema = baseArticleSchemaObject.extend({
  articleType: z.literal('storyboard'),
  seriesId: uuidSchema,
  episodeNumber: z.number().int().positive()
});

// Schema for article deletion
export const deleteArticleSchema = z.object({
  id: uuidSchema
});

// Utility function to validate article
export const validateArticle = (article: any, logValidation = true): { isValid: boolean; errors: string[] } => {
  try {
    if (logValidation) {
      logger.info(LogSource.ARTICLE, "Validating article", { 
        hasTitle: !!article.title,
        hasContent: !!article.content,
        hasCategoryId: !!article.categoryId,
        contentLength: article.content?.length || 0,
        articleType: article.articleType,
        hasDebateSettings: !!article.debateSettings,
        hasNestedDebate: !!(article.debateSettings?.question),
        hasFlatDebate: !!(article.question)
      });
    }
    
    const result = createArticleSchema.safeParse(article);
    
    if (result.success) {
      if (logValidation) {
        logger.info(LogSource.ARTICLE, "Article validation successful");
      }
      return { isValid: true, errors: [] };
    } else {
      const errors = result.error.errors.map(err => err.message);
      if (logValidation) {
        logger.error(LogSource.ARTICLE, "Article validation failed", { 
          errors,
          errorDetails: result.error.errors
        });
      }
      return { isValid: false, errors };
    }
  } catch (error) {
    if (logValidation) {
      logger.error(LogSource.ARTICLE, "Article validation error", error);
    }
    return { isValid: false, errors: ["An unexpected error occurred during validation"] };
  }
};
