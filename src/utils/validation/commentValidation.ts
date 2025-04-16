
/**
 * Comment Validation
 * Validation schemas for comment-related operations
 */

import { z } from 'zod';
import { uuidSchema } from './validationUtils';

// Comment status enum
export const CommentStatusEnum = z.enum([
  'pending',
  'published',
  'rejected',
  'flagged'
]);

// Base comment schema
const baseCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment is too long')
    .refine(content => !content.includes("<script>"), "Comment cannot contain script tags"),
  articleId: z.string(),
  parentId: uuidSchema.optional(),
  status: CommentStatusEnum.optional().default('published')
});

// Schema for creating a new comment
export const createCommentSchema = baseCommentSchema;

// Schema for updating an existing comment
export const updateCommentSchema = z.object({
  id: uuidSchema,
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment is too long')
    .refine(content => !content.includes("<script>"), "Comment cannot contain script tags")
});

// Schema for comment status update (for moderation)
export const updateCommentStatusSchema = z.object({
  id: uuidSchema,
  status: CommentStatusEnum,
  moderationReason: z.string().max(500).optional()
});

// Schema for liking a comment
export const likeCommentSchema = z.object({
  commentId: uuidSchema
});

// Schema for reporting/flagging a comment
export const reportCommentSchema = z.object({
  commentId: uuidSchema,
  reason: z.string()
    .min(3, 'Reason is required')
    .max(500, 'Reason is too long')
    .refine(reason => !reason.includes("<script>"), "Report reason cannot contain script tags")
});
