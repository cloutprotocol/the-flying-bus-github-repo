
import { z } from 'zod';

// Base schema with common fields - more forgiving validation
const baseArticleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  categoryId: z.string().min(1, 'Category is required'),
  imageUrl: z.string().min(1, 'Featured image is required'),
  excerpt: z.string().optional(),
  slug: z.string().optional(),
  status: z.enum(['draft', 'pending', 'published', 'rejected', 'archived']).default('draft'),
  publishDate: z.string().nullable().optional(),
  shouldHighlight: z.boolean().default(false),
  allowVoting: z.boolean().default(false),
});

// Standard article schema - clean and simple
const standardArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('standard'),
  content: z.string().min(1, 'Content is required'),
});

// Video article schema - adds videoUrl
const videoArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('video'),
  content: z.string().min(1, 'Content is required'),
  videoUrl: z.string().min(1, 'Video URL is required'),
});

// Debate article schema - more forgiving for content
const debateArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('debate'),
  content: z.string().optional(), // Content is optional for debates
  debateSettings: z.object({
    question: z.string().min(1, 'Debate question is required'),
    yesPosition: z.string().min(1, 'Yes position is required'),
    noPosition: z.string().min(1, 'No position is required'),
    votingEnabled: z.boolean().default(true),
    voting_ends_at: z.string().nullable().optional()
  }).optional(),
});

// Storyboard article schema
const storyboardArticleSchema = baseArticleSchema.extend({
  articleType: z.literal('storyboard'),
  content: z.string().min(1, 'Series description is required'),
  storyboardEpisodes: z.array(z.object({
    title: z.string().min(1, 'Episode title is required'),
    description: z.string().min(1, 'Episode description is required'),
    videoUrl: z.string().min(1, 'Episode video URL is required'),
    thumbnailUrl: z.string().min(1, 'Episode thumbnail URL is required'),
    duration: z.string().min(1, 'Episode duration is required'),
    number: z.number().min(1),
    content: z.string().min(1, 'Episode content is required')
  })).min(1, 'At least one episode is required for storyboard articles').optional(),
});

// Main discriminated union schema - clean separation by type
export const articleFormSchema = z.discriminatedUnion('articleType', [
  standardArticleSchema,
  videoArticleSchema,
  debateArticleSchema,
  storyboardArticleSchema
]);

export type ArticleFormSchemaType = z.infer<typeof articleFormSchema>;

// Debug function to help with validation issues
export const debugValidation = (data: any) => {
  console.log('Debugging validation for data:', data);
  const result = articleFormSchema.safeParse(data);
  if (!result.success) {
    console.log('Validation errors:', result.error.format());
  }
  return result;
};
