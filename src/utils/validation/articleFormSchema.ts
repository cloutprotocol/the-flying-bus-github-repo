
import { z } from 'zod';

export const articleFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  imageUrl: z.string().min(1, 'Featured image is required'),
  categoryId: z.string().min(1, 'Category is required'),
  slug: z.string().optional(),
  articleType: z.enum(['standard', 'video', 'debate', 'storyboard']),
  videoUrl: z.string().optional(),
  debateSettings: z.object({
    question: z.string(),
    yesPosition: z.string(),
    noPosition: z.string(),
    votingEnabled: z.boolean(),
    voting_ends_at: z.string().nullable()
  }).optional(),
  storyboardEpisodes: z.array(z.object({
    title: z.string(),
    description: z.string(),
    videoUrl: z.string(),
    thumbnailUrl: z.string(),
    duration: z.string(),
    number: z.number(),
    content: z.string()
  })).optional()
});

export type ArticleFormSchemaType = z.infer<typeof articleFormSchema>;
