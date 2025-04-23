
/**
 * Article Validation
 * Validation schemas for article-related operations
 */

import { z } from 'zod';
import { uuidSchema, slugSchema, urlSchema } from './validationUtils';

// Article status enum
export const ArticleStatusEnum = z.enum([
  'draft', 
  'pending', 
  'published', 
  'archived'
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

// Base article schema with common fields
const baseArticleSchema = z.object({
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
});

// Schema for creating a new article
export const createArticleSchema = baseArticleSchema;

// Schema for updating an existing article
export const updateArticleSchema = baseArticleSchema.partial().extend({
  id: uuidSchema
});

// Schema for article status update
export const updateArticleStatusSchema = z.object({
  id: uuidSchema,
  status: ArticleStatusEnum
});

// Schema for debate article
export const debateArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('debate'),
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
  votingEndsAt: z.string().datetime().optional()
});

// Schema for video article
export const videoArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('video'),
  videoUrl: urlSchema
    .refine(url => url.startsWith('https://'), "Video URL must use HTTPS"),
  duration: z.number().int().positive().optional(),
  transcript: z.string()
    .refine(text => !text.includes("<script>"), "Transcript cannot contain script tags")
    .optional()
});

// Schema for storyboard article
export const storyboardArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('storyboard'),
  seriesId: uuidSchema,
  episodeNumber: z.number().int().positive()
});

// Schema for article deletion
export const deleteArticleSchema = z.object({
  id: uuidSchema
});
