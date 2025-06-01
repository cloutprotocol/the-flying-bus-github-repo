
import { z } from 'zod';

// Base schema with common fields
const baseArticleSchema = z.object({
  id: z.string().optional(), // Add id field for updates
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  imageUrl: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  slug: z.string().optional(),
  status: z.enum(['draft', 'pending_review', 'published']).default('draft'),
  publishDate: z.date().nullable().optional(),
  shouldHighlight: z.boolean().default(false), // Featured field
  allowVoting: z.boolean().default(false)
});

// Standard Article Schema
export const standardArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('standard').default('standard')
});

// Video Article Schema
export const videoArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('video').default('video'),
  videoUrl: z.string().min(1, 'Video URL is required'),
  content: z.string().optional() // Content is optional for videos
});

// Debate Article Schema
export const debateArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('debate').default('debate'),
  debateSettings: z.object({
    question: z.string().min(1, 'Debate question is required'),
    yesPosition: z.string().min(1, 'Yes position is required'),
    noPosition: z.string().min(1, 'No position is required'),
    votingEnabled: z.boolean().default(true),
    voting_ends_at: z.date().nullable().optional()
  })
});

// Storyboard Article Schema
export const storyboardArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('storyboard').default('storyboard'),
  storyboardEpisodes: z.array(z.object({
    title: z.string().min(1, 'Episode title is required'),
    description: z.string().optional(),
    videoUrl: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    duration: z.string().optional(),
    number: z.number().min(1),
    content: z.string().optional()
  })).optional(),
  content: z.string().optional() // Content is optional for storyboards
});

// Export types
export type StandardArticleFormData = z.infer<typeof standardArticleSchema>;
export type VideoArticleFormData = z.infer<typeof videoArticleSchema>;
export type DebateArticleFormData = z.infer<typeof debateArticleSchema>;
export type StoryboardArticleFormData = z.infer<typeof storyboardArticleSchema>;
