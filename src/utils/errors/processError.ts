
/**
 * Error processing utilities
 * Functions to process and convert different error types
 */

import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from './types';

/**
 * Normalize an unknown error into an ApiError
 */
export function processApiError(error: any): ApiError {
  // Log the raw error
  logger.debug(LogSource.API, 'Processing API error', error);
  
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
  if (error.status === 401 || error.message?.toLowerCase()?.includes('unauthorized')) {
    return new ApiError(
      'Authentication error. Please sign in again.',
      ApiErrorType.AUTH,
      401
    );
  }
  
  // Not found errors
  if (error.status === 404) {
    return new ApiError(
      'The requested resource was not found.',
      ApiErrorType.NOTFOUND,
      404
    );
  }
  
  // Validation errors (generic)
  if (error.code === 'VALIDATION_ERROR' || error.status === 400) {
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
