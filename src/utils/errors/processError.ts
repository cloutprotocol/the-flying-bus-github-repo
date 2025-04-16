
/**
 * Error processing utilities
 * Functions to process and convert different error types
 */

import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from './types';

/**
 * Process Supabase error and convert to ApiError
 */
export function processSupabaseError(error: any): ApiError {
  // Log the raw error
  logger.debug(LogSource.API, 'Processing Supabase error', error);
  
  if (!error) {
    return new ApiError('Unknown error occurred', ApiErrorType.UNKNOWN);
  }
  
  // Network errors
  if (error.message?.includes('Failed to fetch') || error.code === 'NETWORK_ERROR') {
    return new ApiError(
      'Network connection error. Please check your internet connection.',
      ApiErrorType.NETWORK
    );
  }
  
  // Authentication errors
  if (error.code === 'PGRST301' || error.status === 401 || error.message?.includes('JWT')) {
    return new ApiError(
      'Authentication error. Please sign in again.',
      ApiErrorType.AUTH,
      401
    );
  }
  
  // Not found errors
  if (error.code === 'PGRST116' || error.status === 404) {
    return new ApiError(
      'The requested resource was not found.',
      ApiErrorType.NOTFOUND,
      404
    );
  }
  
  // Validation errors
  if (error.code === 'PGRST109' || error.code === '23502' || error.code === '23503') {
    return new ApiError(
      'Validation error. Please check your input.',
      ApiErrorType.VALIDATION,
      400,
      error.details
    );
  }
  
  // Server errors
  if (error.status >= 500) {
    return new ApiError(
      'Server error. Please try again later.',
      ApiErrorType.SERVER,
      error.status
    );
  }
  
  // Default error
  return new ApiError(
    error.message || 'An error occurred',
    ApiErrorType.UNKNOWN,
    error.status
  );
}
