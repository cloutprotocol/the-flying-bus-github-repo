
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
  // Add missing form fields that components are trying to access
  status: z.enum(['draft', 'pending', 'published', 'rejected', 'archived']).default('draft'),
  publishDate: z.string().nullable().optional(),
  shouldHighlight: z.boolean().default(false),
  allowVoting: z.boolean().default(false),
  debateSettings: z.object({
    question: z.string(),
    yesPosition: z.string(),
    noPosition: z.string(),
    votingEnabled: z.boolean(),
    voting_ends_at: z.string().nullable()
  }).optional(),
  storyboardEpisodes: z.array(z.object({
    title: z.string().min(1, 'Episode title is required'),
    description: z.string().min(1, 'Episode description is required'),
    videoUrl: z.string().min(1, 'Episode video URL is required'),
    thumbnailUrl: z.string().min(1, 'Episode thumbnail URL is required'),
    duration: z.string().min(1, 'Episode duration is required'),
    number: z.number().min(1),
    content: z.string().min(1, 'Episode content is required')
  })).optional()
});

export type ArticleFormSchemaType = z.infer<typeof articleFormSchema>;
