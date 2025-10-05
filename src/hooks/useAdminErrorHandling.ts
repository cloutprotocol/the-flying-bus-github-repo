import { useState, useCallback, useEffect } from 'react';
import { adminErrorHandler, AdminErrorState, AdminErrorHandlerOptions } from '@/services/adminErrorHandlingService';
import { ErrorContext } from '@/utils/userFriendlyErrors';
import { toast } from '@/hooks/use-toast';

export interface UseAdminErrorHandlingOptions extends AdminErrorHandlerOptions {
  sectionId: string;
  showToasts?: boolean;
  autoRetry?: boolean;
  autoRetryDelay?: number;
}

export interface UseAdminErrorHandlingReturn {
  errorState: AdminErrorState | null;
  hasError: boolean;
  canRetry: boolean;
  isRetrying: boolean;
  handleError: (error: any, context: ErrorContext) => void;
  clearError: () => void;
  retryOperation: <T>(operation: () => Promise<T>) => Promise<T>;
  executeWithErrorHandling: <T>(operation: () => Promise<T>, context: ErrorContext) => Promise<T | null>;
  refreshSection: () => void;
}

/**
 * Hook for handling errors in admin dashboard sections
 */
export function useAdminErrorHandling(options: UseAdminErrorHandlingOptions): UseAdminErrorHandlingReturn {
  const {
    sectionId,
    showToasts = false,
    autoRetry = false,
    autoRetryDelay = 5000,
    ...errorHandlerOptions
  } = options;

  const [errorState, setErrorState] = useState<AdminErrorState | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Update error state when it changes
  useEffect(() => {
    const currentState = adminErrorHandler.getErrorState(sectionId);
    setErrorState(currentState);
  }, [sectionId, refreshTrigger]);

  const handleError = useCallback((error: any, context: ErrorContext) => {
    const newErrorState = adminErrorHandler.handleError(sectionId, error, context, errorHandlerOptions);
    setErrorState(newErrorState);

    // Show toast notification if enabled
    if (showToasts && newErrorState.error) {
      toast({
        title: newErrorState.error.title,
        description: newErrorState.error.message,
        variant: "destructive",
      });
    }

    // Auto-retry if enabled and possible
    if (autoRetry && newErrorState.canRetry && autoRetryDelay > 0) {
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, autoRetryDelay);
    }
  }, [sectionId, errorHandlerOptions, showToasts, autoRetry, autoRetryDelay]);

  const clearError = useCallback(() => {
    adminErrorHandler.clearError(sectionId);
    setErrorState(null);
  }, [sectionId]);

  const retryOperation = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      const result = await adminErrorHandler.retryOperation(sectionId, operation, errorHandlerOptions);
      setErrorState(null);
      return result;
    } catch (error) {
      const currentState = adminErrorHandler.getErrorState(sectionId);
      setErrorState(currentState);
      throw error;
    }
  }, [sectionId, errorHandlerOptions]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T | null> => {
    try {
      clearError();
      const result = await adminErrorHandler.executeWithErrorHandling(
        sectionId,
        operation,
        context,
        errorHandlerOptions
      );
      return result;
    } catch (error) {
      const currentState = adminErrorHandler.getErrorState(sectionId);
      setErrorState(currentState);
      return null;
    }
  }, [sectionId, errorHandlerOptions, clearError]);

  const refreshSection = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return {
    errorState,
    hasError: errorState?.hasError || false,
    canRetry: errorState?.canRetry || false,
    isRetrying: errorState?.isRetrying || false,
    handleError,
    clearError,
    retryOperation,
    executeWithErrorHandling,
    refreshSection
  };
}

/**
 * Hook specifically for dashboard metrics with predefined error handling
 */
export function useAdminMetricsErrorHandling() {
  return useAdminErrorHandling({
    sectionId: 'dashboard-metrics',
    maxRetries: 3,
    retryDelay: 2000,
    showToasts: false, // Errors are shown inline
    logErrors: true
  });
}

/**
 * Hook specifically for activity feed with predefined error handling
 */
export function useAdminActivityErrorHandling() {
  return useAdminErrorHandling({
    sectionId: 'activity-feed',
    maxRetries: 3,
    retryDelay: 1500,
    showToasts: false, // Errors are shown inline
    logErrors: true
  });
}

/**
 * Hook specifically for recent articles with predefined error handling
 */
export function useAdminArticlesErrorHandling() {
  return useAdminErrorHandling({
    sectionId: 'recent-articles',
    maxRetries: 2,
    retryDelay: 2000,
    showToasts: false, // Errors are shown inline
    logErrors: true
  });
}

export default useAdminErrorHandling;