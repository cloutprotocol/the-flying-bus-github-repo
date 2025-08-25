/**
 * Unit tests for ComponentLifecycleManager
 * 
 * Tests all lifecycle management functionality including:
 * - Timeout and interval management
 * - Event listener cleanup
 * - AbortController management
 * - Safe state updates
 * - Comprehensive cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentLifecycleManager, createLifecycleManager, dispatchNavigationChange } from '../componentLifecycleManager';

describe('ComponentLifecycleManager', () => {
  let manager: ComponentLifecycleManager;
  let mockEventTarget: EventTarget;

  beforeEach(() => {
    manager = new ComponentLifecycleManager('test-component', true);
    mockEventTarget = new EventTarget();
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager.cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Timeout Management', () => {
    it('should add and track timeouts', () => {
      const callback = vi.fn();
      const timeoutId = manager.addTimeout(callback, 1000);

      expect(manager.timeouts.has(timeoutId)).toBe(true);
      expect(manager.timeouts.size).toBe(1);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledOnce();
      expect(manager.timeouts.size).toBe(0);
    });

    it('should not execute timeout callback if component is unmounted', () => {
      const callback = vi.fn();
      manager.addTimeout(callback, 1000);
      
      manager.isMounted = false;
      vi.advanceTimersByTime(1000);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not add timeout if component is already unmounted', () => {
      manager.isMounted = false;
      const callback = vi.fn();
      const timeoutId = manager.addTimeout(callback, 1000);

      expect(manager.timeouts.size).toBe(0);
      vi.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear all timeouts on cleanup', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      manager.addTimeout(callback1, 1000);
      manager.addTimeout(callback2, 2000);
      
      expect(manager.timeouts.size).toBe(2);
      
      manager.cleanup();
      
      expect(manager.timeouts.size).toBe(0);
      expect(manager.isMounted).toBe(false);
      
      vi.advanceTimersByTime(3000);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Interval Management', () => {
    it('should add and track intervals', () => {
      const callback = vi.fn();
      const intervalId = manager.addInterval(callback, 1000);

      expect(manager.intervals.has(intervalId)).toBe(true);
      expect(manager.intervals.size).toBe(1);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should stop interval execution when component unmounts', () => {
      const callback = vi.fn();
      manager.addInterval(callback, 1000);

      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledOnce();

      manager.isMounted = false;
      vi.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledOnce(); // Should not be called again
    });

    it('should not add interval if component is already unmounted', () => {
      manager.isMounted = false;
      const callback = vi.fn();
      manager.addInterval(callback, 1000);

      expect(manager.intervals.size).toBe(0);
      vi.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear all intervals on cleanup', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      manager.addInterval(callback1, 1000);
      manager.addInterval(callback2, 500);
      
      expect(manager.intervals.size).toBe(2);
      
      vi.advanceTimersByTime(500);
      expect(callback2).toHaveBeenCalledOnce();
      
      manager.cleanup();
      
      expect(manager.intervals.size).toBe(0);
      
      vi.advanceTimersByTime(1000);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledOnce(); // Should not be called again
    });
  });

  describe('Event Listener Management', () => {
    it('should add and track event listeners', () => {
      const listener = vi.fn();
      manager.addEventListener('click', listener, mockEventTarget);

      expect(manager.eventListeners.size).toBe(1);

      const event = new Event('click');
      mockEventTarget.dispatchEvent(event);
      expect(listener).toHaveBeenCalledWith(event);
    });

    it('should not execute listener if component is unmounted', () => {
      const listener = vi.fn();
      manager.addEventListener('click', listener, mockEventTarget);

      manager.isMounted = false;

      const event = new Event('click');
      mockEventTarget.dispatchEvent(event);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should not add event listener if component is already unmounted', () => {
      manager.isMounted = false;
      const listener = vi.fn();
      manager.addEventListener('click', listener, mockEventTarget);

      expect(manager.eventListeners.size).toBe(0);
    });

    it('should remove all event listeners on cleanup', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      manager.addEventListener('click', listener1, mockEventTarget);
      manager.addEventListener('keydown', listener2, mockEventTarget);
      
      expect(manager.eventListeners.size).toBe(2);
      
      manager.cleanup();
      
      expect(manager.eventListeners.size).toBe(0);
      
      // Events should not trigger listeners after cleanup
      mockEventTarget.dispatchEvent(new Event('click'));
      mockEventTarget.dispatchEvent(new Event('keydown'));
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should use window as default target', () => {
      const listener = vi.fn();
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      manager.addEventListener('resize', listener);
      
      expect(addEventListenerSpy).toHaveBeenCalled();
      expect(manager.eventListeners.size).toBe(1);
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('AbortController Management', () => {
    it('should create and track abort controllers', () => {
      const controller = manager.createAbortController();

      expect(manager.abortControllers.has(controller)).toBe(true);
      expect(manager.abortControllers.size).toBe(1);
      expect(controller.signal.aborted).toBe(false);
    });

    it('should return aborted controller if component is unmounted', () => {
      manager.isMounted = false;
      const controller = manager.createAbortController();

      expect(controller.signal.aborted).toBe(true);
      expect(manager.abortControllers.size).toBe(0);
    });

    it('should abort all controllers on cleanup', () => {
      const controller1 = manager.createAbortController();
      const controller2 = manager.createAbortController();

      expect(controller1.signal.aborted).toBe(false);
      expect(controller2.signal.aborted).toBe(false);
      expect(manager.abortControllers.size).toBe(2);

      manager.cleanup();

      expect(controller1.signal.aborted).toBe(true);
      expect(controller2.signal.aborted).toBe(true);
      expect(manager.abortControllers.size).toBe(0);
    });
  });

  describe('Safe State Updates', () => {
    it('should execute state setter when component is mounted', () => {
      const setter = vi.fn();
      const value = 'test-value';

      manager.safeSetState(setter, value);

      expect(setter).toHaveBeenCalledWith(value);
    });

    it('should not execute state setter when component is unmounted', () => {
      const setter = vi.fn();
      const value = 'test-value';

      manager.isMounted = false;
      manager.safeSetState(setter, value);

      expect(setter).not.toHaveBeenCalled();
    });
  });

  describe('Comprehensive Cleanup', () => {
    it('should cleanup all resources and mark as unmounted', () => {
      const timeoutCallback = vi.fn();
      const intervalCallback = vi.fn();
      const eventListener = vi.fn();
      
      // Add various resources
      manager.addTimeout(timeoutCallback, 1000);
      manager.addInterval(intervalCallback, 500);
      manager.addEventListener('click', eventListener, mockEventTarget);
      const controller = manager.createAbortController();

      expect(manager.isMounted).toBe(true);
      expect(manager.timeouts.size).toBe(1);
      expect(manager.intervals.size).toBe(1);
      expect(manager.eventListeners.size).toBe(1);
      expect(manager.abortControllers.size).toBe(1);
      expect(controller.signal.aborted).toBe(false);

      // Cleanup
      manager.cleanup();

      expect(manager.isMounted).toBe(false);
      expect(manager.timeouts.size).toBe(0);
      expect(manager.intervals.size).toBe(0);
      expect(manager.eventListeners.size).toBe(0);
      expect(manager.abortControllers.size).toBe(0);
      expect(controller.signal.aborted).toBe(true);

      // Verify nothing executes after cleanup
      vi.advanceTimersByTime(2000);
      mockEventTarget.dispatchEvent(new Event('click'));
      
      expect(timeoutCallback).not.toHaveBeenCalled();
      expect(intervalCallback).not.toHaveBeenCalled();
      expect(eventListener).not.toHaveBeenCalled();
    });
  });

  describe('Status and Debugging', () => {
    it('should provide accurate status information', () => {
      manager.addTimeout(() => {}, 1000);
      manager.addInterval(() => {}, 500);
      manager.addEventListener('click', () => {}, mockEventTarget);
      manager.createAbortController();

      const status = manager.getStatus();

      expect(status).toEqual({
        componentId: 'test-component',
        isMounted: true,
        activeTimeouts: 1,
        activeIntervals: 1,
        activeEventListeners: 1,
        activeAbortControllers: 1
      });
    });
  });
});

describe('Factory Functions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create lifecycle manager with factory function', () => {
    const manager = createLifecycleManager('factory-test', true);
    
    expect(manager).toBeInstanceOf(ComponentLifecycleManager);
    expect(manager.isMounted).toBe(true);
    expect(manager.getStatus().componentId).toBe('factory-test');
    
    manager.cleanup();
  });

  it('should dispatch navigation change events', () => {
    const listener = vi.fn();
    window.addEventListener('navigation-change', listener);

    const detail = { page: 'home', userId: '123' };
    dispatchNavigationChange(detail);

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('navigation-change');
    expect(event.detail).toMatchObject(detail);
    expect(event.detail.timestamp).toBeTypeOf('number');

    window.removeEventListener('navigation-change', listener);
  });
});