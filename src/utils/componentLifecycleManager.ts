/**
 * ComponentLifecycleManager - Utility for managing component lifecycle and cleanup
 * 
 * Provides centralized management of:
 * - Component mount/unmount tracking
 * - Timeout and interval cleanup
 * - Event listener management
 * - Async operation cancellation
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

export interface LifecycleManager {
  isMounted: boolean;
  timeouts: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Interval>;
  eventListeners: Map<string, EventListener>;
  abortControllers: Set<AbortController>;
  
  addTimeout(callback: () => void, delay: number): NodeJS.Timeout;
  addInterval(callback: () => void, delay: number): NodeJS.Interval;
  addEventListener(event: string, listener: EventListener, target?: EventTarget): void;
  createAbortController(): AbortController;
  safeSetState<T>(setter: (value: T) => void, value: T): void;
  cleanup(): void;
}

export class ComponentLifecycleManager implements LifecycleManager {
  public isMounted: boolean = true;
  public timeouts: Set<NodeJS.Timeout> = new Set();
  public intervals: Set<NodeJS.Interval> = new Set();
  public eventListeners: Map<string, EventListener> = new Map();
  public abortControllers: Set<AbortController> = new Set();
  
  private componentId: string;
  private debugMode: boolean;

  constructor(componentId: string = 'unknown', debugMode: boolean = false) {
    this.componentId = componentId;
    this.debugMode = debugMode;
    
    if (this.debugMode) {
      console.log(`[ComponentLifecycle] ${this.componentId} - Manager created`);
    }
  }

  /**
   * Add a timeout with automatic cleanup tracking
   * Requirement 6.5: Clear timeouts in cleanup functions to prevent memory leaks
   */
  addTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    if (!this.isMounted) {
      if (this.debugMode) {
        console.warn(`[ComponentLifecycle] ${this.componentId} - Attempted to add timeout after unmount`);
      }
      return setTimeout(() => {}, 0); // Return dummy timeout
    }

    const timeoutId = setTimeout(() => {
      if (this.isMounted) {
        callback();
      }
      this.timeouts.delete(timeoutId);
    }, delay);

    this.timeouts.add(timeoutId);
    
    if (this.debugMode) {
      console.log(`[ComponentLifecycle] ${this.componentId} - Timeout added (${delay}ms), total: ${this.timeouts.size}`);
    }

    return timeoutId;
  }

  /**
   * Add an interval with automatic cleanup tracking
   * Requirement 6.5: Clear intervals in cleanup functions to prevent memory leaks
   */
  addInterval(callback: () => void, delay: number): NodeJS.Interval {
    if (!this.isMounted) {
      if (this.debugMode) {
        console.warn(`[ComponentLifecycle] ${this.componentId} - Attempted to add interval after unmount`);
      }
      return setInterval(() => {}, delay); // Return dummy interval
    }

    const intervalId = setInterval(() => {
      if (this.isMounted) {
        callback();
      } else {
        clearInterval(intervalId);
        this.intervals.delete(intervalId);
      }
    }, delay);

    this.intervals.add(intervalId);
    
    if (this.debugMode) {
      console.log(`[ComponentLifecycle] ${this.componentId} - Interval added (${delay}ms), total: ${this.intervals.size}`);
    }

    return intervalId;
  }

  /**
   * Add event listener with automatic cleanup tracking
   * Requirement 6.3: Properly remove event listeners in cleanup functions
   * Requirement 6.6: Ensure proper event listener cleanup
   */
  addEventListener(event: string, listener: EventListener, target: EventTarget = window): void {
    if (!this.isMounted) {
      if (this.debugMode) {
        console.warn(`[ComponentLifecycle] ${this.componentId} - Attempted to add event listener after unmount`);
      }
      return;
    }

    const eventKey = `${event}_${Date.now()}_${Math.random()}`;
    
    // Wrap listener to check mount status
    const wrappedListener = (event: Event) => {
      if (this.isMounted) {
        listener(event);
      }
    };

    target.addEventListener(event, wrappedListener);
    this.eventListeners.set(eventKey, wrappedListener);
    
    if (this.debugMode) {
      console.log(`[ComponentLifecycle] ${this.componentId} - Event listener added (${event}), total: ${this.eventListeners.size}`);
    }

    // Store reference to target for cleanup
    (wrappedListener as any).__target = target;
    (wrappedListener as any).__event = event;
  }

  /**
   * Create AbortController for request cancellation
   * Requirement 6.2: Cancel previous requests before starting new ones
   * Requirement 6.4: Handle component unmounting gracefully during async operations
   */
  createAbortController(): AbortController {
    if (!this.isMounted) {
      if (this.debugMode) {
        console.warn(`[ComponentLifecycle] ${this.componentId} - Attempted to create AbortController after unmount`);
      }
      const controller = new AbortController();
      controller.abort(); // Immediately abort if component is unmounted
      return controller;
    }

    const controller = new AbortController();
    this.abortControllers.add(controller);
    
    if (this.debugMode) {
      console.log(`[ComponentLifecycle] ${this.componentId} - AbortController created, total: ${this.abortControllers.size}`);
    }

    return controller;
  }

  /**
   * Safe state setter that checks mount status
   * Requirement 6.1: Use isMounted flags to prevent state updates after unmounting
   * Requirement 6.4: Handle component unmounting gracefully during async operations
   */
  safeSetState<T>(setter: (value: T) => void, value: T): void {
    if (this.isMounted) {
      setter(value);
    } else if (this.debugMode) {
      console.warn(`[ComponentLifecycle] ${this.componentId} - Prevented state update after unmount`);
    }
  }

  /**
   * Cleanup all managed resources
   * Requirements 6.1-6.6: Comprehensive cleanup of all lifecycle resources
   */
  cleanup(): void {
    if (this.debugMode) {
      console.log(`[ComponentLifecycle] ${this.componentId} - Starting cleanup`, {
        timeouts: this.timeouts.size,
        intervals: this.intervals.size,
        eventListeners: this.eventListeners.size,
        abortControllers: this.abortControllers.size
      });
    }

    // Mark as unmounted first
    this.isMounted = false;

    // Clear all timeouts
    this.timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.timeouts.clear();

    // Clear all intervals
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.intervals.clear();

    // Remove all event listeners
    this.eventListeners.forEach((listener, eventKey) => {
      const target = (listener as any).__target || window;
      const event = (listener as any).__event;
      if (target && event) {
        target.removeEventListener(event, listener);
      }
    });
    this.eventListeners.clear();

    // Abort all controllers
    this.abortControllers.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    this.abortControllers.clear();

    if (this.debugMode) {
      console.log(`[ComponentLifecycle] ${this.componentId} - Cleanup completed`);
    }
  }

  /**
   * Get current status for debugging
   */
  getStatus() {
    return {
      componentId: this.componentId,
      isMounted: this.isMounted,
      activeTimeouts: this.timeouts.size,
      activeIntervals: this.intervals.size,
      activeEventListeners: this.eventListeners.size,
      activeAbortControllers: this.abortControllers.size
    };
  }
}

/**
 * Factory function for creating lifecycle managers
 */
export function createLifecycleManager(componentId?: string, debugMode?: boolean): ComponentLifecycleManager {
  return new ComponentLifecycleManager(componentId, debugMode);
}

/**
 * Utility function for navigation change events
 * Requirement 6.6: Ensure proper event listener cleanup for custom events
 */
export function dispatchNavigationChange(detail?: any): void {
  const event = new CustomEvent('navigation-change', { 
    detail: {
      timestamp: Date.now(),
      ...detail
    }
  });
  window.dispatchEvent(event);
}
/*
*
 * React Hook for Component Lifecycle Management
 * 
 * Provides easy integration of lifecycle management in React components
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { useEffect, useRef, useCallback } from 'react';

export interface UseComponentLifecycleReturn {
  lifecycleManager: ComponentLifecycleManager;
  isMounted: boolean;
  addTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  addInterval: (callback: () => void, delay: number) => NodeJS.Interval;
  addEventListener: (event: string, listener: EventListener, target?: EventTarget) => void;
  createAbortController: () => AbortController;
  safeSetState: <T>(setter: (value: T) => void, value: T) => void;
  dispatchNavigationChange: (detail?: any) => void;
}

export function useComponentLifecycle(
  componentId?: string, 
  debugMode: boolean = false
): UseComponentLifecycleReturn {
  const lifecycleManagerRef = useRef<ComponentLifecycleManager | null>(null);

  // Initialize lifecycle manager
  if (!lifecycleManagerRef.current) {
    const id = componentId || `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    lifecycleManagerRef.current = new ComponentLifecycleManager(id, debugMode);
  }

  const lifecycleManager = lifecycleManagerRef.current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lifecycleManagerRef.current) {
        lifecycleManagerRef.current.cleanup();
      }
    };
  }, []);

  // Memoized methods to prevent unnecessary re-renders
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    return lifecycleManager.addTimeout(callback, delay);
  }, [lifecycleManager]);

  const addInterval = useCallback((callback: () => void, delay: number) => {
    return lifecycleManager.addInterval(callback, delay);
  }, [lifecycleManager]);

  const addEventListener = useCallback((event: string, listener: EventListener, target?: EventTarget) => {
    lifecycleManager.addEventListener(event, listener, target);
  }, [lifecycleManager]);

  const createAbortController = useCallback(() => {
    return lifecycleManager.createAbortController();
  }, [lifecycleManager]);

  const safeSetState = useCallback(<T,>(setter: (value: T) => void, value: T) => {
    lifecycleManager.safeSetState(setter, value);
  }, [lifecycleManager]);

  const dispatchNavigationChangeCallback = useCallback((detail?: any) => {
    dispatchNavigationChange(detail);
  }, []);

  return {
    lifecycleManager,
    isMounted: lifecycleManager.isMounted,
    addTimeout,
    addInterval,
    addEventListener,
    createAbortController,
    safeSetState,
    dispatchNavigationChange: dispatchNavigationChangeCallback
  };
}

/**
 * Hook for navigation change events
 * Requirement 6.6: Ensure proper event listener cleanup for navigation events
 */
export function useNavigationChangeListener(
  callback: (event: CustomEvent) => void,
  dependencies: any[] = []
): void {
  useEffect(() => {
    const wrappedCallback = (event: Event) => {
      callback(event as CustomEvent);
    };

    window.addEventListener('navigation-change', wrappedCallback);
    
    return () => {
      window.removeEventListener('navigation-change', wrappedCallback);
    };
  }, dependencies);
}