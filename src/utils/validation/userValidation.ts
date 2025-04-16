
/**
 * User Validation
 * Validation schemas for user-related operations
 */

import { z } from 'zod';
import { uuidSchema, urlSchema } from './validationUtils';

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
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters long').max(50, 'Display name is too long'),
  bio: z.string().max(500, 'Bio is too long').optional(),
  avatar: urlSchema.optional()
});

// Schema for creating/updating a profile
export const updateProfileSchema = baseProfileSchema;

// Schema for privacy settings
export const privacySettingsSchema = z.object({
  profileVisibility: ProfileVisibilityEnum.default('public'),
  showReadingActivity: z.boolean().default(true),
  showCommentHistory: z.boolean().default(true)
});

// Auth schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username: baseProfileSchema.shape.username
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const passwordUpdateSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});
