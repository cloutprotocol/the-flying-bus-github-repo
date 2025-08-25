import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRegistrationError } from '../useRegistrationError';
import { RegistrationErrorDetails } from '@/types/RegistrationErrorTypes';

// Mock the registration error handler
vi.mock('@/services/registrationErrorHandler', () => ({
  registrationErrorHandler: {
    processError: vi.fn((error) => ({
      success: false,
      error: {
        name: 'TestError',
        message: error.message,
        code: 'TEST_ERROR',
        type: 'validation',
        retryable: false,
        userMessage: 'Test error message',
        technicalDetails: error.message
      },
      shouldRetry: false,
      userMessage: 'Test error message'
    }))
  }
}));

describe('useRegistrationError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic error handling', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useRegistrationError());

      expect(result.current.error).toBeNull();
      expect(result.current.isRetrying).toBe(false);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.canRetry).toBe(false);
    });

    it('should handle errors correctly', () => {
      const { result } = renderHook(() => useRegistrationError());
      const testError = new Error('Test validation error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toBe('Test validation error');
      expect(result.current.error?.type).toBe('validation');
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => useRegistrationError());
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });

    it('should set custom errors', () => {
      const { result } = renderHook(() => useRegistrationError());
      const customError: RegistrationErrorDetails = {
        code: 'CUSTOM_ERROR',
        type: 'network',
        message: 'Custom error',
        userMessage: 'Custom user message',
        retryable: true
      };

      act(() => {
        result.current.setError(customError);
      });

      expect(result.current.error).toEqual(customError);
      expect(result.current.canRetry).toBe(true);
    });
  });

  describe('retry functionality', () => {
    it('should handle retry for retryable errors', async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useRegistrationError({ onRetry }));
      
      const retryableError: RegistrationErrorDetails = {
        code: 'NETWORK_ERROR',
        type: 'network',
        message: 'Network error',
        userMessage: 'Network error occurred',
        retryable: true
      };

      act(() => {
        result.current.setError(retryableError);
      });

      expect(result.current.canRetry).toBe(true);

      await act(async () => {
        await result.current.retry();
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });

    it('should not retry non-retryable errors', async () => {
      const onRetry = vi.fn();
      const { result } = renderHook(() => useRegistrationError({ onRetry }));
      
      const nonRetryableError: RegistrationErrorDetails = {
        code: 'VALIDATION_FAILED',
        type: 'validation',
        message: 'Validation error',
        userMessage: 'Validation failed',
        retryable: false
      };

      act(() => {
        result.current.setError(nonRetryableError);
      });

      expect(result.current.canRetry).toBe(false);

      await act(async () => {
        await result.current.retry();
      });

      expect(onRetry).not.toHaveBeenCalled();
    });

    it('should handle retry failures', async () => {
      const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));
      const { result } = renderHook(() => useRegistrationError({ onRetry }));
      
      const retryableError: RegistrationErrorDetails = {
        code: 'NETWORK_ERROR',
        type: 'network',
        message: 'Network error',
        userMessage: 'Network error occurred',
        retryable: true
      };

      act(() => {
        result.current.setError(retryableError);
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.retryCount).toBe(1);
    });

    it('should track retry count', async () => {
      const onRetry = vi.fn()
        .mockRejectedValueOnce(new Error('First retry failed'))
        .mockRejectedValueOnce(new Error('Second retry failed'))
        .mockResolvedValue(undefined);
      
      const { result } = renderHook(() => useRegistrationError({ onRetry }));
      
      const retryableError: RegistrationErrorDetails = {
        code: 'NETWORK_ERROR',
        type: 'network',
        message: 'Network error',
        userMessage: 'Network error occurred',
        retryable: true
      };

      act(() => {
        result.current.setError(retryableError);
      });

      // First retry
      await act(async () => {
        await result.current.retry();
      });
      expect(result.current.retryCount).toBe(1);

      // Second retry
      await act(async () => {
        await result.current.retry();
      });
      expect(result.current.retryCount).toBe(2);

      // Third retry (successful)
      await act(async () => {
        await result.current.retry();
      });
      expect(result.current.retryCount).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('form validation', () => {
    it('should validate email correctly', () => {
      const { result } = renderHook(() => useRegistrationError());

      // Valid email
      let validation = result.current.validateForm({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        acceptedTerms: true
      });
      expect(validation.isValid).toBe(true);

      // Invalid email
      validation = result.current.validateForm({
        email: 'invalid-email',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        acceptedTerms: true
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'email')).toBe(true);

      // Missing email
      validation = result.current.validateForm({
        email: '',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        acceptedTerms: true
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'email')).toBe(true);
    });

    it('should validate password correctly', () => {
      const { result } = renderHook(() => useRegistrationError());

      // Valid password
      let validation = result.current.validateForm({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        acceptedTerms: true
      });
      expect(validation.isValid).toBe(true);

      // Too short password
      validation = result.current.validateForm({
        email: 'test@example.com',
        password: 'Pass1',
        firstName: 'John',
        lastName: 'Doe',
        acceptedTerms: true
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'password')).toBe(true);

      // Weak password (no uppercase)
      validation = result.current.validateForm({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        acceptedTerms: true
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'password')).toBe(true);

      // Weak password (no numbers)
      validation = result.current.validateForm({
        email: 'test@example.com',
        password: 'Password',
        firstName: 'John',
        lastName: 'Doe',
        acceptedTerms: true
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'password')).toBe(true);
    });

    it('should validate required fields', () => {
      const { result } = renderHook(() => useRegistrationError());

      // Missing first name
      let validation = result.current.validateForm({
        email: 'test@example.com',
        password: 'Password123',
        firstName: '',
        lastName: 'Doe',
        acceptedTerms: true
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'firstName')).toBe(true);

      // Missing last name
      validation = result.current.validateForm({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: '',
        acceptedTerms: true
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'lastName')).toBe(true);
    });

    it('should validate terms acceptance', () => {
      const { result } = renderHook(() => useRegistrationError());

      const validation = result.current.validateForm({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        acceptedTerms: false
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'acceptedTerms')).toBe(true);
    });
  });

  describe('field error management', () => {
    it('should set and clear field errors', () => {
      const { result } = renderHook(() => useRegistrationError());

      act(() => {
        result.current.setFieldError('email', 'Email is invalid', 'EMAIL_INVALID');
      });

      expect(result.current.fieldErrors.email).toEqual({
        field: 'email',
        message: 'Email is invalid',
        code: 'EMAIL_INVALID'
      });

      act(() => {
        result.current.clearFieldError('email');
      });

      expect(result.current.fieldErrors.email).toBeUndefined();
    });

    it('should handle multiple field errors', () => {
      const { result } = renderHook(() => useRegistrationError());

      act(() => {
        result.current.setFieldError('email', 'Email is invalid');
        result.current.setFieldError('password', 'Password is weak');
      });

      expect(Object.keys(result.current.fieldErrors)).toHaveLength(2);
      expect(result.current.fieldErrors.email.message).toBe('Email is invalid');
      expect(result.current.fieldErrors.password.message).toBe('Password is weak');

      act(() => {
        result.current.clearFieldError('email');
      });

      expect(Object.keys(result.current.fieldErrors)).toHaveLength(1);
      expect(result.current.fieldErrors.email).toBeUndefined();
      expect(result.current.fieldErrors.password).toBeTruthy();
    });
  });

  describe('auto-retry functionality', () => {
    it('should auto-retry when enabled', async () => {
      vi.useFakeTimers();
      
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => 
        useRegistrationError({ 
          autoRetry: true, 
          maxAutoRetries: 2,
          onRetry 
        })
      );

      const testError = new Error('Network error');
      
      // Mock the error handler to return a retryable error
      const { registrationErrorHandler } = await import('@/services/registrationErrorHandler');
      vi.mocked(registrationErrorHandler.processError).mockReturnValue({
        success: false,
        error: {
          name: 'NetworkError',
          message: 'Network error',
          code: 'NETWORK_ERROR',
          type: 'network',
          retryable: true,
          userMessage: 'Network error occurred'
        },
        shouldRetry: true,
        userMessage: 'Network error occurred'
      });

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toBeTruthy();

      // Fast-forward time to trigger auto-retry
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });

    it('should respect max auto-retry limit', async () => {
      vi.useFakeTimers();
      
      const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));
      const { result } = renderHook(() => 
        useRegistrationError({ 
          autoRetry: true, 
          maxAutoRetries: 2,
          onRetry 
        })
      );

      const testError = new Error('Network error');
      
      // Mock the error handler to return a retryable error
      const { registrationErrorHandler } = await import('@/services/registrationErrorHandler');
      vi.mocked(registrationErrorHandler.processError).mockReturnValue({
        success: false,
        error: {
          name: 'NetworkError',
          message: 'Network error',
          code: 'NETWORK_ERROR',
          type: 'network',
          retryable: true,
          userMessage: 'Network error occurred'
        },
        shouldRetry: true,
        userMessage: 'Network error occurred'
      });

      // First error
      act(() => {
        result.current.handleError(testError);
      });

      // First auto-retry
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await vi.runAllTimersAsync();
      });

      // Second auto-retry
      await act(async () => {
        vi.advanceTimersByTime(2000);
        await vi.runAllTimersAsync();
      });

      // Third attempt should not happen (max 2 retries)
      await act(async () => {
        vi.advanceTimersByTime(4000);
        await vi.runAllTimersAsync();
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(result.current.retryCount).toBe(2);
      
      vi.useRealTimers();
    });
  });
});