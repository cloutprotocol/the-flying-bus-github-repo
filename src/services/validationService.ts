
/**
 * Validation Service
 * Centralized service for validating data on the server-side
 */

import { z } from 'zod';
import { LogSource } from '@/utils/logger';
import logger from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import * as schemas from '@/utils/validation';

/**
 * Validate data against a schema and handle errors consistently
 */
export const validateData = <T>(
  schema: z.ZodType<T>, 
  data: unknown, 
  context: string
): { isValid: boolean; data: T | null; errors: z.ZodError | null } => {
  try {
    const validatedData = schema.parse(data);
    return { isValid: true, data: validatedData, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(
        LogSource.DATABASE, 
        `Server validation error in ${context}: ${JSON.stringify(error.errors)}`,
        { errors: error.errors }
      );
      return { isValid: false, data: null, errors: error };
    }
    
    logger.error(
      LogSource.DATABASE, 
      `Unexpected server validation error in ${context}`,
      error
    );
    
    return { isValid: false, data: null, errors: null };
  }
};

/**
 * Sanitize content to remove potentially malicious content
 */
export const sanitizeContent = (content: string): string => {
  // Basic sanitization - replace script tags
  const sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, 'removed:')
    .replace(/onerror=/gi, 'data-removed=')
    .replace(/onclick=/gi, 'data-removed=');
  
  return sanitized;
};

/**
 * Validate article data before database operations
 * Also sanitizes content for security
 */
export const validateArticle = (articleData: unknown) => {
  const result = validateData(schemas.createArticleSchema, articleData, 'article_creation');
  
  // If valid, sanitize the content fields
  if (result.isValid && result.data) {
    result.data.title = sanitizeContent(result.data.title);
    result.data.content = sanitizeContent(result.data.content);
    if (result.data.excerpt) {
      result.data.excerpt = sanitizeContent(result.data.excerpt);
    }
  }
  
  return result;
};

/**
 * Validate article update data
 */
export const validateArticleUpdate = (articleData: unknown) => {
  const result = validateData(schemas.updateArticleSchema, articleData, 'article_update');
  
  // If valid, sanitize the content fields
  if (result.isValid && result.data) {
    if (result.data.title) {
      result.data.title = sanitizeContent(result.data.title);
    }
    if (result.data.content) {
      result.data.content = sanitizeContent(result.data.content);
    }
    if (result.data.excerpt) {
      result.data.excerpt = sanitizeContent(result.data.excerpt);
    }
  }
  
  return result;
};

/**
 * Validate comment data before database operations
 */
export const validateComment = (commentData: unknown) => {
  const result = validateData(schemas.createCommentSchema, commentData, 'comment_creation');
  
  // If valid, sanitize the content
  if (result.isValid && result.data) {
    result.data.content = sanitizeContent(result.data.content);
  }
  
  return result;
};

/**
 * Validate comment update data
 */
export const validateCommentUpdate = (commentData: unknown) => {
  const result = validateData(schemas.updateCommentSchema, commentData, 'comment_update');
  
  // If valid, sanitize the content
  if (result.isValid && result.data) {
    result.data.content = sanitizeContent(result.data.content);
  }
  
  return result;
};

/**
 * Validate user profile data before database operations
 */
export const validateUserProfile = (profileData: unknown) => {
  const result = validateData(schemas.updateProfileSchema, profileData, 'profile_update');
  
  // If valid, sanitize text fields
  if (result.isValid && result.data) {
    if (result.data.displayName) {
      result.data.displayName = sanitizeContent(result.data.displayName);
    }
    if (result.data.bio) {
      result.data.bio = sanitizeContent(result.data.bio);
    }
  }
  
  return result;
};

/**
 * Check if username is available
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', username);
      
    if (error) {
      logger.error(LogSource.DATABASE, 'Error checking username availability', error);
      return false;
    }
    
    return count === 0;
  } catch (error) {
    logger.error(LogSource.DATABASE, 'Exception checking username availability', error);
    return false;
  }
};
