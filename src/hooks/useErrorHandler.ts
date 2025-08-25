import { useState, useCallback } from 'react';
import { formatErrorForUser, logError, withRetry, RetryConfig } from '@/utils/errorHandling';
import { toast } from '@/hooks/use-toast';

export interface ErrorState {
  hasError: boolean;
  error?: any;
  message?: string;
  code?: string;
  recoveryActions?: string[];
  canRetry: boolean;
}

export interface UseErrorHandlerOptions {
  showToast?: boolean;
  logErrors?: boolean;
  retryConfig?: Partial<RetryConfig>;
}

/**
 * Hook for comprehensive error handling in React components
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, logErrors = true, retryConfig } = options;
  
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    canRetry: false
  });

  const handleError = useCallback((error: any, context?: Record<string, any>) => {
    if (logErrors) {
      logError(error, context);
    }

    const formattedError = formatErrorForUser(error);
    
    const newErrorState: ErrorState = {
      hasError: true,
      error,
      message: formattedError.message,
      code: formattedError.code,
      recoveryActions: formattedError.recoveryActions,
      canRetry: formattedError.canRetry
    };

    setErrorState(newErrorState);

    if (showToast) {
      toast({
        title: "Error",
        description: formattedError.message,
        variant: "destructive",
      });
    }

    return newErrorState;
  }, [showToast, logErrors]);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      canRetry: false
    });
  }, []);

  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> => {
    clearError();
    
    try {
      const result = await withRetry(operation, { ...retryConfig, ...customRetryConfig });
      return result;
    } catch (error) {
      handleError(error);
      throw error;
    }
  }, [handleError, clearError, retryConfig]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T | null> => {
    clearError();
    
    try {
      const result = await operation();
      return result;
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [handleError, clearError]);

  return {
    errorState,
    handleError,
    clearError,
    retryOperation,
    executeWithErrorHandling,
    hasError: errorState.hasError,
    canRetry: errorState.canRetry
  };
}

/**
 * Hook specifically for email operations with predefined error handling
 */
export function useEmailErrorHandler() {
  const errorHandler = useErrorHandler({
    showToast: true,
    logErrors: true,
    retryConfig: {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 10000
    }
  });

  const sendEmailWithRetry = useCallback(async (
    emailOperation: () => Promise<any>,
    context?: Record<string, any>
  ) => {
    return errorHandler.retryOperation(emailOperation);
  }, [errorHandler]);

  return {
    ...errorHandler,
    sendEmailWithRetry
  };
}

/**
 * Hook specifically for token operations with predefined error handling
 */
export function useTokenErrorHandler() {
  const errorHandler = useErrorHandler({
    showToast: true,
    logErrors: true,
    retryConfig: {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 5000
    }
  });

  const validateTokenWithRetry = useCallback(async (
    tokenOperation: () => Promise<any>,
    context?: Record<string, any>
  ) => {
    return errorHandler.executeWithErrorHandling(tokenOperation, context);
  }, [errorHandler]);

  return {
    ...errorHandler,
    validateTokenWithRetry
  };
}

/**
 * Hook for invitation operations with predefined error handling
 */
export function useInvitationErrorHandler() {
  const errorHandler = useErrorHandler({
    showToast: true,
    logErrors: true,
    retryConfig: {
      maxAttempts: 3,
      baseDelay: 1500,
      maxDelay: 8000
    }
  });

  const processInvitationWithRetry = useCallback(async (
    invitationOperation: () => Promise<any>,
    context?: Record<string, any>
  ) => {
    return errorHandler.retryOperation(invitationOperation);
  }, [errorHandler]);

  return {
    ...errorHandler,
    processInvitationWithRetry
  };
}