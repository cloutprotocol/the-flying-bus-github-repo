
/**
 * Enhanced Validation Utilities
 * Advanced validation with sanitization for user input
 */

import { z } from 'zod';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { sanitizeHtml, sanitizeText, validateUrl, hasMaliciousContent } from '@/utils/security/sanitize';

/**
 * Create a sanitized string schema
 * @param options Configuration options for the schema
 * @returns A Zod schema for sanitized strings
 */
export const createSanitizedStringSchema = (options: {
  minLength?: number;
  maxLength?: number;
  fieldName: string;
  allowHtml?: boolean;
}) => {
  const { minLength = 1, maxLength = 1000, fieldName, allowHtml = false } = options;
  
  return z.string()
    .min(minLength, `${fieldName} must be at least ${minLength} characters`)
    .max(maxLength, `${fieldName} is too long (max ${maxLength} characters)`)
    .transform((val) => {
      // Log the transformation for debugging
      logger.debug(LogSource.VALIDATION, `Sanitizing ${fieldName}`, { length: val.length });
      
      // Apply appropriate sanitization based on whether HTML is allowed
      return allowHtml ? sanitizeHtml(val) : sanitizeText(val);
    })
    .refine((val) => !hasMaliciousContent(val), {
      message: `${fieldName} contains potentially malicious content`
    });
};

/**
 * Create a validated URL schema
 * @returns A Zod schema for validated URLs
 */
export const createValidUrlSchema = () => {
  return z.string()
    .transform((val) => validateUrl(val))
    .refine((val) => val !== null, {
      message: 'Please enter a valid URL (must start with http:// or https://)'
    });
};

/**
 * Validate and sanitize object data
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @param context Context description for logging
 * @returns Validation result with sanitized data
 */
export const validateAndSanitize = <T extends z.ZodType<any, any>>(
  schema: T,
  data: unknown,
  context: string
): { 
  isValid: boolean; 
  data: z.infer<T> | null; 
  errors: z.ZodError | null;
  sanitized: boolean;
} => {
  try {
    logger.debug(LogSource.VALIDATION, `Validating and sanitizing: ${context}`, {
      dataType: typeof data
    });
    
    // Use the schema to validate and transform the data
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { 
        isValid: true, 
        data: result.data, 
        errors: null,
        sanitized: true
      };
    } else {
      logger.warn(
        LogSource.VALIDATION, 
        `Validation failed for ${context}`,
        { errors: result.error.errors }
      );
      
      return { 
        isValid: false, 
        data: null, 
        errors: result.error,
        sanitized: false
      };
    }
  } catch (error) {
    logger.error(
      LogSource.VALIDATION, 
      `Unexpected validation error in ${context}`,
      error
    );
    
    return { 
      isValid: false, 
      data: null, 
      errors: null,
      sanitized: false
    };
  }
};

/**
 * Format Zod errors into user-friendly messages
 */
export const formatValidationErrors = (error: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (path) {
      formattedErrors[path] = err.message;
    } else {
      // Handle errors without a specific path
      formattedErrors['_general'] = err.message;
    }
  });
  
  return formattedErrors;
};
