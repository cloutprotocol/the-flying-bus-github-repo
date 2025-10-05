import { AuthError } from '@supabase/supabase-js';

// Error types for registration flows
export interface RegistrationError extends Error {
  code: string;
  type: 'validation' | 'rls' | 'network' | 'session' | 'invitation' | 'unknown';
  retryable: boolean;
  userMessage: string;
  technicalDetails?: string;
  context?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ErrorHandlingResult {
  success: boolean;
  error?: RegistrationError;
  shouldRetry: boolean;
  retryAfter?: number;
  userMessage: string;
}

export class RegistrationErrorHandler {
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  /**
   * Handle validation errors from form inputs
   */
  handleValidationError(error: Error, context?: Record<string, any>): RegistrationError {
    return {
      name: 'ValidationError',
      message: error.message,
      code: 'VALIDATION_FAILED',
      type: 'validation',
      retryable: false,
      userMessage: this.getValidationErrorMessage(error.message),
      technicalDetails: error.message,
      context
    };
  }

  /**
   * Handle RLS policy violations during profile creation
   */
  handleRLSError(error: AuthError | Error, context?: Record<string, any>): RegistrationError {
    const isRLSError = this.isRLSPolicyError(error);
    
    return {
      name: 'RLSPolicyError',
      message: error.message,
      code: isRLSError ? 'RLS_POLICY_VIOLATION' : 'PERMISSION_DENIED',
      type: 'rls',
      retryable: true, // Can retry with service role escalation
      userMessage: 'There was an issue creating your account. Please try again.',
      technicalDetails: error.message,
      context: {
        ...context,
        isRLSError,
        errorCode: (error as any)?.code
      }
    };
  }

  /**
   * Handle network and API communication errors
   */
  handleNetworkError(error: Error, context?: Record<string, any>): RegistrationError {
    const isTimeoutError = error.message.includes('timeout') || error.message.includes('TIMEOUT');
    const isConnectionError = error.message.includes('network') || error.message.includes('fetch');

    return {
      name: 'NetworkError',
      message: error.message,
      code: isTimeoutError ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
      type: 'network',
      retryable: true,
      userMessage: 'Connection issue detected. Please check your internet connection and try again.',
      technicalDetails: error.message,
      context: {
        ...context,
        isTimeoutError,
        isConnectionError
      }
    };
  }

  /**
   * Handle session establishment errors
   */
  handleSessionError(error: AuthError | Error, context?: Record<string, any>): RegistrationError {
    return {
      name: 'SessionError',
      message: error.message,
      code: 'SESSION_ESTABLISHMENT_FAILED',
      type: 'session',
      retryable: true,
      userMessage: 'Account created successfully, but there was an issue logging you in. Please try signing in manually.',
      technicalDetails: error.message,
      context
    };
  }

  /**
   * Handle invitation-specific errors
   */
  handleInvitationError(error: Error, context?: Record<string, any>): RegistrationError {
    const errorMessage = error.message.toLowerCase();
    let code = 'INVITATION_ERROR';
    let userMessage = 'There was an issue with your invitation. Please contact support.';

    if (errorMessage.includes('expired')) {
      code = 'INVITATION_EXPIRED';
      userMessage = 'This invitation has expired. Please request a new invitation.';
    } else if (errorMessage.includes('invalid') || errorMessage.includes('not found')) {
      code = 'INVITATION_INVALID';
      userMessage = 'This invitation is invalid or has already been used.';
    } else if (errorMessage.includes('used')) {
      code = 'INVITATION_ALREADY_USED';
      userMessage = 'This invitation has already been used.';
    }

    return {
      name: 'InvitationError',
      message: error.message,
      code,
      type: 'invitation',
      retryable: false,
      userMessage,
      technicalDetails: error.message,
      context
    };
  }

  /**
   * Handle unknown or unexpected errors
   */
  handleUnknownError(error: Error, context?: Record<string, any>): RegistrationError {
    return {
      name: 'UnknownError',
      message: error.message,
      code: 'UNKNOWN_ERROR',
      type: 'unknown',
      retryable: false,
      userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      technicalDetails: error.message,
      context
    };
  }

  /**
   * Process any error and return appropriate handling result
   */
  processError(error: Error, context?: Record<string, any>): ErrorHandlingResult {
    let registrationError: RegistrationError;

    // Determine error type and handle accordingly
    // Check invitation errors first as they're most specific
    if (this.isInvitationError(error)) {
      registrationError = this.handleInvitationError(error, context);
    } else if (this.isRLSPolicyError(error)) {
      registrationError = this.handleRLSError(error, context);
    } else if (this.isSessionError(error)) {
      registrationError = this.handleSessionError(error, context);
    } else if (this.isNetworkError(error)) {
      registrationError = this.handleNetworkError(error, context);
    } else if (this.isValidationError(error)) {
      registrationError = this.handleValidationError(error, context);
    } else {
      registrationError = this.handleUnknownError(error, context);
    }

    return {
      success: false,
      error: registrationError,
      shouldRetry: registrationError.retryable,
      userMessage: registrationError.userMessage
    };
  }

  /**
   * Implement retry mechanism with exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: Record<string, any>
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;
    let attempt = 0;

    while (attempt < retryConfig.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        const errorResult = this.processError(lastError, { ...context, attempt });
        
        // If error is not retryable or we've exhausted attempts, throw
        if (!errorResult.shouldRetry || attempt >= retryConfig.maxAttempts) {
          throw errorResult.error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        console.warn(`Registration operation failed (attempt ${attempt}/${retryConfig.maxAttempts}). Retrying in ${jitteredDelay}ms...`, {
          error: errorResult.error,
          context
        });

        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }

    throw lastError;
  }

  // Private helper methods for error type detection
  private isValidationError(error: Error): boolean {
    if (!error.message) return false;
    const message = error.message.toLowerCase();
    return message.includes('validation') || 
           message.includes('required') || 
           message.includes('invalid format') ||
           (message.includes('password') && message.includes('weak'));
  }

  private isRLSPolicyError(error: Error): boolean {
    if (!error.message) return false;
    const message = error.message.toLowerCase();
    const authError = error as AuthError;
    
    const isRLS = message.includes('rls') ||
           message.includes('row level security') ||
           message.includes('policy') ||
           message.includes('permission denied') ||
           authError?.code === 'PGRST301' ||
           authError?.code === '42501';
           
    return isRLS;
  }

  private isNetworkError(error: Error): boolean {
    if (!error.message) return false;
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('timeout') ||
           message.includes('connection') ||
           error.name === 'NetworkError' ||
           (error.name === 'TypeError' && message.includes('failed to fetch'));
  }

  private isSessionError(error: Error): boolean {
    if (!error.message) return false;
    const message = error.message.toLowerCase();
    const authError = error as AuthError;
    
    // Check for session-specific errors first, before checking for generic 'token'
    return (message.includes('session') && !message.includes('invitation')) ||
           (message.includes('authentication') && !message.includes('invitation')) ||
           authError?.code === 'invalid_grant' ||
           authError?.code === 'session_not_found';
  }

  private isInvitationError(error: Error): boolean {
    if (!error.message) return false;
    const message = error.message.toLowerCase();
    return message.includes('invitation') ||
           (message.includes('invitation token')) ||
           (message.includes('token') && message.includes('invitation'));
  }

  private getValidationErrorMessage(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('email')) {
      return 'Please enter a valid email address.';
    }
    if (message.includes('password')) {
      if (message.includes('weak') || message.includes('strength')) {
        return 'Password must be at least 8 characters long and include uppercase, lowercase, and numbers.';
      }
      return 'Please enter a valid password.';
    }
    if (message.includes('required')) {
      return 'Please fill in all required fields.';
    }
    if (message.includes('terms')) {
      return 'Please accept the terms and conditions to continue.';
    }
    
    return 'Please check your input and try again.';
  }
}

// Export singleton instance
export const registrationErrorHandler = new RegistrationErrorHandler();