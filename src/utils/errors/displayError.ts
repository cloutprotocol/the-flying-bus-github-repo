
/**
 * Error display utilities
 * Functions to display errors to users
 */

import { toast } from '@/components/ui/use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from './types';

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
