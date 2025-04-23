
import { z } from 'zod';

// Schema for required article fields when submitting for review
export const requiredArticleFieldsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category_id: z.string().uuid("Category ID must be a valid UUID"),
});

export const validateArticleFields = (article: any) => {
  return requiredArticleFieldsSchema.parse(article);
};
