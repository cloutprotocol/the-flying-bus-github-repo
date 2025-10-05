/**
 * Admin Operation Retry Handler
 * 
 * Provides intelligent retry mechanisms for admin operations with fallback strategies
 * and specific handling for RLS policy violations and permission errors.
 */

import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { detectRLSError, logRLSError, type RLSErrorContext } from './rlsErrorHandler';

export interface AdminRetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  enableFallback: boolean;
  fallbackAfterAttempts: number;
  timeoutMs: number;
}

export interface AdminRetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  usedFallback: boolean;
  fallbackReason?: string;
  duration: number;
  retryable: boolean;
}

export interface AdminRetryContext extends RLSErrorContext {
  operationId: string;
  userId: string;
  userRole: string;
  useServiceRole?: boolean;
}

/**
 * Default retry configuration for admin operations
 */
export const DEFAULT_ADMIN_RETRY_CONFIG: AdminRetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  enableFallback: true,
  fallbackAfterAttempts: 2,
  timeoutMs: 30000
};

/**
 * Admin operation retry handler with intelligent fallback strategies
 */
export class AdminRetryHandler {
  private config: AdminRetryConfig;
  private context: AdminRetryContext;

  constructor(config: Partial<AdminRetryConfig> = {}, context: AdminRetryContext) {
    this.config = { ...DEFAULT_ADMIN_RETRY_CONFIG, ...config };
    this.context = context;
  }

  /**
   * Execute admin operation with retry and fallback logic
   */
  async executeWithRetry<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<AdminRetryResult<T>> {
    const startTime = Date.now();
    let lastError: any;
    let usedFallback = false;
    let fallbackReason: string | undefined;

    logger.info('Starting admin operation with retry', {
      source: LogSource.ADMIN_SERVICE,
      operationId: this.context.operationId,
      operation: this.context.operation,
      maxAttempts: this.config.maxAttempts,
      enableFallback: this.config.enableFallback,
      userId: this.context.userId,
      userRole: this.context.userRole
    });

    // Try primary operation with retries
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        logger.debug(`Admin operation attempt ${attempt}/${this.config.maxAttempts}`, {
          source: LogSource.ADMIN_SERVICE,
          operationId: this.context.operationId,
          attempt,
          usedFallback
        });

        const result = await this.executeWithTimeout(primaryOperation);
        
        const duration = Date.now() - startTime;
        
        logger.info('Admin operation succeeded', {
          source: LogSource.ADMIN_SERVICE,
          operationId: this.context.operationId,
          attempt,
          duration,
          usedFallback
        });

        return {
          success: true,
          data: result,
          attempts: attempt,
          usedFallback,
          fallbackReason,
          duration,
          retryable: false
        };

      } catch (error) {
        lastError = error;
        
        logger.warn(`Admin operation attempt ${attempt} failed`, {
          source: LogSource.ADMIN_SERVICE,
          operationId: this.context.operationId,
          attempt,
          error: error.message,
          errorCode: error.code
        });

        // Log RLS errors with context
        const rlsError = detectRLSError(error, this.context);
        if (rlsError) {
          logRLSError(error, this.context, rlsError);
        }

        // Check if we should try fallback
        if (this.shouldUseFallback(error, attempt)) {
          if (fallbackOperation) {
            logger.info('Switching to fallback operation', {
              source: LogSource.ADMIN_SERVICE,
              operationId: this.context.operationId,
              attempt,
              reason: this.getFallbackReason(error)
            });

            try {
              const fallbackResult = await this.executeWithTimeout(fallbackOperation);
              
              const duration = Date.now() - startTime;
              
              logger.info('Fallback operation succeeded', {
                source: LogSource.ADMIN_SERVICE,
                operationId: this.context.operationId,
                attempt,
                duration,
                fallbackReason: this.getFallbackReason(error)
              });

              return {
                success: true,
                data: fallbackResult,
                attempts: attempt,
                usedFallback: true,
                fallbackReason: this.getFallbackReason(error),
                duration,
                retryable: false
              };

            } catch (fallbackError) {
              logger.error('Fallback operation also failed', {
                source: LogSource.ADMIN_SERVICE,
                operationId: this.context.operationId,
                attempt,
                fallbackError: fallbackError.message,
                originalError: error.message
              });
              
              // Continue with retries using original error
              lastError = error;
            }
          } else {
            logger.warn('Fallback needed but no fallback operation provided', {
              source: LogSource.ADMIN_SERVICE,
              operationId: this.context.operationId,
              attempt
            });
          }
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          logger.info('Error is not retryable, stopping attempts', {
            source: LogSource.ADMIN_SERVICE,
            operationId: this.context.operationId,
            attempt,
            error: error.message
          });
          break;
        }

        // Don't retry on last attempt
        if (attempt === this.config.maxAttempts) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.calculateDelay(attempt);
        logger.debug(`Waiting ${delay}ms before retry`, {
          source: LogSource.ADMIN_SERVICE,
          operationId: this.context.operationId,
          attempt,
          delay
        });
        
        await this.sleep(delay);
      }
    }

    const duration = Date.now() - startTime;
    
    logger.error('All admin operation attempts failed', {
      source: LogSource.ADMIN_SERVICE,
      operationId: this.context.operationId,
      attempts: this.config.maxAttempts,
      duration,
      finalError: lastError?.message,
      usedFallback
    });

    return {
      success: false,
      error: lastError,
      attempts: this.config.maxAttempts,
      usedFallback,
      fallbackReason,
      duration,
      retryable: this.isRetryableError(lastError)
    };
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Determine if we should use fallback operation
   */
  private shouldUseFallback(error: any, attempt: number): boolean {
    if (!this.config.enableFallback) {
      return false;
    }

    if (attempt < this.config.fallbackAfterAttempts) {
      return false;
    }

    // Use fallback for RLS policy violations
    const rlsError = detectRLSError(error, this.context);
    if (rlsError && rlsError.fallbackAvailable) {
      return true;
    }

    // Use fallback for permission errors
    const errorMessage = (error.message || '').toLowerCase();
    const fallbackTriggers = [
      'permission denied',
      'forbidden',
      'unauthorized',
      'rls policy',
      'row level security',
      'insufficient privilege'
    ];

    return fallbackTriggers.some(trigger => errorMessage.includes(trigger));
  }

  /**
   * Get reason for using fallback
   */
  private getFallbackReason(error: any): string {
    const rlsError = detectRLSError(error, this.context);
    if (rlsError) {
      return `RLS Policy Issue: ${rlsError.code}`;
    }

    const errorMessage = (error.message || '').toLowerCase();
    
    if (errorMessage.includes('permission')) {
      return 'Permission Error';
    }
    if (errorMessage.includes('forbidden')) {
      return 'Access Forbidden';
    }
    if (errorMessage.includes('unauthorized')) {
      return 'Unauthorized Access';
    }
    
    return 'Primary Operation Failed';
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // Check RLS error retryability
    const rlsError = detectRLSError(error, this.context);
    if (rlsError) {
      return rlsError.retryable;
    }

    const errorMessage = (error.message || '').toLowerCase();
    const errorCode = error.code || error.status;

    // Non-retryable error patterns
    const nonRetryablePatterns = [
      'validation',
      'invalid',
      'malformed',
      'not found',
      'does not exist'
    ];

    if (nonRetryablePatterns.some(pattern => errorMessage.includes(pattern))) {
      return false;
    }

    // Non-retryable status codes
    const nonRetryableCodes = [400, 401, 403, 404, 422];
    if (nonRetryableCodes.includes(errorCode)) {
      return false;
    }

    // Retryable error patterns
    const retryablePatterns = [
      'network',
      'timeout',
      'connection',
      'temporary',
      'unavailable',
      'server error',
      '500',
      '502',
      '503',
      '504'
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const baseDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 0.1 * baseDelay;
    return Math.min(baseDelay + jitter, this.config.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Convenience function to execute admin operation with retry
 */
export async function executeAdminOperationWithRetry<T>(
  primaryOperation: () => Promise<T>,
  context: AdminRetryContext,
  fallbackOperation?: () => Promise<T>,
  config: Partial<AdminRetryConfig> = {}
): Promise<AdminRetryResult<T>> {
  const retryHandler = new AdminRetryHandler(config, context);
  return retryHandler.executeWithRetry(primaryOperation, fallbackOperation);
}

/**
 * Create retry context for admin operations
 */
export function createAdminRetryContext(
  operation: string,
  userId: string,
  userRole: string,
  options: Partial<AdminRetryContext> = {}
): AdminRetryContext {
  return {
    operationId: `admin_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    operation,
    userId,
    userRole,
    isAuthenticated: true,
    component: 'AdminService',
    ...options
  };
}