
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
 * Validate article data before database operations
 */
export const validateArticle = (articleData: unknown) => {
  return validateData(schemas.createArticleSchema, articleData, 'article_creation');
};

/**
 * Validate article update data
 */
export const validateArticleUpdate = (articleData: unknown) => {
  return validateData(schemas.updateArticleSchema, articleData, 'article_update');
};

/**
 * Validate comment data before database operations
 */
export const validateComment = (commentData: unknown) => {
  return validateData(schemas.createCommentSchema, commentData, 'comment_creation');
};

/**
 * Validate user profile data before database operations
 */
export const validateUserProfile = (profileData: unknown) => {
  return validateData(schemas.updateProfileSchema, profileData, 'profile_update');
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
