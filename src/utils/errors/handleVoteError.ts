
/**
 * Vote error handling utilities
 * Functions to process and handle voting related errors
 */

import { ApiError, ApiErrorType } from './types';
import { handleApiError } from './index';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Handle vote-specific errors
 * @param error The original error
 * @param showToast Whether to show a toast notification
 * @returns ApiError for further handling
 */
export function handleVoteError(error: any, showToast = true): ApiError {
  // Log the error before processing
  logger.debug(LogSource.VOTING, 'Processing vote error', error);
  
  // Check for specific vote-related errors
  if (error?.message?.includes('already voted') || 
      error?.code === '23505' || // Unique constraint violation
      error?.code === 'P0001' && error?.message?.includes('vote')) {
    
    // Create a specialized ApiError for voting
    const apiError = new ApiError(
      'You have already voted on this item',
      ApiErrorType.VALIDATION,
      409, // Conflict status code
      { voteError: true }
    );
    
    // Use the general error handler but with our specific error
    return handleApiError(apiError, showToast);
  }
  
  // For other errors, use the standard error handler
  return handleApiError(error, showToast);
}
