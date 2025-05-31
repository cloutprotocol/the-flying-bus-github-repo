
import { z } from 'zod';

// Base fields shared by all article types
const baseFieldsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt is too long').optional(),
  imageUrl: z.string().url('Please enter a valid image URL').optional(),
  categoryId: z.string().min(1, 'Category is required'),
  slug: z.string().optional(),
  status: z.enum(['draft', 'pending', 'published', 'rejected', 'archived']).optional().default('draft'),
  publishDate: z.string().nullable().optional(),
  shouldHighlight: z.boolean().optional().default(false),
  allowVoting: z.boolean().optional().default(false)
});

// Standard Article Schema - just the base fields
export const standardArticleSchema = baseFieldsSchema.extend({
  articleType: z.literal('standard')
});

// Video Article Schema - adds video URL
export const videoArticleSchema = baseFieldsSchema.extend({
  articleType: z.literal('video'),
  videoUrl: z.string().url('Please enter a valid video URL').min(1, 'Video URL is required')
});

// Debate Article Schema - adds debate settings, makes content optional
export const debateArticleSchema = baseFieldsSchema.extend({
  articleType: z.literal('debate'),
  content: z.string().optional(), // Content is optional for debates
  debateSettings: z.object({
    question: z.string().min(10, 'Question must be at least 10 characters'),
    yesPosition: z.string().min(20, 'Yes position must be at least 20 characters'),
    noPosition: z.string().min(20, 'No position must be at least 20 characters'),
    votingEnabled: z.boolean().default(true),
    voting_ends_at: z.string().nullable().optional()
  })
});

// Storyboard Episode Schema - make required fields actually required
const storyboardEpisodeSchema = z.object({
  title: z.string().min(1, 'Episode title is required'),
  description: z.string().optional().default(''),
  videoUrl: z.string().url().optional().default(''),
  thumbnailUrl: z.string().url().optional().default(''),
  duration: z.string().optional().default(''),
  number: z.number().int().positive(),
  content: z.string().optional().default('')
});

// Storyboard Article Schema - adds episodes
export const storyboardArticleSchema = baseFieldsSchema.extend({
  articleType: z.literal('storyboard'),
  storyboardEpisodes: z.array(storyboardEpisodeSchema).min(1, 'At least one episode is required')
});

// Type definitions for each form
export type StandardArticleFormData = z.infer<typeof standardArticleSchema>;
export type VideoArticleFormData = z.infer<typeof videoArticleSchema>;
export type DebateArticleFormData = z.infer<typeof debateArticleSchema>;
export type StoryboardArticleFormData = z.infer<typeof storyboardArticleSchema>;

// Union type for all form data
export type ArticleFormDataUnion = 
  | StandardArticleFormData 
  | VideoArticleFormData 
  | DebateArticleFormData 
  | StoryboardArticleFormData;
