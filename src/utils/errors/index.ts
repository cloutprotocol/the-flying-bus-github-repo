
/**
 * Error utilities
 * Central export for error handling functionality
 */

// Export all types
export * from './types';
export * from './processError';
export * from './displayError';

import { ApiError } from './types';
import { processSupabaseError } from './processError';
import { showErrorToast } from './displayError';

/**
 * Handle API errors consistently
 * @param error The error to handle
 * @param showToast Whether to show a toast notification
 * @returns Processed ApiError object
 */
export function handleApiError(error: any, showToast = true): ApiError {
  const apiError = error instanceof ApiError ? error : processSupabaseError(error);
  
  if (showToast) {
    showErrorToast(apiError);
  }
  
  return apiError;
}
