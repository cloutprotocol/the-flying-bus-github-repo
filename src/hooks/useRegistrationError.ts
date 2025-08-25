import React, { useState, useCallback, useRef } from 'react';
import { 
  RegistrationErrorDetails, 
  RegistrationErrorContext,
  FormValidationResult,
  FormFieldError,
  RegistrationErrorCode
} from '@/types/RegistrationErrorTypes';
import { registrationErrorHandler } from '@/services/registrationErrorHandler';

interface UseRegistrationErrorOptions {
  onError?: (error: RegistrationErrorDetails) => void;
  onRetry?: () => void;
  autoRetry?: boolean;
  maxAutoRetries?: number;
}

interface UseRegistrationErrorReturn {
  error: RegistrationErrorDetails | null;
  isRetrying: boolean;
  retryCount: number;
  setError: (error: RegistrationErrorDetails | null) => void;
  handleError: (error: Error, context?: RegistrationErrorContext) => void;
  clearError: () => void;
  retry: () => Promise<void>;
  canRetry: boolean;
  validateForm: (formData: Record<string, any>) => FormValidationResult;
  setFieldError: (field: string, message: string, code?: string) => void;
  clearFieldError: (field: string) => void;
  fieldErrors: Record<string, FormFieldError>;
}

export const useRegistrationError = (
  options: UseRegistrationErrorOptions = {}
): UseRegistrationErrorReturn => {
  const [error, setError] = useState<RegistrationErrorDetails | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, FormFieldError>>({});
  
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const maxAutoRetries = options.maxAutoRetries ?? 3;

  const handleError = useCallback((
    err: Error, 
    context?: RegistrationErrorContext
  ) => {
    const result = registrationErrorHandler.processError(err, context);
    
    if (result.error) {
      setError(result.error);
      options.onError?.(result.error);

      // Auto-retry for retryable errors if enabled
      if (options.autoRetry && result.shouldRetry && retryCount < maxAutoRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        retryTimeoutRef.current = setTimeout(() => {
          retry();
        }, delay);
      }
    }
  }, [options, retryCount, maxAutoRetries]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  const retry = useCallback(async () => {
    if (!error?.retryable) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await options.onRetry?.();
      clearError();
    } catch (err) {
      handleError(err as Error, { 
        ...error.context, 
        attempt: retryCount + 1,
        isRetry: true 
      });
    } finally {
      setIsRetrying(false);
    }
  }, [error, retryCount, options.onRetry, handleError, clearError]);

  const canRetry = Boolean(error?.retryable && !isRetrying);

  // Form validation helpers
  const validateForm = useCallback((formData: Record<string, any>): FormValidationResult => {
    const errors: FormFieldError[] = [];
    
    // Email validation
    if (!formData.email) {
      errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'REQUIRED_FIELD_MISSING'
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push({
        field: 'email',
        message: 'Please enter a valid email address',
        code: 'EMAIL_INVALID'
      });
    }

    // Password validation
    if (!formData.password) {
      errors.push({
        field: 'password',
        message: 'Password is required',
        code: 'REQUIRED_FIELD_MISSING'
      });
    } else if (formData.password.length < 8) {
      errors.push({
        field: 'password',
        message: 'Password must be at least 8 characters long',
        code: 'PASSWORD_WEAK'
      });
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.push({
        field: 'password',
        message: 'Password must include uppercase, lowercase, and numbers',
        code: 'PASSWORD_WEAK'
      });
    }

    // Name validation
    if (!formData.firstName?.trim()) {
      errors.push({
        field: 'firstName',
        message: 'First name is required',
        code: 'REQUIRED_FIELD_MISSING'
      });
    }

    if (!formData.lastName?.trim()) {
      errors.push({
        field: 'lastName',
        message: 'Last name is required',
        code: 'REQUIRED_FIELD_MISSING'
      });
    }

    // Terms acceptance
    if (!formData.acceptedTerms) {
      errors.push({
        field: 'acceptedTerms',
        message: 'Please accept the terms and conditions',
        code: 'TERMS_NOT_ACCEPTED'
      });
    }

    // Update field errors state
    const newFieldErrors: Record<string, FormFieldError> = {};
    errors.forEach(error => {
      newFieldErrors[error.field] = error;
    });
    setFieldErrors(newFieldErrors);

    return {
      isValid: errors.length === 0,
      errors,
      globalError: errors.length > 0 ? 'Please correct the errors below' : undefined
    };
  }, []);

  const setFieldError = useCallback((field: string, message: string, code: string = 'VALIDATION_FAILED') => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: { field, message, code }
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    error,
    isRetrying,
    retryCount,
    setError,
    handleError,
    clearError,
    retry,
    canRetry,
    validateForm,
    setFieldError,
    clearFieldError,
    fieldErrors
  };
};