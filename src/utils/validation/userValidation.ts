
/**
 * User Validation
 * Validation schemas for user-related operations
 */

import { z } from 'zod';
import { uuidSchema, urlSchema, emailSchema, passwordSchema } from './validationUtils';

// User role enum
export const UserRoleEnum = z.enum([
  'reader',
  'author',
  'moderator',
  'admin'
]);

// Profile visibility enum
export const ProfileVisibilityEnum = z.enum([
  'public',
  'private',
  'friends_only'
]);

// Base profile schema
const baseProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .refine(name => !name.includes("<script>"), "Username cannot contain script tags"),
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters long')
    .max(50, 'Display name is too long')
    .refine(name => !name.includes("<script>"), "Display name cannot contain script tags"),
  bio: z.string()
    .max(500, 'Bio is too long')
    .refine(bio => !bio || !bio.includes("<script>"), "Bio cannot contain script tags")
    .optional(),
  avatar: urlSchema
    .refine(url => url.startsWith('https://'), "Avatar URL must use HTTPS")
    .optional()
});

// Schema for creating/updating a profile
export const updateProfileSchema = baseProfileSchema;

// Schema for privacy settings
export const privacySettingsSchema = z.object({
  profileVisibility: ProfileVisibilityEnum.default('public'),
  showReadingActivity: z.boolean().default(true),
  showCommentHistory: z.boolean().default(true),
  contentPreferences: z.array(z.string()).optional()
});

// Auth schemas
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  username: baseProfileSchema.shape.username,
  displayName: baseProfileSchema.shape.displayName,
  acceptTerms: z.boolean().refine(val => val === true, "You must accept the terms and conditions")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const parentApprovalSchema = z.object({
  childUserId: uuidSchema,
  parentEmail: emailSchema,
  parentName: z.string().min(2, 'Parent name is required'),
  relationshipToChild: z.string().min(2, 'Relationship is required'),
  approvalCode: z.string().min(6, 'Approval code must be at least 6 characters'),
  approved: z.boolean().default(false)
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const passwordResetSchema = z.object({
  email: emailSchema
});

export const passwordUpdateSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
