/**
 * Simple Loading State Hook Tests
 * 
 * Tests for the useSimpleLoadingState hook functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSimpleLoadingState, useDashboardLoadingState } from '../useSimpleLoadingState';

// Mock timers
vi.useFakeTimers();

// Mock logger
vi.mock('@/utils/logger/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('useSimpleLoadingState', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useSimpleLoadingState());

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.shouldShowSkeleton).toBe(false);
      expect(result.current.state.hasTimedOut).toBe(false);
    });

    it('should execute operation successfully', async () => {
      const { result } = renderHook(() => useSimpleLoadingState());

      const mockOperation = vi.fn().mockResolvedValue('success');

      await act(async () => {
        const operationResult = await result.current.execute(mockOperation);
        expect(operationResult).toBe('success');
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.isLoading).toBe(false);
    });

    it('should handle operation errors', async () => {
      const { result } = renderHook(() => useSimpleLoadingState());

      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'));

      await act(async () => {
        try {
          await result.current.execute(mockOperation);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(result.current.state.error).toBe('Test error');
      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('should show skeleton during loading', async () => {
      const { result } = renderHook(() => useSimpleLoadingState());

      let resolveOperation: (value: string) => void;
      const mockOperation = vi.fn().mockImplementation(() => 
        new Promise<string>((resolve) => {
          resolveOperation = resolve;
        })
      );

      // Start operation
      act(() => {
        result.current.execute(mockOperation);
      });

      // Should show skeleton during loading
      expect(result.current.state.shouldShowSkeleton).toBe(true);
      expect(result.current.state.isLoading).toBe(true);

      // Resolve operation
      await act(async () => {
        resolveOperation!('success');
        await vi.runAllTimersAsync();
      });

      expect(result.current.state.shouldShowSkeleton).toBe(false);
      expect(result.current.state.isLoading).toBe(false);
    });

    it('should enforce minimum loading time', async () => {
      const { result } = renderHook(() => 
        useSimpleLoadingState({ minLoadingTime: 300 })
      );

      const mockOperation = vi.fn().mockResolvedValue('success');

      await act(async () => {
        const operationPromise = result.current.execute(mockOperation);
        
        // Fast forward past minimum loading time
        vi.advanceTimersByTime(300);
        
        await operationPromise;
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid successive calls', async () => {
      const { result } = renderHook(() => 
        useSimpleLoadingState({ debounceTime: 500 })
      );

      const mockOperation = vi.fn().mockResolvedValue('success');

      // Start first operation
      act(() => {
        result.current.execute(mockOperation);
      });

      expect(result.current.state.isLoading).toBe(true);

      // Try to start second operation (should be debounced)
      act(() => {
        result.current.execute(mockOperation);
      });

      // Fast forward past debounce time
      vi.advanceTimersByTime(500);
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should have been called at least once
      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout after specified time', async () => {
      const { result } = renderHook(() => 
        useSimpleLoadingState({ timeout: 1000 })
      );

      const mockOperation = vi.fn().mockImplementation(() => 
        new Promise((resolve) => {
          // Never resolve to simulate long operation
        })
      );

      await act(async () => {
        try {
          const operationPromise = result.current.execute(mockOperation);
          
          // Fast forward past timeout
          vi.advanceTimersByTime(1000);
          
          await operationPromise;
        } catch (error) {
          // Expected to timeout
        }
      });

      expect(result.current.state.hasTimedOut).toBe(true);
      expect(result.current.state.error).toBe('Request timed out');
    });
  });

  describe('State Management', () => {
    it('should reset state correctly', async () => {
      const { result } = renderHook(() => useSimpleLoadingState());

      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'));

      await act(async () => {
        try {
          await result.current.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current.state.error).toBe('Test error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.error).toBe(null);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.shouldShowSkeleton).toBe(false);
      expect(result.current.state.hasTimedOut).toBe(false);
    });
  });

  describe('Abort Signal Integration', () => {
    it('should pass abort signal to operation', async () => {
      const { result } = renderHook(() => useSimpleLoadingState());

      const mockOperation = vi.fn().mockImplementation((abortSignal) => {
        expect(abortSignal).toBeDefined();
        expect(abortSignal?.aborted).toBe(false);
        return Promise.resolve('success');
      });

      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledWith(expect.any(AbortSignal));
    });
  });
});

describe('useDashboardLoadingState', () => {
  it('should use dashboard-specific defaults', () => {
    const { result } = renderHook(() => useDashboardLoadingState('test-operation'));

    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBe(null);
  });

  it('should handle dashboard operations', async () => {
    const { result } = renderHook(() => useDashboardLoadingState('metrics'));

    const mockOperation = vi.fn().mockResolvedValue('dashboard data');

    await act(async () => {
      const operationResult = await result.current.execute(mockOperation);
      expect(operationResult).toBe('dashboard data');
    });

    expect(mockOperation).toHaveBeenCalledTimes(1);
  });
});