/**
 * AsyncOperationManager - Utility for reliable async operations with timeout, retry, and error handling
 * 
 * Provides centralized handling of async operations with:
 * - Configurable timeout mechanisms
 * - Exponential backoff retry logic
 * - Comprehensive logging and error tracking
 * - Operation cancellation support
 * - Progress tracking and callbacks
 */

export interface AsyncOperationOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff?: boolean;
  /** Progress callback for operation steps */
  onProgress?: (step: string, attempt?: number) => void;
  /** Error callback for each failed attempt */
  onError?: (error: any, attempt: number, willRetry: boolean) => void;
  /** Success callback */
  onSuccess?: (result: any, attempt: number) => void;
  /** Operation identifier for logging */
  operationId?: string;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  duration: number;
  operationId: string;
  timedOut: boolean;
  cancelled: boolean;
}

export interface OperationTracker {
  operationId: string;
  startTime: number;
  attempts: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  lastError?: Error;
  controller: AbortController;
}

/**
 * Centralized async operation manager with comprehensive error handling
 */
export class AsyncOperationManager {
  private static activeOperations = new Map<string, OperationTracker>();
  private static operationCounter = 0;

  /**
   * Execute an async operation with retry logic and timeout handling
   */
  static async executeWithRetry<T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    options: AsyncOperationOptions = {}
  ): Promise<OperationResult<T>> {
    const {
      timeout = 30000,
      maxRetries = 3,
      retryDelay = 1000,
      exponentialBackoff = true,
      onProgress,
      onError,
      onSuccess,
      operationId = `op_${++this.operationCounter}_${Date.now()}`
    } = options;

    const startTime = Date.now();
    let controller = new AbortController();
    
    // Track the operation
    const tracker: OperationTracker = {
      operationId,
      startTime,
      attempts: 0,
      status: 'running',
      controller
    };
    
    this.activeOperations.set(operationId, tracker);

    console.log(`[AsyncOperationManager] Starting operation ${operationId}`, {
      timeout,
      maxRetries,
      retryDelay,
      exponentialBackoff
    });

    onProgress?.(`Starting operation ${operationId}`);

    let lastError: Error | null = null;
    let attempt = 0;

    try {
      while (attempt <= maxRetries) {
        attempt++;
        tracker.attempts = attempt;

        console.log(`[AsyncOperationManager] Attempt ${attempt}/${maxRetries + 1} for operation ${operationId}`);
        onProgress?.(`Attempt ${attempt}/${maxRetries + 1}`, attempt);

        try {
          // Check if operation was cancelled before starting
          if (controller.signal.aborted || tracker.status === 'cancelled') {
            throw new Error('Operation was cancelled');
          }

          // Set up timeout
          const timeoutPromise = new Promise<never>((_, reject) => {
            const timeoutId = setTimeout(() => {
              controller.abort();
              reject(new Error(`Operation timed out after ${timeout}ms`));
            }, timeout);

            // Clear timeout if operation completes
            controller.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
            });
          });

          // Execute the operation with timeout race
          const result = await Promise.race([
            operation(controller.signal),
            timeoutPromise
          ]);

          // Success
          const duration = Date.now() - startTime;
          tracker.status = 'completed';
          
          console.log(`[AsyncOperationManager] Operation ${operationId} succeeded on attempt ${attempt}`, {
            duration,
            attempts: attempt
          });

          onSuccess?.(result, attempt);
          onProgress?.(`Operation completed successfully`);

          this.activeOperations.delete(operationId);

          return {
            success: true,
            data: result,
            attempts: attempt,
            duration,
            operationId,
            timedOut: false,
            cancelled: false
          };

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          tracker.lastError = lastError;

          const isCancelled = tracker.status === 'cancelled' || lastError.message.includes('cancelled') || controller.signal.aborted;
          const isTimeout = lastError.message.includes('timed out');
          const isLastAttempt = attempt > maxRetries;

          console.warn(`[AsyncOperationManager] Attempt ${attempt} failed for operation ${operationId}`, {
            error: lastError.message,
            isCancelled,
            isTimeout,
            willRetry: !isLastAttempt && !isCancelled
          });

          onError?.(lastError, attempt, !isLastAttempt && !isCancelled);

          // If cancelled, don't retry
          if (isCancelled) {
            tracker.status = 'cancelled';
            console.log(`[AsyncOperationManager] Operation ${operationId} was cancelled on attempt ${attempt}`);
            break;
          }

          if (isTimeout) {
            tracker.status = 'timeout';
            console.error(`[AsyncOperationManager] Operation ${operationId} timed out on attempt ${attempt}`);
            
            if (isLastAttempt) {
              break;
            }
          }

          // If this was the last attempt, break
          if (isLastAttempt) {
            break;
          }

          // Calculate delay for next attempt
          const delay = exponentialBackoff 
            ? retryDelay * Math.pow(2, attempt - 1)
            : retryDelay;

          console.log(`[AsyncOperationManager] Retrying operation ${operationId} in ${delay}ms`);
          onProgress?.(`Retrying in ${delay}ms...`, attempt);

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delay));

          // Create new controller for next attempt if needed
          if (controller.signal.aborted) {
            tracker.controller = new AbortController();
            controller = tracker.controller;
          }
        }
      }

      // All attempts failed
      const duration = Date.now() - startTime;
      tracker.status = 'failed';

      console.error(`[AsyncOperationManager] Operation ${operationId} failed after ${attempt} attempts`, {
        duration,
        lastError: lastError?.message
      });

      onProgress?.(`Operation failed after ${attempt} attempts`);

      this.activeOperations.delete(operationId);

      const isCancelled = tracker.status === 'cancelled' || lastError?.message.includes('cancelled') || false;
      const isTimedOut = tracker.status === 'timeout' || lastError?.message.includes('timed out') || false;

      return {
        success: false,
        error: lastError || new Error('Unknown error'),
        attempts: attempt,
        duration,
        operationId,
        timedOut: isTimedOut,
        cancelled: isCancelled
      };

    } catch (error) {
      // Unexpected error in retry logic
      const duration = Date.now() - startTime;
      tracker.status = 'failed';
      
      const unexpectedError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`[AsyncOperationManager] Unexpected error in operation ${operationId}`, {
        error: unexpectedError.message,
        duration
      });

      this.activeOperations.delete(operationId);

      return {
        success: false,
        error: unexpectedError,
        attempts: attempt,
        duration,
        operationId,
        timedOut: false,
        cancelled: false
      };
    }
  }

  /**
   * Cancel a running operation
   */
  static cancelOperation(operationId: string): boolean {
    const tracker = this.activeOperations.get(operationId);
    if (tracker && tracker.status === 'running') {
      tracker.controller.abort();
      tracker.status = 'cancelled';
      
      console.log(`[AsyncOperationManager] Cancelled operation ${operationId}`);
      
      // Don't delete immediately - let the operation complete and handle the cancellation
      return true;
    }
    return false;
  }

  /**
   * Cancel all running operations
   */
  static cancelAllOperations(): number {
    let cancelledCount = 0;
    
    for (const [operationId, tracker] of this.activeOperations.entries()) {
      if (tracker.status === 'running') {
        tracker.controller.abort();
        tracker.status = 'cancelled';
        cancelledCount++;
      }
    }
    
    console.log(`[AsyncOperationManager] Cancelled ${cancelledCount} operations`);
    
    this.activeOperations.clear();
    return cancelledCount;
  }

  /**
   * Get status of a specific operation
   */
  static getOperationStatus(operationId: string): OperationTracker | null {
    return this.activeOperations.get(operationId) || null;
  }

  /**
   * Get all active operations
   */
  static getActiveOperations(): OperationTracker[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Check if an operation is running
   */
  static isOperationRunning(operationId: string): boolean {
    const tracker = this.activeOperations.get(operationId);
    return tracker?.status === 'running' || false;
  }

  /**
   * Cleanup completed/failed operations older than specified time
   */
  static cleanup(maxAge: number = 300000): number { // 5 minutes default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [operationId, tracker] of this.activeOperations.entries()) {
      if (tracker.status !== 'running' && (now - tracker.startTime) > maxAge) {
        this.activeOperations.delete(operationId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[AsyncOperationManager] Cleaned up ${cleanedCount} old operations`);
    }

    return cleanedCount;
  }

  /**
   * Create a wrapper for form submission operations
   */
  static createFormSubmissionWrapper<T>(
    submitFunction: (data: any, signal?: AbortSignal) => Promise<T>,
    defaultOptions: Partial<AsyncOperationOptions> = {}
  ) {
    return async (
      formData: any, 
      options: AsyncOperationOptions = {}
    ): Promise<OperationResult<T>> => {
      const mergedOptions = {
        timeout: 30000,
        maxRetries: 2,
        retryDelay: 1000,
        exponentialBackoff: true,
        operationId: `form_submit_${Date.now()}`,
        ...defaultOptions,
        ...options
      };

      return this.executeWithRetry(
        (signal) => submitFunction(formData, signal),
        mergedOptions
      );
    };
  }

  /**
   * Create a wrapper for data fetching operations
   */
  static createDataFetchWrapper<T>(
    fetchFunction: (signal?: AbortSignal) => Promise<T>,
    defaultOptions: Partial<AsyncOperationOptions> = {}
  ) {
    return async (options: AsyncOperationOptions = {}): Promise<OperationResult<T>> => {
      const mergedOptions = {
        timeout: 10000,
        maxRetries: 3,
        retryDelay: 500,
        exponentialBackoff: true,
        operationId: `data_fetch_${Date.now()}`,
        ...defaultOptions,
        ...options
      };

      return this.executeWithRetry(fetchFunction, mergedOptions);
    };
  }
}

/**
 * Utility function for simple retry operations without full tracking
 */
export async function simpleRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt <= maxRetries) {
        console.warn(`Retry attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Utility function for operations with timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
}