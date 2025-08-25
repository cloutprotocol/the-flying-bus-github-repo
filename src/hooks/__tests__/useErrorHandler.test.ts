import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler, useEmailErrorHandler, useTokenErrorHandler, useInvitationErrorHandler } from '../useErrorHandler';
import * as errorHandlingModule from '@/utils/errorHandling';
import * as toastModule from '@/hooks/use-toast';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast
}));

// Mock the error handling utilities
vi.mock('@/utils/errorHandling', async () => {
  const actual = await vi.importActual('@/utils/errorHandling');
  return {
    ...actual,
    formatErrorForUser: vi.fn(),
    logError: vi.fn(),
    withRetry: vi.fn()
  };
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (errorHandlingModule.formatErrorForUser as any).mockReturnValue({
      message: 'Something went wrong',
      code: 'TEST_ERROR',
      canRetry: true,
      recoveryActions: ['Try again']
    });
  });

  describe('useErrorHandler', () => {
    it('should initialize with no error state', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      expect(result.current.errorState.hasError).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.canRetry).toBe(false);
    });

    it('should handle errors and update state', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const testError = new Error('Test error');
      
      act(() => {
        result.current.handleError(testError);
      });
      
      expect(result.current.errorState.hasError).toBe(true);
      expect(result.current.errorState.error).toBe(testError);
      expect(result.current.hasError).toBe(true);
      expect(errorHandlingModule.formatErrorForUser).toHaveBeenCalledWith(testError);
      expect(errorHandlingModule.logError).toHaveBeenCalledWith(testError, undefined);
    });

    it('should show toast when showToast is enabled', () => {
      const { result } = renderHook(() => useErrorHandler({ showToast: true }));
      
      const testError = new Error('Test error');
      
      act(() => {
        result.current.handleError(testError);
      });
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: 'Something went wrong',
        variant: "destructive",
      });
    });

    it('should not show toast when showToast is disabled', () => {
      const { result } = renderHook(() => useErrorHandler({ showToast: false }));
      
      const testError = new Error('Test error');
      
      act(() => {
        result.current.handleError(testError);
      });
      
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('should not log errors when logErrors is disabled', () => {
      const { result } = renderHook(() => useErrorHandler({ logErrors: false }));
      
      const testError = new Error('Test error');
      
      act(() => {
        result.current.handleError(testError);
      });
      
      expect(errorHandlingModule.logError).not.toHaveBeenCalled();
    });

    it('should clear error state', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      // First set an error
      act(() => {
        result.current.handleError(new Error('Test error'));
      });
      
      expect(result.current.hasError).toBe(true);
      
      // Then clear it
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.hasError).toBe(false);
      expect(result.current.errorState.hasError).toBe(false);
    });

    it('should handle context in error handling', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      const testError = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      
      act(() => {
        result.current.handleError(testError, context);
      });
      
      expect(errorHandlingModule.logError).toHaveBeenCalledWith(testError, context);
    });
  });

  describe('retryOperation', () => {
    it('should call withRetry and clear error on success', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      (errorHandlingModule.withRetry as any).mockResolvedValue('success');
      
      const { result } = renderHook(() => useErrorHandler());
      
      let operationResult;
      await act(async () => {
        operationResult = await result.current.retryOperation(mockOperation);
      });
      
      expect(operationResult).toBe('success');
      expect(errorHandlingModule.withRetry).toHaveBeenCalledWith(mockOperation, undefined);
      expect(result.current.hasError).toBe(false);
    });

    it('should handle error on retry failure', async () => {
      const mockOperation = vi.fn();
      const testError = new Error('Retry failed');
      (errorHandlingModule.withRetry as any).mockRejectedValue(testError);
      
      const { result } = renderHook(() => useErrorHandler());
      
      await act(async () => {
        try {
          await result.current.retryOperation(mockOperation);
        } catch (error) {
          expect(error).toBe(testError);
        }
      });
      
      expect(result.current.hasError).toBe(true);
      expect(result.current.errorState.error).toBe(testError);
    });

    it('should use custom retry config', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      (errorHandlingModule.withRetry as any).mockResolvedValue('success');
      
      const { result } = renderHook(() => useErrorHandler({
        retryConfig: { maxAttempts: 5 }
      }));
      
      const customConfig = { baseDelay: 2000 };
      
      await act(async () => {
        await result.current.retryOperation(mockOperation, customConfig);
      });
      
      expect(errorHandlingModule.withRetry).toHaveBeenCalledWith(
        mockOperation, 
        { maxAttempts: 5, baseDelay: 2000 }
      );
    });
  });

  describe('executeWithErrorHandling', () => {
    it('should execute operation and return result on success', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const { result } = renderHook(() => useErrorHandler());
      
      let operationResult;
      await act(async () => {
        operationResult = await result.current.executeWithErrorHandling(mockOperation);
      });
      
      expect(operationResult).toBe('success');
      expect(result.current.hasError).toBe(false);
    });

    it('should handle error and return null on failure', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      const { result } = renderHook(() => useErrorHandler());
      
      let operationResult;
      await act(async () => {
        operationResult = await result.current.executeWithErrorHandling(mockOperation);
      });
      
      expect(operationResult).toBeNull();
      expect(result.current.hasError).toBe(true);
    });

    it('should pass context to error handler', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      const context = { operation: 'test' };
      
      const { result } = renderHook(() => useErrorHandler());
      
      await act(async () => {
        await result.current.executeWithErrorHandling(mockOperation, context);
      });
      
      expect(errorHandlingModule.logError).toHaveBeenCalledWith(
        expect.any(Error),
        context
      );
    });
  });

  describe('useEmailErrorHandler', () => {
    it('should initialize with email-specific retry config', () => {
      const { result } = renderHook(() => useEmailErrorHandler());
      
      expect(result.current.errorState.hasError).toBe(false);
      expect(typeof result.current.sendEmailWithRetry).toBe('function');
    });

    it('should call retryOperation for email operations', async () => {
      const mockEmailOperation = vi.fn().mockResolvedValue('email sent');
      (errorHandlingModule.withRetry as any).mockResolvedValue('email sent');
      
      const { result } = renderHook(() => useEmailErrorHandler());
      
      let emailResult;
      await act(async () => {
        emailResult = await result.current.sendEmailWithRetry(mockEmailOperation);
      });
      
      expect(emailResult).toBe('email sent');
      expect(errorHandlingModule.withRetry).toHaveBeenCalledWith(mockEmailOperation);
    });
  });

  describe('useTokenErrorHandler', () => {
    it('should initialize with token-specific retry config', () => {
      const { result } = renderHook(() => useTokenErrorHandler());
      
      expect(result.current.errorState.hasError).toBe(false);
      expect(typeof result.current.validateTokenWithRetry).toBe('function');
    });

    it('should use executeWithErrorHandling for token operations', async () => {
      const mockTokenOperation = vi.fn().mockResolvedValue('token valid');
      
      const { result } = renderHook(() => useTokenErrorHandler());
      
      let tokenResult;
      await act(async () => {
        tokenResult = await result.current.validateTokenWithRetry(mockTokenOperation);
      });
      
      expect(tokenResult).toBe('token valid');
    });
  });

  describe('useInvitationErrorHandler', () => {
    it('should initialize with invitation-specific retry config', () => {
      const { result } = renderHook(() => useInvitationErrorHandler());
      
      expect(result.current.errorState.hasError).toBe(false);
      expect(typeof result.current.processInvitationWithRetry).toBe('function');
    });

    it('should call retryOperation for invitation operations', async () => {
      const mockInvitationOperation = vi.fn().mockResolvedValue('invitation processed');
      (errorHandlingModule.withRetry as any).mockResolvedValue('invitation processed');
      
      const { result } = renderHook(() => useInvitationErrorHandler());
      
      let invitationResult;
      await act(async () => {
        invitationResult = await result.current.processInvitationWithRetry(mockInvitationOperation);
      });
      
      expect(invitationResult).toBe('invitation processed');
      expect(errorHandlingModule.withRetry).toHaveBeenCalledWith(mockInvitationOperation);
    });
  });
});