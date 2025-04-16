
/**
 * Common Validation Utilities
 * Shared validation functions and helpers
 */

import { z } from 'zod';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

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
        LogSource.APP, 
        `Validation error in ${context}: ${JSON.stringify(error.errors)}`,
        { errors: error.errors }
      );
      return { isValid: false, data: null, errors: error };
    }
    
    // Log unexpected errors
    logger.error(
      LogSource.APP, 
      `Unexpected validation error in ${context}`,
      error
    );
    
    return { isValid: false, data: null, errors: null };
  }
};

/**
 * Convert Zod errors to a more user-friendly format for form display
 */
export const formatZodErrors = (error: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (path) {
      formattedErrors[path] = err.message;
    }
  });
  
  return formattedErrors;
};

/**
 * Validate data and format errors for display
 */
export const validateAndFormatErrors = <T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): { isValid: boolean; data: T | null; formErrors: Record<string, string> } => {
  const result = validateData(schema, data, context);
  
  return {
    isValid: result.isValid,
    data: result.data,
    formErrors: result.errors ? formatZodErrors(result.errors) : {}
  };
};

/**
 * Common validation schemas
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const slugSchema = z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');
export const urlSchema = z.string().url('Invalid URL format');
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, 'Invalid ISO date format');
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Client-side function to validate a form and provide feedback
 */
export const validateForm = <T>(
  schema: z.ZodType<T>,
  data: unknown,
  options?: { toast?: (message: string) => void; context?: string }
): { isValid: boolean; data: T | null; errors: Record<string, string> } => {
  const context = options?.context || 'form';
  const result = validateData(schema, data, context);
  
  if (!result.isValid && result.errors && options?.toast) {
    // Show error toast with first error message
    const firstError = result.errors.errors[0];
    options.toast(`Validation error: ${firstError.message}`);
  }
  
  return {
    isValid: result.isValid,
    data: result.data,
    errors: result.errors ? formatZodErrors(result.errors) : {}
  };
};
