import { UserFriendlyErrorGenerator, ErrorContext, UserFriendlyError } from '@/utils/userFriendlyErrors';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface AdminErrorState {
  hasError: boolean;
  error: UserFriendlyError | null;
  section: string;
  timestamp: number;
  retryCount: number;
  canRetry: boolean;
  isRetrying: boolean;
}

export interface AdminErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  logErrors?: boolean;
  showUserFeedback?: boolean;
}

export class AdminErrorHandlingService {
  private static instance: AdminErrorHandlingService;
  private errorStates: Map<string, AdminErrorState> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  static getInstance(): AdminErrorHandlingService {
    if (!AdminErrorHandlingService.instance) {
      AdminErrorHandlingService.instance = new AdminErrorHandlingService();
    }
    return AdminErrorHandlingService.instance;
  }

  /**
   * Handle an error for a specific admin dashboard section
   */
  handleError(
    sectionId: string,
    error: any,
    context: ErrorContext,
    options: AdminErrorHandlerOptions = {}
  ): AdminErrorState {
    const {
      maxRetries = 3,
      logErrors = true,
      showUserFeedback = true
    } = options;

    // Log error for debugging without affecting user experience
    if (logErrors) {
      logger.error(LogSource.DASHBOARD, `Admin dashboard error in ${sectionId}`, {
        error: error.message || error,
        context,
        timestamp: new Date().toISOString()
      });
    }

    // Generate user-friendly error message
    const userFriendlyError = this.generateUserFriendlyError(error, context);

    // Get current error state or create new one
    const currentState = this.errorStates.get(sectionId);
    const retryCount = currentState ? currentState.retryCount + 1 : 0;

    const errorState: AdminErrorState = {
      hasError: true,
      error: userFriendlyError,
      section: sectionId,
      timestamp: Date.now(),
      retryCount,
      canRetry: retryCount < maxRetries && userFriendlyError.retryable,
      isRetrying: false
    };

    this.errorStates.set(sectionId, errorState);

    // Clear any existing retry timeout
    const existingTimeout = this.retryTimeouts.get(sectionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    return errorState;
  }

  /**
   * Clear error state for a section
   */
  clearError(sectionId: string): void {
    this.errorStates.delete(sectionId);
    
    const timeout = this.retryTimeouts.get(sectionId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(sectionId);
    }
  }

  /**
   * Get current error state for a section
   */
  getErrorState(sectionId: string): AdminErrorState | null {
    return this.errorStates.get(sectionId) || null;
  }

  /**
   * Retry an operation for a section
   */
  async retryOperation<T>(
    sectionId: string,
    operation: () => Promise<T>,
    options: AdminErrorHandlerOptions = {}
  ): Promise<T> {
    const { retryDelay = 1000 } = options;
    const currentState = this.errorStates.get(sectionId);

    if (!currentState || !currentState.canRetry) {
      throw new Error('Cannot retry operation');
    }

    // Update state to show retrying
    const retryingState: AdminErrorState = {
      ...currentState,
      isRetrying: true,
      retryCount: currentState.retryCount + 1
    };
    this.errorStates.set(sectionId, retryingState);

    try {
      // Add delay before retry to prevent rapid successive calls
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      const result = await operation();
      
      // Clear error state on success
      this.clearError(sectionId);
      
      logger.info(LogSource.DASHBOARD, `Retry successful for ${sectionId}`, {
        retryCount: retryingState.retryCount
      });

      return result;
    } catch (error) {
      // Handle retry failure
      const context: ErrorContext = {
        operation: 'retry',
        component: sectionId,
        userAction: 'manual_retry'
      };

      return Promise.reject(this.handleError(sectionId, error, context, options));
    }
  }

  /**
   * Execute operation with automatic error handling
   */
  async executeWithErrorHandling<T>(
    sectionId: string,
    operation: () => Promise<T>,
    context: ErrorContext,
    options: AdminErrorHandlerOptions = {}
  ): Promise<T | null> {
    try {
      // Clear any existing error state
      this.clearError(sectionId);
      
      const result = await operation();
      return result;
    } catch (error) {
      this.handleError(sectionId, error, context, options);
      return null;
    }
  }

  /**
   * Generate user-friendly error message based on error type
   */
  private generateUserFriendlyError(error: any, context: ErrorContext): UserFriendlyError {
    // Handle specific admin dashboard errors
    if (error.message?.includes('dashboard')) {
      return {
        title: 'Dashboard Loading Error',
        message: 'Unable to load dashboard information. This may be due to a temporary server issue.',
        details: error.message,
        nextSteps: [
          'Try refreshing this section',
          'Check your internet connection',
          'Contact support if the problem persists'
        ],
        retryable: true,
        retryLabel: 'Retry Loading'
      };
    }

    // Handle metrics loading errors
    if (context.operation === 'load_metrics') {
      return {
        title: 'Metrics Unavailable',
        message: 'Unable to load dashboard metrics at this time.',
        details: error.message,
        nextSteps: [
          'Try refreshing the metrics section',
          'Check back in a few minutes',
          'Other dashboard sections may still work'
        ],
        retryable: true,
        retryLabel: 'Reload Metrics'
      };
    }

    // Handle activity feed errors
    if (context.operation === 'load_activities') {
      return {
        title: 'Activity Feed Unavailable',
        message: 'Unable to load recent activity information.',
        details: error.message,
        nextSteps: [
          'Try refreshing the activity feed',
          'Check your permissions',
          'Other dashboard sections may still work'
        ],
        retryable: true,
        retryLabel: 'Reload Activity'
      };
    }

    // Use general error generator for other cases
    return UserFriendlyErrorGenerator.generateDataLoadingError(error, context);
  }

  /**
   * Get all current error states (for debugging)
   */
  getAllErrorStates(): Map<string, AdminErrorState> {
    return new Map(this.errorStates);
  }

  /**
   * Check if any section has errors
   */
  hasAnyErrors(): boolean {
    return this.errorStates.size > 0;
  }

  /**
   * Get sections with errors
   */
  getSectionsWithErrors(): string[] {
    return Array.from(this.errorStates.keys());
  }
}

// Export singleton instance
export const adminErrorHandler = AdminErrorHandlingService.getInstance();