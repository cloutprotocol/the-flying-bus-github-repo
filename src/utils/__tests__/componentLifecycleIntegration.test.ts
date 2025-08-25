/**
 * Integration tests for ComponentLifecycleManager
 * 
 * Tests real-world scenarios and integration with navigation and async operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentLifecycleManager, dispatchNavigationChange } from '../componentLifecycleManager';

describe('ComponentLifecycleManager Integration Tests', () => {
  let manager: ComponentLifecycleManager;

  beforeEach(() => {
    manager = new ComponentLifecycleManager('integration-test', true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Navigation Scenarios', () => {
    it('should handle rapid navigation with proper cleanup', async () => {
      const callbacks = {
        page1DataFetch: vi.fn(),
        page1Timer: vi.fn(),
        page2DataFetch: vi.fn(),
        page2Timer: vi.fn()
      };

      // Simulate Page 1 loading
      const page1Controller = manager.createAbortController();
      manager.addTimeout(callbacks.page1Timer, 2000);
      
      // Simulate data fetch for page 1
      const page1Promise = new Promise((resolve) => {
        manager.addTimeout(() => {
          if (!page1Controller.signal.aborted) {
            callbacks.page1DataFetch();
            resolve('page1-data');
          }
        }, 1000);
      });

      // Advance time partially
      vi.advanceTimersByTime(500);

      // Simulate rapid navigation to Page 2 (before page 1 completes)
      page1Controller.abort(); // Cancel page 1 operations
      
      const page2Controller = manager.createAbortController();
      manager.addTimeout(callbacks.page2Timer, 1500);
      
      // Simulate data fetch for page 2
      const page2Promise = new Promise((resolve) => {
        manager.addTimeout(() => {
          if (!page2Controller.signal.aborted) {
            callbacks.page2DataFetch();
            resolve('page2-data');
          }
        }, 800);
      });

      // Complete page 2 loading
      vi.advanceTimersByTime(1000);

      expect(callbacks.page1DataFetch).not.toHaveBeenCalled(); // Should be cancelled
      expect(callbacks.page2DataFetch).toHaveBeenCalledOnce();
      expect(callbacks.page1Timer).not.toHaveBeenCalled(); // Should be cancelled
      expect(callbacks.page2Timer).not.toHaveBeenCalled(); // Not yet time

      vi.advanceTimersByTime(1000);
      expect(callbacks.page2Timer).toHaveBeenCalledOnce();
    });

    it('should handle navigation change events with proper listener management', () => {
      const navigationCallbacks = {
        listener1: vi.fn(),
        listener2: vi.fn(),
        listener3: vi.fn()
      };

      // Add multiple navigation listeners
      manager.addEventListener('navigation-change', navigationCallbacks.listener1);
      manager.addEventListener('navigation-change', navigationCallbacks.listener2);
      
      // Dispatch navigation change
      dispatchNavigationChange({ from: 'home', to: 'profile' });

      expect(navigationCallbacks.listener1).toHaveBeenCalledOnce();
      expect(navigationCallbacks.listener2).toHaveBeenCalledOnce();
      expect(navigationCallbacks.listener3).not.toHaveBeenCalled();

      // Add another listener after first navigation
      manager.addEventListener('navigation-change', navigationCallbacks.listener3);

      // Dispatch another navigation change
      dispatchNavigationChange({ from: 'profile', to: 'settings' });

      expect(navigationCallbacks.listener1).toHaveBeenCalledTimes(2);
      expect(navigationCallbacks.listener2).toHaveBeenCalledTimes(2);
      expect(navigationCallbacks.listener3).toHaveBeenCalledOnce();

      // Cleanup and verify no more events are handled
      manager.cleanup();

      dispatchNavigationChange({ from: 'settings', to: 'home' });

      expect(navigationCallbacks.listener1).toHaveBeenCalledTimes(2);
      expect(navigationCallbacks.listener2).toHaveBeenCalledTimes(2);
      expect(navigationCallbacks.listener3).toHaveBeenCalledOnce();
    });
  });

  describe('Async Operation Scenarios', () => {
    it('should handle multiple concurrent async operations with proper cancellation', async () => {
      const operations = {
        fetchUser: vi.fn(),
        fetchArticles: vi.fn(),
        fetchComments: vi.fn(),
        timeout1: vi.fn(),
        timeout2: vi.fn()
      };

      // Create multiple abort controllers for different operations
      const userController = manager.createAbortController();
      const articlesController = manager.createAbortController();
      const commentsController = manager.createAbortController();

      // Simulate multiple async operations
      const userPromise = new Promise((resolve) => {
        manager.addTimeout(() => {
          if (!userController.signal.aborted) {
            operations.fetchUser();
            resolve('user-data');
          }
        }, 500);
      });

      const articlesPromise = new Promise((resolve) => {
        manager.addTimeout(() => {
          if (!articlesController.signal.aborted) {
            operations.fetchArticles();
            resolve('articles-data');
          }
        }, 1000);
      });

      const commentsPromise = new Promise((resolve) => {
        manager.addTimeout(() => {
          if (!commentsController.signal.aborted) {
            operations.fetchComments();
            resolve('comments-data');
          }
        }, 1500);
      });

      // Add some regular timeouts
      manager.addTimeout(operations.timeout1, 800);
      manager.addTimeout(operations.timeout2, 1200);

      // Let user operation complete
      vi.advanceTimersByTime(600);
      expect(operations.fetchUser).toHaveBeenCalledOnce();

      // Cancel articles operation before it completes
      articlesController.abort();

      // Let remaining operations complete
      vi.advanceTimersByTime(1000);

      expect(operations.fetchArticles).not.toHaveBeenCalled(); // Should be cancelled
      expect(operations.fetchComments).toHaveBeenCalledOnce();
      expect(operations.timeout1).toHaveBeenCalledOnce();
      expect(operations.timeout2).toHaveBeenCalledOnce();

      expect(manager.abortControllers.size).toBe(3); // All controllers still tracked
      expect(userController.signal.aborted).toBe(false);
      expect(articlesController.signal.aborted).toBe(true);
      expect(commentsController.signal.aborted).toBe(false);
    });

    it('should handle form submission with timeout and retry logic', () => {
      const formCallbacks = {
        submitAttempt: vi.fn(),
        submitSuccess: vi.fn(),
        submitError: vi.fn(),
        resetForm: vi.fn()
      };

      let submitAttempts = 0;
      const maxAttempts = 3;
      const submitDelay = 2000;

      const attemptSubmit = () => {
        submitAttempts++;
        formCallbacks.submitAttempt();

        const controller = manager.createAbortController();
        
        manager.addTimeout(() => {
          if (!controller.signal.aborted) {
            if (submitAttempts < 3) {
              // Simulate failure on first two attempts
              formCallbacks.submitError();
              manager.addTimeout(attemptSubmit, 1000); // Retry after 1 second
            } else {
              // Success on third attempt
              formCallbacks.submitSuccess();
            }
          }
        }, submitDelay);

        // Set timeout for the entire submission process
        manager.addTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
            formCallbacks.resetForm();
          }
        }, 10000); // 10 second overall timeout
      };

      // Start form submission
      attemptSubmit();

      // First attempt
      vi.advanceTimersByTime(2000);
      expect(formCallbacks.submitAttempt).toHaveBeenCalledTimes(1);
      expect(formCallbacks.submitError).toHaveBeenCalledTimes(1);

      // Second attempt (after 1 second retry delay)
      vi.advanceTimersByTime(1000);
      expect(formCallbacks.submitAttempt).toHaveBeenCalledTimes(2);
      
      vi.advanceTimersByTime(2000);
      expect(formCallbacks.submitError).toHaveBeenCalledTimes(2);

      // Third attempt (after another 1 second retry delay)
      vi.advanceTimersByTime(1000);
      expect(formCallbacks.submitAttempt).toHaveBeenCalledTimes(3);
      
      vi.advanceTimersByTime(2000);
      expect(formCallbacks.submitSuccess).toHaveBeenCalledTimes(1);
      expect(formCallbacks.resetForm).not.toHaveBeenCalled(); // Should not timeout
    });
  });

  describe('Memory Management Scenarios', () => {
    it('should prevent memory leaks with many short-lived operations', () => {
      const callbacks = Array.from({ length: 100 }, () => vi.fn());
      
      // Create many short timeouts
      callbacks.forEach((callback, index) => {
        manager.addTimeout(callback, index * 10);
      });

      expect(manager.timeouts.size).toBe(100);

      // Let all timeouts execute
      vi.advanceTimersByTime(1000);

      // All callbacks should have executed
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalledOnce();
      });

      // All timeouts should be cleaned up automatically
      expect(manager.timeouts.size).toBe(0);
    });

    it('should handle component unmount during active operations', () => {
      const callbacks = {
        shortTimeout: vi.fn(),
        longTimeout: vi.fn(),
        interval: vi.fn(),
        eventListener: vi.fn()
      };

      // Set up various operations
      manager.addTimeout(callbacks.shortTimeout, 500);
      manager.addTimeout(callbacks.longTimeout, 2000);
      manager.addInterval(callbacks.interval, 300);
      manager.addEventListener('click', callbacks.eventListener);

      const controller = manager.createAbortController();

      // Let some operations start
      vi.advanceTimersByTime(400);
      expect(callbacks.interval).toHaveBeenCalledOnce();

      // Simulate component unmount
      manager.cleanup();

      // Continue time to see if anything executes after cleanup
      vi.advanceTimersByTime(2000);

      // Only the interval that executed before cleanup should have run
      expect(callbacks.shortTimeout).not.toHaveBeenCalled();
      expect(callbacks.longTimeout).not.toHaveBeenCalled();
      expect(callbacks.interval).toHaveBeenCalledOnce(); // Only the one before cleanup
      expect(callbacks.eventListener).not.toHaveBeenCalled();
      expect(controller.signal.aborted).toBe(true);

      // Verify all resources are cleaned up
      expect(manager.timeouts.size).toBe(0);
      expect(manager.intervals.size).toBe(0);
      expect(manager.eventListeners.size).toBe(0);
      expect(manager.abortControllers.size).toBe(0);
      expect(manager.isMounted).toBe(false);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle errors in callbacks gracefully', () => {
      const callbacks = {
        errorCallback: vi.fn(() => { throw new Error('Test error'); }),
        normalCallback: vi.fn(),
        cleanupCallback: vi.fn()
      };

      // Add callbacks that will throw errors
      manager.addTimeout(callbacks.errorCallback, 500);
      manager.addTimeout(callbacks.normalCallback, 1000);
      manager.addTimeout(callbacks.cleanupCallback, 1500);

      // Execute callbacks - errors should not prevent other operations
      expect(() => {
        vi.advanceTimersByTime(600);
      }).toThrow('Test error');

      expect(callbacks.errorCallback).toHaveBeenCalledOnce();

      // Other callbacks should still execute
      vi.advanceTimersByTime(500);
      expect(callbacks.normalCallback).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(500);
      expect(callbacks.cleanupCallback).toHaveBeenCalledOnce();
    });
  });
});