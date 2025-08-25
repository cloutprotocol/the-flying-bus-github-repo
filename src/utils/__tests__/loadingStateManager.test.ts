/**
 * Loading State Manager Tests
 * 
 * Tests for the enhanced loading state management utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoadingStateManager } from '../loadingStateManager';

// Mock timers
vi.useFakeTimers();

describe('LoadingStateManager', () => {
  let manager: LoadingStateManager;

  beforeEach(() => {
    manager = new LoadingStateManager({
      minLoadingTime: 300,
      timeout: 5000,
      debounceTime: 500
    });
  });

  afterEach(() => {
    manager.cleanup();
    vi.clearAllTimers();
  });

  describe('Basic Loading State', () => {
    it('should start and stop loading correctly', async () => {
      expect(manager.getState().isLoading).toBe(false);
      
      await manager.startLoading();
      expect(manager.getState().isLoading).toBe(true);
      expect(manager.shouldShowLoading()).toBe(true);
      
      const stopPromise = manager.stopLoading();
      
      // Fast forward past minimum loading time
      vi.advanceTimersByTime(300);
      await stopPromise;
      
      expect(manager.getState().isLoading).toBe(false);
      expect(manager.shouldShowLoading()).toBe(false);
    });

    it('should enforce minimum loading time', async () => {
      const startTime = Date.now();
      
      await manager.startLoading();
      
      // Stop loading immediately
      const stopPromise = manager.stopLoading();
      
      // Should still be loading
      expect(manager.getState().isLoading).toBe(true);
      
      // Fast forward past minimum loading time
      vi.advanceTimersByTime(300);
      await stopPromise;
      
      expect(manager.getState().isLoading).toBe(false);
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid successive calls', async () => {
      // Start loading
      await manager.startLoading();
      expect(manager.getState().isLoading).toBe(true);
      
      // Try to start loading again (should be debounced)
      const secondStart = manager.startLoading();
      expect(manager.getState().isDebouncing).toBe(true);
      expect(manager.shouldShowLoading()).toBe(false); // Should not show loading during debounce
      
      // Fast forward past debounce time
      vi.advanceTimersByTime(500);
      await secondStart;
      
      expect(manager.getState().isDebouncing).toBe(false);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout after specified time', async () => {
      await manager.startLoading();
      
      // Fast forward past timeout
      vi.advanceTimersByTime(5000);
      
      expect(manager.hasTimedOut()).toBe(true);
    });

    it('should provide abort controller for request cancellation', async () => {
      await manager.startLoading();
      
      const abortController = manager.getAbortController();
      expect(abortController).toBeTruthy();
      expect(abortController?.signal.aborted).toBe(false);
      
      // Trigger timeout
      vi.advanceTimersByTime(5000);
      
      expect(abortController?.signal.aborted).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should track start time correctly', async () => {
      const beforeStart = Date.now();
      await manager.startLoading();
      const afterStart = Date.now();
      
      const state = manager.getState();
      expect(state.startTime).toBeGreaterThanOrEqual(beforeStart);
      expect(state.startTime).toBeLessThanOrEqual(afterStart);
    });

    it('should reset state correctly', async () => {
      await manager.startLoading();
      expect(manager.getState().isLoading).toBe(true);
      
      manager.reset();
      
      const state = manager.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isDebouncing).toBe(false);
      expect(state.hasTimedOut).toBe(false);
      expect(state.startTime).toBe(null);
    });

    it('should cleanup resources correctly', async () => {
      await manager.startLoading();
      const abortController = manager.getAbortController();
      
      manager.cleanup();
      
      expect(abortController?.signal.aborted).toBe(true);
      expect(manager.getAbortController()).toBe(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple stop calls gracefully', async () => {
      await manager.startLoading();
      
      const stop1 = manager.stopLoading();
      const stop2 = manager.stopLoading();
      
      // Fast forward past minimum loading time
      vi.advanceTimersByTime(300);
      
      await Promise.all([stop1, stop2]);
      
      expect(manager.getState().isLoading).toBe(false);
    });

    it('should handle cleanup during loading', async () => {
      await manager.startLoading();
      expect(manager.getState().isLoading).toBe(true);
      
      manager.cleanup();
      
      expect(manager.getState().isLoading).toBe(false);
    });

    it('should handle reset during debouncing', async () => {
      await manager.startLoading();
      manager.startLoading(); // This should trigger debouncing
      
      expect(manager.getState().isDebouncing).toBe(true);
      
      manager.reset();
      
      expect(manager.getState().isDebouncing).toBe(false);
      expect(manager.getState().isLoading).toBe(false);
    });
  });

  describe('Configuration Options', () => {
    it('should use default options when none provided', () => {
      const defaultManager = new LoadingStateManager();
      
      // Test that it works with defaults (we can't directly access private options)
      expect(defaultManager.getState()).toBeDefined();
    });

    it('should respect custom timeout', async () => {
      const customManager = new LoadingStateManager({ timeout: 1000 });
      
      await customManager.startLoading();
      
      // Fast forward past custom timeout
      vi.advanceTimersByTime(1000);
      
      expect(customManager.hasTimedOut()).toBe(true);
      
      customManager.cleanup();
    });

    it('should respect custom debounce time', async () => {
      const customManager = new LoadingStateManager({ debounceTime: 200 });
      
      await customManager.startLoading();
      customManager.startLoading(); // Should trigger debouncing
      
      expect(customManager.getState().isDebouncing).toBe(true);
      
      // Fast forward past custom debounce time
      vi.advanceTimersByTime(200);
      
      // Should resolve debouncing
      await vi.runAllTimersAsync();
      
      customManager.cleanup();
    });
  });
});