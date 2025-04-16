
/**
 * API Error Handler
 * 
 * This file is maintained for backward compatibility.
 * New code should import directly from @/utils/errors/index.
 */

// Re-export everything from the new error handling structure
export { ApiErrorType, ApiError } from './errors/types';
export { processSupabaseError } from './errors/processError';
export { showErrorToast } from './errors/displayError';
export { handleApiError } from './errors/index';
