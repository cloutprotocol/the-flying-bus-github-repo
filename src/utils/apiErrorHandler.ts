
import { toast } from '@/components/ui/use-toast';
import logger, { LogSource } from '@/utils/loggerService';

/**
 * API Error types
 */
export enum ApiErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  SERVER = 'server',
  NOTFOUND = 'not_found',
  UNKNOWN = 'unknown'
}

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  type: ApiErrorType;
  status?: number;
  details?: any;

  constructor(message: string, type: ApiErrorType, status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.details = details;
  }
}

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

/**
 * Display appropriate error message to user with toast
 */
export function showErrorToast(error: ApiError): void {
  let title = 'Error';
  let message = error.message;
  let variant: 'default' | 'destructive' = 'destructive';
  
  switch (error.type) {
    case ApiErrorType.NETWORK:
      title = 'Connection Error';
      break;
      
    case ApiErrorType.AUTH:
      title = 'Authentication Error';
      break;
      
    case ApiErrorType.VALIDATION:
      title = 'Validation Error';
      break;
      
    case ApiErrorType.NOTFOUND:
      title = 'Not Found';
      variant = 'default';
      break;
      
    case ApiErrorType.SERVER:
      title = 'Server Error';
      break;
  }
  
  toast({
    title,
    description: message,
    variant
  });
  
  // Log the error to our logger system
  const logLevel = error.type === ApiErrorType.UNKNOWN || 
                 error.type === ApiErrorType.SERVER ? 
                 'error' : 'warn';
                 
  logger[logLevel](
    LogSource.API,
    `${title}: ${message}`,
    {
      errorType: error.type,
      status: error.status,
      details: error.details
    }
  );
}

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
