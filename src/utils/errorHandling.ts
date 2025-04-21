
import { ApiError, ApiErrorType } from './errors/types';
import { showErrorToast } from './errors/displayError';
import { logger } from './logger';
import { LogSource } from './logger/types';
import React from 'react';

/**
 * Global error handler for async operations
 * @param operation The function to execute
 * @param options Configuration options for error handling
 * @returns Result of the operation
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    onError?: (error: any) => void;
    errorMessage?: string;
    showToast?: boolean;
    logSource?: LogSource;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<{ data?: T; error?: ApiError }> {
  const {
    onError,
    errorMessage = 'An error occurred',
    showToast = true,
    logSource = LogSource.APP,
    retries = 0,
    retryDelay = 1000
  } = options;
  
  let lastError: any;
  let retryCount = 0;
  
  while (retryCount <= retries) {
    try {
      if (retryCount > 0) {
        logger.info(logSource, `Retrying operation (${retryCount}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      const result = await operation();
      return { data: result };
    } catch (error: any) {
      lastError = error;
      
      logger.error(
        logSource,
        `Error in operation${retryCount > 0 ? ` (retry ${retryCount}/${retries})` : ''}`, 
        error
      );
      
      retryCount++;
      
      if (retryCount > retries) break;
    }
  }
  
  // Convert to ApiError if needed
  const apiError = lastError instanceof ApiError
    ? lastError
    : new ApiError(
        errorMessage || lastError?.message || 'Unknown error',
        ApiErrorType.UNKNOWN,
        undefined,
        lastError
      );
  
  // Call custom error handler
  if (onError) onError(apiError);
  
  // Show toast notification if enabled
  if (showToast) showErrorToast(apiError);
  
  return { error: apiError };
}

/**
 * HOC to wrap a component with error handling
 * @param Component The component to wrap
 * @returns Wrapped component with error handling
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  const ErrorBoundaryWrapper: React.FC<P> = (props) => {
    const ErrorBoundary = require('@/components/ErrorBoundary/ErrorBoundary').default as React.ComponentType<{ component: string, children: React.ReactNode }>;

    return (
      <ErrorBoundary component={Component.displayName || Component.name || 'Unknown'}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  return ErrorBoundaryWrapper;
}
