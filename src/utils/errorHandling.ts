/**
 * Comprehensive error handling utilities for the email notification system
 */

export interface ErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'validation' | 'network' | 'server' | 'auth' | 'business';
  recoveryActions?: string[];
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

/**
 * Error code mappings with user-friendly messages and recovery actions
 */
export const ERROR_MAPPINGS: Record<string, ErrorInfo> = {
  // Email service errors
  'INVALID_EMAIL_FORMAT': {
    code: 'INVALID_EMAIL_FORMAT',
    message: 'Invalid email address format',
    userMessage: 'Please enter a valid email address.',
    retryable: false,
    severity: 'medium',
    category: 'validation',
    recoveryActions: ['Check the email address format', 'Remove any extra spaces']
  },
  'EMAIL_SERVICE_FAILURE': {
    code: 'EMAIL_SERVICE_FAILURE',
    message: 'Email service is temporarily unavailable',
    userMessage: 'We\'re having trouble sending emails right now. Please try again in a few minutes.',
    retryable: true,
    severity: 'high',
    category: 'server',
    recoveryActions: ['Try again in a few minutes', 'Contact support if the problem persists']
  },
  'EMAIL_SEND_FAILED': {
    code: 'EMAIL_SEND_FAILED',
    message: 'Failed to send email',
    userMessage: 'We couldn\'t send your email. Please try again.',
    retryable: true,
    severity: 'medium',
    category: 'server',
    recoveryActions: ['Try again', 'Check your internet connection']
  },
  'TEMPLATE_ERROR': {
    code: 'TEMPLATE_ERROR',
    message: 'Email template error',
    userMessage: 'There was a problem preparing your email. Please try again.',
    retryable: false,
    severity: 'high',
    category: 'server',
    recoveryActions: ['Contact support']
  },
  'RATE_LIMITED': {
    code: 'RATE_LIMITED',
    message: 'Rate limit exceeded',
    userMessage: 'You\'re sending requests too quickly. Please wait a moment and try again.',
    retryable: true,
    severity: 'medium',
    category: 'business',
    recoveryActions: ['Wait a few minutes before trying again']
  },

  // Token service errors
  'TOKEN_NOT_FOUND': {
    code: 'TOKEN_NOT_FOUND',
    message: 'Token not found',
    userMessage: 'This invitation link is invalid or has been removed.',
    retryable: false,
    severity: 'medium',
    category: 'business',
    recoveryActions: ['Request a new invitation', 'Check if you have another invitation email']
  },
  'TOKEN_EXPIRED': {
    code: 'TOKEN_EXPIRED',
    message: 'Token has expired',
    userMessage: 'This invitation link has expired. Invitation links are valid for 7 days.',
    retryable: false,
    severity: 'medium',
    category: 'business',
    recoveryActions: ['Request a new invitation']
  },
  'TOKEN_ALREADY_EXISTS': {
    code: 'TOKEN_ALREADY_EXISTS',
    message: 'Active token already exists',
    userMessage: 'An invitation has already been sent for this request.',
    retryable: false,
    severity: 'low',
    category: 'business',
    recoveryActions: ['Check your email for the existing invitation']
  },
  'INVALID_TOKEN_FORMAT': {
    code: 'INVALID_TOKEN_FORMAT',
    message: 'Invalid token format',
    userMessage: 'This invitation link appears to be corrupted.',
    retryable: false,
    severity: 'medium',
    category: 'validation',
    recoveryActions: ['Try copying the link again from your email', 'Request a new invitation']
  },

  // Invitation service errors
  'INVITATION_NOT_FOUND': {
    code: 'INVITATION_NOT_FOUND',
    message: 'Invitation not found',
    userMessage: 'We couldn\'t find this invitation request.',
    retryable: false,
    severity: 'medium',
    category: 'business',
    recoveryActions: ['Contact support', 'Submit a new invitation request']
  },
  'INVITATION_NOT_APPROVED': {
    code: 'INVITATION_NOT_APPROVED',
    message: 'Invitation not approved',
    userMessage: 'This invitation hasn\'t been approved yet.',
    retryable: false,
    severity: 'low',
    category: 'business',
    recoveryActions: ['Wait for admin approval', 'Contact support for status update']
  },
  'EMAIL_MISMATCH': {
    code: 'EMAIL_MISMATCH',
    message: 'Email does not match invitation',
    userMessage: 'The email address doesn\'t match this invitation.',
    retryable: false,
    severity: 'medium',
    category: 'validation',
    recoveryActions: ['Use the correct email address', 'Contact support if you need help']
  },

  // Network and system errors
  'NETWORK_ERROR': {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed',
    userMessage: 'Please check your internet connection and try again.',
    retryable: true,
    severity: 'medium',
    category: 'network',
    recoveryActions: ['Check your internet connection', 'Try again in a moment']
  },
  'TIMEOUT_ERROR': {
    code: 'TIMEOUT_ERROR',
    message: 'Request timed out',
    userMessage: 'The request took too long. Please try again.',
    retryable: true,
    severity: 'medium',
    category: 'network',
    recoveryActions: ['Try again', 'Check your internet connection']
  },
  'DATABASE_ERROR': {
    code: 'DATABASE_ERROR',
    message: 'Database error',
    userMessage: 'We\'re experiencing technical difficulties. Please try again.',
    retryable: true,
    severity: 'high',
    category: 'server',
    recoveryActions: ['Try again in a few minutes', 'Contact support if the problem persists']
  },
  'UNEXPECTED_ERROR': {
    code: 'UNEXPECTED_ERROR',
    message: 'Unexpected error occurred',
    userMessage: 'Something unexpected happened. Please try again.',
    retryable: true,
    severity: 'high',
    category: 'server',
    recoveryActions: ['Try again', 'Contact support if the problem continues']
  }
};

/**
 * Get error information for a given error code
 */
export function getErrorInfo(code: string, fallbackMessage?: string): ErrorInfo {
  const errorInfo = ERROR_MAPPINGS[code];
  
  if (errorInfo) {
    return errorInfo;
  }

  // Return default error info for unknown codes
  return {
    code: code || 'UNKNOWN_ERROR',
    message: fallbackMessage || 'Unknown error occurred',
    userMessage: 'Something went wrong. Please try again.',
    retryable: true,
    severity: 'medium',
    category: 'server',
    recoveryActions: ['Try again', 'Contact support if the problem persists']
  };
}

/**
 * Determine if an error is retryable based on error code or message
 */
export function isRetryableError(error: any): boolean {
  if (error?.code) {
    const errorInfo = getErrorInfo(error.code);
    return errorInfo.retryable;
  }

  if (error?.retryable !== undefined) {
    return error.retryable;
  }

  // Check error message for common retryable patterns
  const errorMessage = (error?.message || error?.error || '').toLowerCase();
  const retryablePatterns = [
    'network',
    'timeout',
    'server error',
    'service unavailable',
    'rate limit',
    'temporary',
    'try again'
  ];

  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts - 1) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt);
      const jitter = Math.random() * 0.1 * baseDelay;
      const delay = Math.min(baseDelay + jitter, finalConfig.maxDelay);

      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: any): {
  message: string;
  code?: string;
  recoveryActions?: string[];
  canRetry: boolean;
} {
  const errorCode = error?.code || 'UNKNOWN_ERROR';
  const errorInfo = getErrorInfo(errorCode, error?.message || error?.error);

  return {
    message: errorInfo.userMessage,
    code: errorInfo.code,
    recoveryActions: errorInfo.recoveryActions,
    canRetry: errorInfo.retryable
  };
}

/**
 * Log error with appropriate level based on severity
 */
export function logError(error: any, context?: Record<string, any>): void {
  const errorCode = error?.code || 'UNKNOWN_ERROR';
  const errorInfo = getErrorInfo(errorCode);
  
  const logData = {
    code: errorInfo.code,
    message: errorInfo.message,
    severity: errorInfo.severity,
    category: errorInfo.category,
    retryable: errorInfo.retryable,
    originalError: error,
    context,
    timestamp: new Date().toISOString()
  };

  switch (errorInfo.severity) {
    case 'critical':
      console.error('CRITICAL ERROR:', logData);
      break;
    case 'high':
      console.error('HIGH SEVERITY ERROR:', logData);
      break;
    case 'medium':
      console.warn('MEDIUM SEVERITY ERROR:', logData);
      break;
    case 'low':
    default:
      console.info('LOW SEVERITY ERROR:', logData);
      break;
  }
}

/**
 * Create a standardized error object
 */
export function createError(
  code: string,
  message?: string,
  details?: Record<string, any>
): Error & { code: string; details?: Record<string, any>; retryable: boolean } {
  const errorInfo = getErrorInfo(code, message);
  
  const error = new Error(errorInfo.message) as Error & { 
    code: string; 
    details?: Record<string, any>; 
    retryable: boolean;
  };
  
  error.code = errorInfo.code;
  error.details = details;
  error.retryable = errorInfo.retryable;
  
  return error;
}

/**
 * Higher-order function to wrap operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    errorMessage?: string;
    logSource?: string;
    showToast?: boolean;
    retryConfig?: Partial<RetryConfig>;
  } = {}
): Promise<T> {
  const { errorMessage = 'Operation failed', logSource = 'SYSTEM', showToast = true, retryConfig } = options;

  try {
    if (retryConfig) {
      return await withRetry(operation, retryConfig);
    } else {
      return await operation();
    }
  } catch (error) {
    // Log the error with context
    logError(error, { source: logSource, operation: errorMessage });

    // Format error for user display
    const formattedError = formatErrorForUser(error);

    // Optionally show toast notification (would need toast implementation)
    if (showToast) {
      console.warn('Toast notification:', formattedError.message);
    }

    // Re-throw the error with additional context
    const enhancedError = createError(
      error?.code || 'UNEXPECTED_ERROR',
      formattedError.message,
      { source: logSource, originalError: error }
    );

    throw enhancedError;
  }
}

/**
 * Validate email address with detailed error information
 */
export function validateEmail(email: string): { valid: boolean; error?: ErrorInfo } {
  if (!email || typeof email !== 'string') {
    return { 
      valid: false, 
      error: getErrorInfo('INVALID_EMAIL_FORMAT', 'Email address is required') 
    };
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return { 
      valid: false, 
      error: getErrorInfo('INVALID_EMAIL_FORMAT', 'Email address cannot be empty') 
    };
  }

  if (trimmedEmail.length > 254) {
    return { 
      valid: false, 
      error: getErrorInfo('INVALID_EMAIL_FORMAT', 'Email address is too long') 
    };
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { 
      valid: false, 
      error: getErrorInfo('INVALID_EMAIL_FORMAT') 
    };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /[<>]/,           // HTML tags
    /javascript:/i,   // JavaScript protocol
    /data:/i,         // Data protocol
    /\r|\n/,          // Line breaks
    /\0/              // Null bytes
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmedEmail)) {
      return { 
        valid: false, 
        error: getErrorInfo('INVALID_EMAIL_FORMAT', 'Email address contains invalid characters') 
      };
    }
  }

  return { valid: true };
}