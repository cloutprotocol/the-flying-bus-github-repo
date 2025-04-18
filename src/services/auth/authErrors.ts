
import { AuthErrorType } from '@/types/auth/AuthTypes';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

export const handleAuthError = (error: any): AuthErrorType => {
  logger.error(LogSource.AUTH, 'Authentication error occurred', error);
  
  return {
    message: error.message || 'An unexpected authentication error occurred',
    code: error.code
  };
};

export const createAuthResponse = (success: boolean, error?: any) => {
  if (!success && error) {
    return {
      success: false,
      error: handleAuthError(error)
    };
  }
  
  return { success: true };
};
