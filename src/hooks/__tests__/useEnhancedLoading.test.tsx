/**
 * Enhanced Loading Hook Tests
 * 
 * Tests for the useEnhancedLoading hook functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnhancedLoading, useDashboardLoading } from '../useEnhancedLoading';

// Mock timers
vi.useFakeTimers();

// Mock logger
vi.mock('@/utils/logger/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('useEnhancedLoading', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useEnhancedLoading());
      const [state] = result.current;

      expect(state.isLoading).toBe(false);
      expect(state.isDebouncing).toBe(false);
      expect(state.hasTimedOut).toBe(false);
      expect(state.error).toBe(null);
      expect(state.retryCount).toBe(0);
      expect(state.canRetry).toBe(true);
      expect(state.shouldShowSkeleton).toBe(false);
    });

    it('should execute operation successfully', async () => {
      const { result } = renderHook(() => useEnhancedLoading());
      const [, actions] = result.current;

      const mockOperation = vi.fn().mockResolvedValue('success');

      await act(async () => {
        const result = await actions.execute(mockOperation);
        expect(result).toBe('success');
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current[0].error).toBe(null);
      expect(result.current[0].retryCount).toBe(0);
    });

    it('should handle operation errors', async () => {
      const { result } = renderHook(() => useEnhancedLoading());
      const [, actions] = result.current;

      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'));

      await act(async () => {
        try {
          await actions.execute(mockOperation);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(result.current[0].error).toBe('Test error');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during operation', async () => {
      const { result } = renderHook(() => useEnhancedLoading());
      const [, actions] = result.current;

      let resolveOperation: (value: string) => void;
      const mockOperation = vi.fn().mockImplementation(() => 
        new Promise<string>((resolve) => {
          resolveOperation = resolve;
        })
      );

      // Start operation
      act(() => {
        actions.execute(mockOperation);
      });

      // Should show skeleton during loading
      expect(result.current[0].shouldShowSkeleton).toBe(true);

      // Resolve operation
      await act(async () => {
        resolveOperation!('success');
        await vi.runAllTimersAsync();
      });

      expect(result.current[0].shouldShowSkeleton).toBe(false);
    });

    it('should handle minimum loading time', async () => {
      const { result } = renderHook(() => 
        useEnhancedLoading({ minLoadingTime: 300 })
      );
      const [, actions] = result.current;

      const mockOperation = vi.fn().mockResolvedValue('success');

      await act(async () => {
        const operationPromise = actions.execute(mockOperation);
        
        // Fast forward past minimum loading time
        vi.advanceTimersByTime(300);
        
        await operationPromise;
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry Functionality', () => {
    it('should handle manual retry', async () => {
      const { result } = renderHook(() => useEnhancedLoading());
      const [, actions] = result.current;

      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce('success');

      // First execution fails
      await act(async () => {
        try {
          await actions.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current[0].error).toBe('First error');
      expect(result.current[0].canRetry).toBe(true);

      // Retry should succeed
      await act(async () => {
        await actions.retry();
      });

      expect(result.current[0].error).toBe(null);
      expect(result.current[0].retryCount).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should handle auto-retry on timeout', async () => {
      const { result } = renderHook(() => 
        useEnhancedLoading({ 
          timeout: 1000, 
          autoRetry: true, 
          maxRetries: 2,
          retryDelay: 100
        })
      );
      const [, actions] = result.current;

      const mockOperation = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 2000);
        })
      );

      await act(async () => {
        try {
          const operationPromise = actions.execute(mockOperation);
          
          // Trigger timeout
          vi.advanceTimersByTime(1000);
          
          await operationPromise;
        } catch (error) {
          // Expected to timeout
        }
      });

      // Should have attempted retry
      expect(result.current[0].retryCount).toBeGreaterThan(0);
    });

    it('should respect max retry limit', async () => {
      const { result } = renderHook(() => 
        useEnhancedLoading({ maxRetries: 2 })
      );
      const [, actions] = result.current;

      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));

      // Execute and retry until max retries reached
      await act(async () => {
        try {
          await actions.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      });

      // Retry twice
      await act(async () => {
        try {
          await actions.retry();
        } catch (error) {
          // Expected to fail
        }
      });

      await act(async () => {
        try {
          await actions.retry();
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current[0].retryCount).toBe(2);
      expect(result.current[0].canRetry).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should reset state correctly', async () => {
      const { result } = renderHook(() => useEnhancedLoading());
      const [, actions] = result.current;

      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'));

      await act(async () => {
        try {
          await actions.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current[0].error).toBe('Test error');

      act(() => {
        actions.reset();
      });

      const [state] = result.current;
      expect(state.error).toBe(null);
      expect(state.retryCount).toBe(0);
      expect(state.isLoading).toBe(false);
    });

    it('should cancel operation', async () => {
      const { result } = renderHook(() => useEnhancedLoading());
      const [, actions] = result.current;

      act(() => {
        actions.cancel();
      });

      expect(result.current[0].error).toBe('Operation cancelled');
    });
  });

  describe('Abort Signal Integration', () => {
    it('should pass abort signal to operation', async () => {
      const { result } = renderHook(() => useEnhancedLoading());
      const [, actions] = result.current;

      const mockOperation = vi.fn().mockImplementation((abortSignal) => {
        expect(abortSignal).toBeDefined();
        expect(abortSignal?.aborted).toBe(false);
        return Promise.resolve('success');
      });

      await act(async () => {
        await actions.execute(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledWith(expect.any(AbortSignal));
    });
  });
});

describe('useDashboardLoading', () => {
  it('should use dashboard-specific defaults', () => {
    const { result } = renderHook(() => useDashboardLoading('test-operation'));
    const [state] = result.current;

    expect(state.isLoading).toBe(false);
    expect(state.canRetry).toBe(true); // Auto-retry enabled by default
  });

  it('should handle dashboard operations', async () => {
    const { result } = renderHook(() => useDashboardLoading('metrics'));
    const [, actions] = result.current;

    const mockOperation = vi.fn().mockResolvedValue('dashboard data');

    await act(async () => {
      const result = await actions.execute(mockOperation);
      expect(result).toBe('dashboard data');
    });

    expect(mockOperation).toHaveBeenCalledTimes(1);
  });
});