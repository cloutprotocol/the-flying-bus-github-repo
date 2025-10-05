import { useState, useCallback, useRef, useEffect } from 'react';

export interface FeedbackState {
  type: 'error' | 'success' | 'loading' | 'info' | null;
  title?: string;
  message: string;
  details?: string;
  showRetry?: boolean;
  retryLabel?: string;
  showProgress?: boolean;
  progress?: number;
  estimatedTime?: string;
  nextSteps?: string[];
}

export interface UseUserFeedbackReturn {
  feedback: FeedbackState | null;
  showError: (message: string, options?: Partial<FeedbackState>) => void;
  showSuccess: (message: string, options?: Partial<FeedbackState>) => void;
  showLoading: (message: string, options?: Partial<FeedbackState>) => void;
  showInfo: (message: string, options?: Partial<FeedbackState>) => void;
  updateProgress: (progress: number, estimatedTime?: string) => void;
  clearFeedback: () => void;
  retry: () => void;
  setRetryHandler: (handler: () => void) => void;
}

export const useUserFeedback = (): UseUserFeedbackReturn => {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const retryHandlerRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showFeedback = useCallback((
    type: 'error' | 'success' | 'loading' | 'info',
    message: string,
    options: Partial<FeedbackState> = {}
  ) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setFeedback({
      type,
      message,
      ...options
    });

    // Auto-clear success messages after 5 seconds
    if (type === 'success') {
      timeoutRef.current = setTimeout(() => {
        clearFeedback();
      }, 5000);
    }
  }, [clearFeedback]);

  const showError = useCallback((message: string, options: Partial<FeedbackState> = {}) => {
    showFeedback('error', message, options);
  }, [showFeedback]);

  const showSuccess = useCallback((message: string, options: Partial<FeedbackState> = {}) => {
    showFeedback('success', message, options);
  }, [showFeedback]);

  const showLoading = useCallback((message: string, options: Partial<FeedbackState> = {}) => {
    showFeedback('loading', message, options);
  }, [showFeedback]);

  const showInfo = useCallback((message: string, options: Partial<FeedbackState> = {}) => {
    showFeedback('info', message, options);
  }, [showFeedback]);

  const updateProgress = useCallback((progress: number, estimatedTime?: string) => {
    setFeedback(prev => {
      if (!prev || prev.type !== 'loading') return prev;
      return {
        ...prev,
        progress,
        estimatedTime
      };
    });
  }, []);

  const setRetryHandler = useCallback((handler: () => void) => {
    retryHandlerRef.current = handler;
  }, []);

  const retry = useCallback(() => {
    if (retryHandlerRef.current) {
      retryHandlerRef.current();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    feedback,
    showError,
    showSuccess,
    showLoading,
    showInfo,
    updateProgress,
    clearFeedback,
    retry,
    setRetryHandler
  };
};