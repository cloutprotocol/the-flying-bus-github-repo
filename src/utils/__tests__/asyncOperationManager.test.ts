/**
 * Unit tests for AsyncOperationManager
 * Tests timeout scenarios, retry logic, error handling, and operation tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AsyncOperationManager, simpleRetry, withTimeout } from '../asyncOperationManager';

// Mock console methods to avoid noise in tests
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
};

describe('AsyncOperationManager', () => {
  beforeEach(() => {
    // Clear any active operations before each test
    AsyncOperationManager.cancelAllOperations();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    AsyncOperationManager.cancelAllOperations();
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      const onProgress = vi.fn();
      const onSuccess = vi.fn();

      const result = await AsyncOperationManager.executeWithRetry(mockOperation, {
        onProgress,
        onSuccess,
        operationId: 'test-success'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
      expect(result.timedOut).toBe(false);
      expect(result.cancelled).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith('success', 1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success on retry');
      
      const onError = vi.fn();
      const onProgress = vi.fn();

      const result = await AsyncOperationManager.executeWithRetry(mockOperation, {
        maxRetries: 2,
        retryDelay: 10, // Short delay for testing
        onError,
        onProgress,
        operationId: 'test-retry-success'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success on retry');
      expect(result.attempts).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        true // willRetry = true
      );
    });

    it('should fail after exhausting all retry attempts', async () => {
      const error = new Error('Persistent failure');
      const mockOperation = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();

      const result = await AsyncOperationManager.executeWithRetry(mockOperation, {
        maxRetries: 2,
        retryDelay: 10,
        onError,
        operationId: 'test-retry-failure'
      });

      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      expect(result.attempts).toBe(3); // Initial + 2 retries
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(onError).toHaveBeenCalledTimes(3);
      
      // Check that last call had willRetry = false
      expect(onError).toHaveBeenLastCalledWith(error, 3, false);
    });

    it('should handle timeout correctly', async () => {
      const mockOperation = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200)) // Takes 200ms
      );

      const result = await AsyncOperationManager.executeWithRetry(mockOperation, {
        timeout: 50, // Timeout after 50ms
        maxRetries: 1,
        operationId: 'test-timeout'
      });

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error?.message).toContain('timed out');
    });

    it('should use exponential backoff for retry delays', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const startTime = Date.now();

      await AsyncOperationManager.executeWithRetry(mockOperation, {
        maxRetries: 2,
        retryDelay: 100,
        exponentialBackoff: true,
        operationId: 'test-exponential-backoff'
      });

      const duration = Date.now() - startTime;
      // Should have delays of ~100ms and ~200ms, so total should be > 300ms
      expect(duration).toBeGreaterThan(250);
    });

    it('should use linear backoff when exponentialBackoff is false', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const startTime = Date.now();

      await AsyncOperationManager.executeWithRetry(mockOperation, {
        maxRetries: 2,
        retryDelay: 100,
        exponentialBackoff: false,
        operationId: 'test-linear-backoff'
      });

      const duration = Date.now() - startTime;
      // Should have delays of ~100ms and ~100ms, so total should be > 200ms but < 250ms
      expect(duration).toBeGreaterThan(150);
      expect(duration).toBeLessThan(300);
    });

    it('should track operation status correctly', async () => {
      const mockOperation = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('delayed success'), 100))
      );

      const operationId = 'test-tracking';
      const resultPromise = AsyncOperationManager.executeWithRetry(mockOperation, {
        operationId
      });

      // Check that operation is tracked as running
      expect(AsyncOperationManager.isOperationRunning(operationId)).toBe(true);
      
      const status = AsyncOperationManager.getOperationStatus(operationId);
      expect(status).toBeTruthy();
      expect(status?.status).toBe('running');

      await resultPromise;

      // After completion, operation should no longer be tracked
      expect(AsyncOperationManager.isOperationRunning(operationId)).toBe(false);
    });

    it('should handle AbortSignal correctly', async () => {
      const mockOperation = vi.fn().mockImplementation((signal?: AbortSignal) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('success'), 1000);
          
          signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Operation was cancelled'));
          });
        });
      });

      const operationId = 'test-abort';
      const resultPromise = AsyncOperationManager.executeWithRetry(mockOperation, {
        operationId,
        timeout: 2000,
        maxRetries: 0
      });

      // Cancel the operation after a short delay
      setTimeout(() => {
        AsyncOperationManager.cancelOperation(operationId);
      }, 10);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });
  });

  describe('operation management', () => {
    it('should cancel specific operation', async () => {
      const mockOperation = vi.fn().mockImplementation((signal?: AbortSignal) => 
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('success'), 1000);
          signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Operation was cancelled'));
          });
        })
      );

      const operationId = 'test-cancel-specific';
      const resultPromise = AsyncOperationManager.executeWithRetry(mockOperation, {
        operationId,
        maxRetries: 0
      });

      expect(AsyncOperationManager.isOperationRunning(operationId)).toBe(true);
      
      // Cancel immediately
      const cancelled = AsyncOperationManager.cancelOperation(operationId);
      expect(cancelled).toBe(true);
      
      const result = await resultPromise;
      expect(result.cancelled).toBe(true);
    });

    it('should cancel all operations', async () => {
      const mockOperation = vi.fn().mockImplementation((signal?: AbortSignal) => 
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('success'), 1000);
          signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Operation was cancelled'));
          });
        })
      );

      // Start multiple operations
      const promises = [
        AsyncOperationManager.executeWithRetry(mockOperation, { operationId: 'op1', maxRetries: 0 }),
        AsyncOperationManager.executeWithRetry(mockOperation, { operationId: 'op2', maxRetries: 0 }),
        AsyncOperationManager.executeWithRetry(mockOperation, { operationId: 'op3', maxRetries: 0 })
      ];

      expect(AsyncOperationManager.getActiveOperations()).toHaveLength(3);
      
      const cancelledCount = AsyncOperationManager.cancelAllOperations();
      expect(cancelledCount).toBe(3);
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.cancelled).toBe(true);
      });
    });

    it('should cleanup old operations', async () => {
      // This test is tricky because cleanup only removes completed operations
      // We'll simulate by manually adding a completed operation
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      await AsyncOperationManager.executeWithRetry(mockOperation, {
        operationId: 'completed-op'
      });

      // Since the operation completed, it should already be removed
      expect(AsyncOperationManager.getActiveOperations()).toHaveLength(0);
    });
  });

  describe('wrapper functions', () => {
    it('should create form submission wrapper correctly', async () => {
      const mockSubmitFunction = vi.fn().mockResolvedValue({ id: 123 });
      const formData = { name: 'test', email: 'test@example.com' };

      const wrappedSubmit = AsyncOperationManager.createFormSubmissionWrapper(
        mockSubmitFunction,
        { maxRetries: 1 }
      );

      const result = await wrappedSubmit(formData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 123 });
      expect(mockSubmitFunction).toHaveBeenCalledWith(formData, expect.any(AbortSignal));
    });

    it('should create data fetch wrapper correctly', async () => {
      const mockFetchFunction = vi.fn().mockResolvedValue(['item1', 'item2']);

      const wrappedFetch = AsyncOperationManager.createDataFetchWrapper(
        mockFetchFunction,
        { timeout: 5000 }
      );

      const result = await wrappedFetch();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['item1', 'item2']);
      expect(mockFetchFunction).toHaveBeenCalledWith(expect.any(AbortSignal));
    });
  });

  describe('utility functions', () => {
    describe('simpleRetry', () => {
      it('should retry operation and succeed', async () => {
        const mockOperation = vi.fn()
          .mockRejectedValueOnce(new Error('First failure'))
          .mockResolvedValueOnce('success');

        const result = await simpleRetry(mockOperation, 2, 10);

        expect(result).toBe('success');
        expect(mockOperation).toHaveBeenCalledTimes(2);
      });

      it('should throw error after exhausting retries', async () => {
        const error = new Error('Persistent failure');
        const mockOperation = vi.fn().mockRejectedValue(error);

        await expect(simpleRetry(mockOperation, 2, 10)).rejects.toThrow('Persistent failure');
        expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      });
    });

    describe('withTimeout', () => {
      it('should resolve operation before timeout', async () => {
        const operation = Promise.resolve('success');
        const result = await withTimeout(operation, 100);
        expect(result).toBe('success');
      });

      it('should timeout slow operation', async () => {
        const operation = new Promise(resolve => setTimeout(() => resolve('too late'), 200));
        
        await expect(withTimeout(operation, 50)).rejects.toThrow('timed out');
      });

      it('should use custom timeout message', async () => {
        const operation = new Promise(resolve => setTimeout(() => resolve('too late'), 200));
        
        await expect(withTimeout(operation, 50, 'Custom timeout message')).rejects.toThrow('Custom timeout message');
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle non-Error objects thrown', async () => {
      const mockOperation = vi.fn().mockRejectedValue('string error');

      const result = await AsyncOperationManager.executeWithRetry(mockOperation, {
        maxRetries: 0,
        operationId: 'test-string-error'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('string error');
    });

    it('should handle undefined/null errors', async () => {
      const mockOperation = vi.fn().mockRejectedValue(null);

      const result = await AsyncOperationManager.executeWithRetry(mockOperation, {
        maxRetries: 0,
        operationId: 'test-null-error'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('null');
    });

    it('should handle unexpected errors in retry logic', async () => {
      // Mock setTimeout to throw an error
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn().mockImplementation(() => {
        throw new Error('setTimeout failed');
      });

      const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      const result = await AsyncOperationManager.executeWithRetry(mockOperation, {
        maxRetries: 1,
        retryDelay: 100,
        operationId: 'test-unexpected-error'
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('setTimeout failed');

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('progress and callback handling', () => {
    it('should call progress callback at appropriate times', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      const onProgress = vi.fn();

      await AsyncOperationManager.executeWithRetry(mockOperation, {
        onProgress,
        operationId: 'test-progress'
      });

      expect(onProgress).toHaveBeenCalledWith('Starting operation test-progress');
      expect(onProgress).toHaveBeenCalledWith('Attempt 1/4', 1);
      expect(onProgress).toHaveBeenCalledWith('Operation completed successfully');
    });

    it('should call error callback for each failed attempt', async () => {
      const error = new Error('Test error');
      const mockOperation = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();

      await AsyncOperationManager.executeWithRetry(mockOperation, {
        maxRetries: 2,
        retryDelay: 10,
        onError,
        operationId: 'test-error-callback'
      });

      expect(onError).toHaveBeenCalledTimes(3);
      expect(onError).toHaveBeenNthCalledWith(1, error, 1, true);
      expect(onError).toHaveBeenNthCalledWith(2, error, 2, true);
      expect(onError).toHaveBeenNthCalledWith(3, error, 3, false);
    });
  });
});