
/**
 * Enhanced Comment Validation
 * Improved validation with security measures for comments
 */

import { z } from 'zod';
import { createSanitizedStringSchema } from './enhancedValidation';
import { uuidSchema } from './validationUtils';

// Comment status enum
export const CommentStatusEnum = z.enum([
  'pending',
  'published',
  'rejected',
  'flagged'
]);

// Base comment schema with enhanced security
export const enhancedCommentSchema = z.object({
  content: createSanitizedStringSchema({
    minLength: 1,
    maxLength: 1000,
    fieldName: 'Comment',
    allowHtml: false
  }),
  articleId: z.string(),
  parentId: uuidSchema.optional(),
  status: CommentStatusEnum.optional().default('published')
});

// Schema for creating a new comment
export const createEnhancedCommentSchema = enhancedCommentSchema;

// Schema for updating an existing comment
export const updateEnhancedCommentSchema = z.object({
  id: uuidSchema,
  content: createSanitizedStringSchema({
    minLength: 1,
    maxLength: 1000,
    fieldName: 'Comment',
    allowHtml: false
  })
});

// Schema for comment status update (for moderation)
export const updateEnhancedCommentStatusSchema = z.object({
  id: uuidSchema,
  status: CommentStatusEnum,
  moderationReason: z.string().max(500).optional().transform(val => val ? val.trim() : '')
});

// Schema for liking a comment
export const likeEnhancedCommentSchema = z.object({
  commentId: uuidSchema
});

// Schema for reporting/flagging a comment with enhanced security
export const reportEnhancedCommentSchema = z.object({
  commentId: uuidSchema,
  reason: createSanitizedStringSchema({
    minLength: 3,
    maxLength: 500,
    fieldName: 'Report reason',
    allowHtml: false
  })
});
