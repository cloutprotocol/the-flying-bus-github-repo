
/**
 * Common Validation Utilities
 * Shared validation functions and helpers
 */

import { z } from 'zod';
import logger, { LogSource } from '@/utils/logger';

/**
 * Try to validate data against a schema, returning the validated data or null if validation fails
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
      // Log validation errors
      logger.warn(
        LogSource.CLIENT, 
        `Validation error in ${context}: ${JSON.stringify(error.errors)}`,
        { errors: error.errors }
      );
      return { isValid: false, data: null, errors: error };
    }
    
    // Log unexpected errors
    logger.error(
      LogSource.CLIENT, 
      `Unexpected validation error in ${context}`,
      error
    );
    
    return { isValid: false, data: null, errors: null };
  }
};

/**
 * Common validation schemas
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const slugSchema = z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');
export const urlSchema = z.string().url('Invalid URL format');
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, 'Invalid ISO date format');
