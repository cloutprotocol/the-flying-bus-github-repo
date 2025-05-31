
import { z } from 'zod';

// Base schema for common article fields
const baseArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  imageUrl: z.string().url('Please provide a valid image URL').optional().or(z.literal('')),
  categoryId: z.string().min(1, 'Category is required'),
  slug: z.string().optional(), // Auto-generated, not user-editable
  articleType: z.enum(['standard', 'video', 'debate', 'storyboard']),
  status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'archived']).optional(),
  publishDate: z.string().nullable().optional(),
  shouldHighlight: z.boolean().optional(),
  allowVoting: z.boolean().optional()
});

// Standard article schema
export const standardArticleSchema = baseArticleSchema;
export type StandardArticleFormData = z.infer<typeof standardArticleSchema>;

// Video article schema
export const videoArticleSchema = baseArticleSchema.extend({
  videoUrl: z.string().url('Please provide a valid video URL'),
  articleType: z.literal('video')
});
export type VideoArticleFormData = z.infer<typeof videoArticleSchema>;

// Debate settings schema
const debateSettingsSchema = z.object({
  question: z.string().min(1, 'Debate question is required'),
  yesPosition: z.string().min(1, 'Yes position is required'),
  noPosition: z.string().min(1, 'No position is required'),
  votingEnabled: z.boolean().default(true),
  voting_ends_at: z.string().nullable().optional()
});

// Debate article schema
export const debateArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('debate'),
  debateSettings: debateSettingsSchema,
  content: z.string().optional() // Content is optional for debate articles
});
export type DebateArticleFormData = z.infer<typeof debateArticleSchema>;

// Storyboard episode schema
const storyboardEpisodeSchema = z.object({
  title: z.string().min(1, 'Episode title is required'),
  description: z.string().optional(),
  videoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duration: z.string().optional(),
  number: z.number().min(1),
  content: z.string().optional()
});

// Storyboard article schema
export const storyboardArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('storyboard'),
  storyboardEpisodes: z.array(storyboardEpisodeSchema).min(1, 'At least one episode is required')
});
export type StoryboardArticleFormData = z.infer<typeof storyboardArticleSchema>;
