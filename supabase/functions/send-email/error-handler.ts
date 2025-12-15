interface EmailError {
  code: string
  message: string
  details?: Record<string, any>
  retryable: boolean
}

export class EmailErrorHandler {
  static handleResendError(response: Response, errorData: any): EmailError {
    const status = response.status
    
    switch (status) {
      case 400:
        return {
          code: 'INVALID_REQUEST',
          message: errorData.message || 'Invalid request parameters',
          details: errorData,
          retryable: false
        }
      
      case 401:
        return {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key or authentication failed',
          details: errorData,
          retryable: false
        }
      
      case 403:
        return {
          code: 'FORBIDDEN',
          message: 'Access denied or insufficient permissions',
          details: errorData,
          retryable: false
        }
      
      case 404:
        return {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          details: errorData,
          retryable: false
        }
      
      case 422:
        return {
          code: 'VALIDATION_ERROR',
          message: errorData.message || 'Validation failed',
          details: errorData,
          retryable: false
        }
      
      case 429:
        return {
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded',
          details: errorData,
          retryable: true
        }
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          code: 'SERVER_ERROR',
          message: 'Server error occurred',
          details: errorData,
          retryable: true
        }
      
      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: errorData.message || 'Unknown error occurred',
          details: errorData,
          retryable: status >= 500
        }
    }
  }

  static handleNetworkError(error: Error): EmailError {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        details: { originalError: error.message },
        retryable: true
      }
    }

    if (error.name === 'AbortError') {
      return {
        code: 'TIMEOUT_ERROR',
        message: 'Request timed out',
        details: { originalError: error.message },
        retryable: true
      }
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      details: { originalError: error.message, stack: error.stack },
      retryable: false
    }
  }

  static handleTemplateError(error: Error, templateType: string): EmailError {
    return {
      code: 'TEMPLATE_ERROR',
      message: `Failed to render ${templateType} template: ${error.message}`,
      details: { 
        templateType, 
        originalError: error.message,
        stack: error.stack 
      },
      retryable: false
    }
  }

  static handleValidationError(message: string, details?: Record<string, any>): EmailError {
    return {
      code: 'VALIDATION_ERROR',
      message,
      details,
      retryable: false
    }
  }
}

export class RetryHandler {
  private static readonly MAX_RETRIES = 3
  private static readonly BASE_DELAY = 1000 // 1 second
  private static readonly MAX_DELAY = 10000 // 10 seconds

  static async withRetry<T>(
    operation: () => Promise<T>,
    isRetryable: (error: any) => boolean,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries || !isRetryable(error)) {
          throw error
        }
        
        const delay = this.calculateDelay(attempt)
        await this.sleep(delay)
      }
    }
    
    throw lastError
  }

  private static calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.BASE_DELAY * Math.pow(2, attempt)
    const jitter = Math.random() * 0.1 * exponentialDelay
    return Math.min(exponentialDelay + jitter, this.MAX_DELAY)
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}