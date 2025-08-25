/**
 * Loading State Manager
 * 
 * Provides utilities for managing loading states with debouncing,
 * timeout handling, and preventing rapid successive API calls.
 */

export interface LoadingStateOptions {
  /** Minimum time to show loading state (prevents flashing) */
  minLoadingTime?: number;
  /** Maximum time before timing out */
  timeout?: number;
  /** Debounce time for rapid successive calls */
  debounceTime?: number;
}

export interface LoadingState {
  isLoading: boolean;
  isDebouncing: boolean;
  hasTimedOut: boolean;
  startTime: number | null;
}

export class LoadingStateManager {
  private state: LoadingState = {
    isLoading: false,
    isDebouncing: false,
    hasTimedOut: false,
    startTime: null
  };

  private options: Required<LoadingStateOptions>;
  private debounceTimer: NodeJS.Timeout | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private minLoadingTimer: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor(options: LoadingStateOptions = {}) {
    this.options = {
      minLoadingTime: options.minLoadingTime ?? 300, // Prevent flashing
      timeout: options.timeout ?? 30000, // 30 second timeout
      debounceTime: options.debounceTime ?? 500 // 500ms debounce
    };
  }

  /**
   * Start loading with debouncing and timeout handling
   */
  startLoading(): Promise<void> {
    // Clear any existing timers
    this.clearTimers();

    // If already loading, debounce the request
    if (this.state.isLoading) {
      this.state.isDebouncing = true;
      return new Promise((resolve) => {
        this.debounceTimer = setTimeout(() => {
          this.state.isDebouncing = false;
          resolve();
        }, this.options.debounceTime);
      });
    }

    // Start loading immediately
    this.state.isLoading = true;
    this.state.hasTimedOut = false;
    this.state.startTime = Date.now();

    // Create new abort controller
    this.abortController = new AbortController();

    // Set timeout timer - but don't reject the startLoading promise
    this.timeoutTimer = setTimeout(() => {
      this.state.hasTimedOut = true;
      this.abortController?.abort();
    }, this.options.timeout);

    return Promise.resolve();
  }

  private stopPromise: Promise<void> | null = null;

  /**
   * Stop loading with minimum loading time enforcement
   */
  stopLoading(): Promise<void> {
    if (!this.state.isLoading) {
      return Promise.resolve();
    }

    // If already stopping, return the existing promise
    if (this.stopPromise) {
      return this.stopPromise;
    }

    const elapsed = this.state.startTime ? Date.now() - this.state.startTime : 0;
    const remainingMinTime = Math.max(0, this.options.minLoadingTime - elapsed);

    if (remainingMinTime > 0) {
      // Wait for minimum loading time
      this.stopPromise = new Promise((resolve) => {
        this.minLoadingTimer = setTimeout(() => {
          this.finishLoading();
          this.stopPromise = null;
          resolve();
        }, remainingMinTime);
      });
      return this.stopPromise;
    } else {
      this.finishLoading();
      return Promise.resolve();
    }
  }

  private finishLoading(): void {
    this.state.isLoading = false;
    this.state.startTime = null;
    this.stopPromise = null;
    this.clearTimers();
  }

  /**
   * Get current loading state
   */
  getState(): Readonly<LoadingState> {
    return { ...this.state };
  }

  /**
   * Get abort controller for request cancellation
   */
  getAbortController(): AbortController | null {
    return this.abortController;
  }

  /**
   * Check if should show loading indicator
   */
  shouldShowLoading(): boolean {
    return this.state.isLoading && !this.state.isDebouncing;
  }

  /**
   * Check if request has timed out
   */
  hasTimedOut(): boolean {
    return this.state.hasTimedOut;
  }

  /**
   * Reset all state and timers
   */
  reset(): void {
    this.clearTimers();
    this.state = {
      isLoading: false,
      isDebouncing: false,
      hasTimedOut: false,
      startTime: null
    };
    this.abortController = null;
    this.stopPromise = null;
  }

  /**
   * Clean up all timers and abort controllers
   */
  cleanup(): void {
    this.clearTimers();
    this.abortController?.abort();
    this.abortController = null;
    this.stopPromise = null;
    // Reset loading state when cleaning up
    this.state.isLoading = false;
    this.state.startTime = null;
  }

  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.minLoadingTimer) {
      clearTimeout(this.minLoadingTimer);
      this.minLoadingTimer = null;
    }
  }
}

/**
 * Hook for using loading state manager
 */
import { useRef, useEffect, useState } from 'react';

export const useLoadingStateManager = (options?: LoadingStateOptions) => {
  const managerRef = useRef<LoadingStateManager | null>(null);
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    isDebouncing: false,
    hasTimedOut: false,
    startTime: null
  });

  // Initialize manager
  if (!managerRef.current) {
    managerRef.current = new LoadingStateManager(options);
  }

  // Update state when manager state changes
  useEffect(() => {
    const manager = managerRef.current!;
    const interval = setInterval(() => {
      setState(manager.getState());
    }, 50); // Check state every 50ms

    return () => {
      clearInterval(interval);
      manager.cleanup();
    };
  }, []);

  const startLoading = async () => {
    try {
      await managerRef.current!.startLoading();
      setState(managerRef.current!.getState());
    } catch (error) {
      setState(managerRef.current!.getState());
      throw error;
    }
  };

  const stopLoading = async () => {
    await managerRef.current!.stopLoading();
    setState(managerRef.current!.getState());
  };

  return {
    state,
    startLoading,
    stopLoading,
    shouldShowLoading: () => managerRef.current!.shouldShowLoading(),
    hasTimedOut: () => managerRef.current!.hasTimedOut(),
    getAbortController: () => managerRef.current!.getAbortController(),
    reset: () => {
      managerRef.current!.reset();
      setState(managerRef.current!.getState());
    }
  };
};