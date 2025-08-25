/**
 * Unit tests for useComponentLifecycle hook
 * 
 * Tests React hook integration and lifecycle management in React components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComponentLifecycle, useNavigationChangeListener } from '../componentLifecycleManager';

describe('useComponentLifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize lifecycle manager with default component ID', () => {
    const { result } = renderHook(() => useComponentLifecycle());

    expect(result.current.lifecycleManager).toBeDefined();
    expect(result.current.isMounted).toBe(true);
    expect(result.current.lifecycleManager.getStatus().componentId).toMatch(/^component_\d+_/);
  });

  it('should initialize lifecycle manager with custom component ID', () => {
    const { result } = renderHook(() => useComponentLifecycle('custom-component'));

    expect(result.current.lifecycleManager.getStatus().componentId).toBe('custom-component');
  });

  it('should provide memoized methods', () => {
    const { result, rerender } = renderHook(() => useComponentLifecycle('test-component'));

    const initialMethods = {
      addTimeout: result.current.addTimeout,
      addInterval: result.current.addInterval,
      addEventListener: result.current.addEventListener,
      createAbortController: result.current.createAbortController,
      safeSetState: result.current.safeSetState,
      dispatchNavigationChange: result.current.dispatchNavigationChange
    };

    rerender();

    // Methods should be the same reference (memoized)
    expect(result.current.addTimeout).toBe(initialMethods.addTimeout);
    expect(result.current.addInterval).toBe(initialMethods.addInterval);
    expect(result.current.addEventListener).toBe(initialMethods.addEventListener);
    expect(result.current.createAbortController).toBe(initialMethods.createAbortController);
    expect(result.current.safeSetState).toBe(initialMethods.safeSetState);
    expect(result.current.dispatchNavigationChange).toBe(initialMethods.dispatchNavigationChange);
  });

  it('should handle timeout operations through hook', () => {
    const { result } = renderHook(() => useComponentLifecycle('timeout-test'));
    const callback = vi.fn();

    act(() => {
      result.current.addTimeout(callback, 1000);
    });

    expect(result.current.lifecycleManager.timeouts.size).toBe(1);
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(result.current.lifecycleManager.timeouts.size).toBe(0);
  });

  it('should handle interval operations through hook', () => {
    const { result } = renderHook(() => useComponentLifecycle('interval-test'));
    const callback = vi.fn();

    act(() => {
      result.current.addInterval(callback, 500);
    });

    expect(result.current.lifecycleManager.intervals.size).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should handle event listeners through hook', () => {
    const { result } = renderHook(() => useComponentLifecycle('event-test'));
    const listener = vi.fn();
    const mockTarget = new EventTarget();

    act(() => {
      result.current.addEventListener('click', listener, mockTarget);
    });

    expect(result.current.lifecycleManager.eventListeners.size).toBe(1);

    const event = new Event('click');
    mockTarget.dispatchEvent(event);

    expect(listener).toHaveBeenCalledWith(event);
  });

  it('should handle abort controllers through hook', () => {
    const { result } = renderHook(() => useComponentLifecycle('abort-test'));

    let controller: AbortController;
    act(() => {
      controller = result.current.createAbortController();
    });

    expect(result.current.lifecycleManager.abortControllers.size).toBe(1);
    expect(controller!.signal.aborted).toBe(false);
  });

  it('should handle safe state updates through hook', () => {
    const { result } = renderHook(() => useComponentLifecycle('state-test'));
    const setter = vi.fn();

    act(() => {
      result.current.safeSetState(setter, 'test-value');
    });

    expect(setter).toHaveBeenCalledWith('test-value');
  });

  it('should dispatch navigation change events through hook', () => {
    const { result } = renderHook(() => useComponentLifecycle('navigation-test'));
    const listener = vi.fn();
    
    window.addEventListener('navigation-change', listener);

    act(() => {
      result.current.dispatchNavigationChange({ page: 'test' });
    });

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.page).toBe('test');

    window.removeEventListener('navigation-change', listener);
  });

  it('should cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useComponentLifecycle('cleanup-test'));
    const callback = vi.fn();

    act(() => {
      result.current.addTimeout(callback, 1000);
      result.current.addInterval(() => {}, 500);
      result.current.addEventListener('click', () => {});
      result.current.createAbortController();
    });

    expect(result.current.lifecycleManager.timeouts.size).toBe(1);
    expect(result.current.lifecycleManager.intervals.size).toBe(1);
    expect(result.current.lifecycleManager.eventListeners.size).toBe(1);
    expect(result.current.lifecycleManager.abortControllers.size).toBe(1);
    expect(result.current.isMounted).toBe(true);

    unmount();

    // Advance timers to ensure callbacks don't execute after unmount
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useNavigationChangeListener', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should listen to navigation change events', () => {
    const callback = vi.fn();
    
    renderHook(() => useNavigationChangeListener(callback));

    const event = new CustomEvent('navigation-change', { 
      detail: { page: 'home' } 
    });
    
    act(() => {
      window.dispatchEvent(event);
    });

    expect(callback).toHaveBeenCalledWith(event);
  });

  it('should handle dependencies correctly', () => {
    const callback = vi.fn();
    let dependency = 'initial';
    
    const { rerender } = renderHook(
      ({ dep }) => useNavigationChangeListener(callback, [dep]),
      { initialProps: { dep: dependency } }
    );

    const event1 = new CustomEvent('navigation-change', { 
      detail: { page: 'page1' } 
    });
    
    act(() => {
      window.dispatchEvent(event1);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Change dependency and rerender
    dependency = 'changed';
    rerender({ dep: dependency });

    const event2 = new CustomEvent('navigation-change', { 
      detail: { page: 'page2' } 
    });
    
    act(() => {
      window.dispatchEvent(event2);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should cleanup event listener on unmount', () => {
    const callback = vi.fn();
    
    const { unmount } = renderHook(() => useNavigationChangeListener(callback));

    unmount();

    const event = new CustomEvent('navigation-change', { 
      detail: { page: 'test' } 
    });
    
    act(() => {
      window.dispatchEvent(event);
    });

    // Callback should not be called after unmount
    expect(callback).not.toHaveBeenCalled();
  });
});