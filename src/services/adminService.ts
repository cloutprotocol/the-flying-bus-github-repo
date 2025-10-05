import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

export interface AdminServiceConfig {
  useServiceRole?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export interface AdminOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
  details?: Record<string, any>;
}

/**
 * Admin Service with Service Role Elevation
 * 
 * This service provides elevated permissions for admin operations by using
 * Edge Functions that have service role access, rather than trying to use
 * service role keys directly in client-side code.
 * 
 * Security Note: Client-side code should never have direct access to service
 * role keys. Instead, we use Edge Functions as a secure proxy for admin operations.
 */
export class AdminService {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_RETRY_ATTEMPTS = 3;

  /**
   * Create a service role client for server-side operations
   * NOTE: This should only be used in Edge Functions, never in client-side code
   */
  private static createServiceRoleClient(): typeof supabase | null {
    // Security: Client-side code should never access service role keys
    // This method is kept for documentation purposes but should not be used
    logger.warn('Service role client creation attempted in client-side code', {
      source: LogSource.ADMIN_SERVICE,
      context: 'security_warning'
    });
    return null;
  }

  /**
   * Execute admin operation with service role elevation via Edge Function
   */
  private static async executeWithServiceRole<T>(
    operation: string,
    params: Record<string, any>,
    config: AdminServiceConfig = {}
  ): Promise<AdminOperationResult<T>> {
    const { timeout = this.DEFAULT_TIMEOUT, retryAttempts = this.DEFAULT_RETRY_ATTEMPTS } = config;
    
    logger.info('Executing admin operation with service role elevation', {
      source: LogSource.ADMIN_SERVICE,
      operation,
      params: Object.keys(params)
    });

    let lastError: any;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        logger.debug(`Admin operation attempt ${attempt}/${retryAttempts}`, {
          source: LogSource.ADMIN_SERVICE,
          operation,
          attempt
        });

        // Use Edge Function for service role operations
        const { data, error } = await supabase.functions.invoke('admin-operations', {
          body: {
            operation,
            params
          }
        });

        if (error) {
          throw new Error(`Edge Function error: ${error.message}`);
        }

        if (data?.success === false) {
          const operationError = new Error(data.error || 'Admin operation failed');
          // Check if the error from Edge Function is retryable
          if (this.isRetryableError({ message: data.error })) {
            operationError.name = 'RetryableError';
          }
          throw operationError;
        }

        logger.info('Admin operation completed successfully', {
          source: LogSource.ADMIN_SERVICE,
          operation,
          attempt,
          dataKeys: data ? Object.keys(data) : []
        });

        return {
          success: true,
          data: data?.data || data,
          details: {
            operation,
            attempt,
            method: 'edge_function'
          }
        };

      } catch (error) {
        lastError = error;
        logger.warn(`Admin operation attempt ${attempt} failed`, {
          source: LogSource.ADMIN_SERVICE,
          operation,
          attempt,
          error: error.message
        });

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable || attempt === retryAttempts) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logger.error('All admin operation attempts failed', {
      source: LogSource.ADMIN_SERVICE,
      operation,
      attempts: retryAttempts,
      finalError: lastError?.message
    });

    const isRetryable = this.isRetryableError(lastError);
    
    return {
      success: false,
      error: lastError?.message || 'Admin operation failed',
      code: this.getErrorCode(lastError),
      retryable: isRetryable,
      details: {
        operation,
        attempts: retryAttempts,
        finalError: lastError?.message,
        errorName: lastError?.name
      }
    };
  }

  /**
   * Fallback method using direct database operations with user context
   * This is used when Edge Functions are not available
   */
  private static async executeWithUserContext<T>(
    operation: string,
    params: Record<string, any>,
    config: AdminServiceConfig = {}
  ): Promise<AdminOperationResult<T>> {
    logger.info('Executing admin operation with user context fallback', {
      source: LogSource.ADMIN_SERVICE,
      operation,
      context: 'fallback'
    });

    try {
      switch (operation) {
        case 'updateInvitationStatus':
          return await this.updateInvitationStatusFallback(params);
        
        case 'logAdminAction':
          return await this.logAdminActionFallback(params);
        
        default:
          throw new Error(`Unsupported fallback operation: ${operation}`);
      }
    } catch (error) {
      logger.error('Admin operation fallback failed', {
        source: LogSource.ADMIN_SERVICE,
        operation,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        code: this.getErrorCode(error),
        retryable: false,
        details: {
          operation,
          method: 'user_context_fallback',
          error: error.message
        }
      };
    }
  }

  /**
   * Update invitation request status with elevated permissions
   */
  static async updateInvitationRequestStatus(
    invitationId: string,
    status: 'approved' | 'denied',
    reviewerId: string,
    config: AdminServiceConfig = {}
  ): Promise<AdminOperationResult> {
    const { useServiceRole = true } = config;

    logger.info('Updating invitation request status', {
      source: LogSource.ADMIN_SERVICE,
      invitationId,
      status,
      reviewerId,
      useServiceRole
    });

    const params = {
      invitationId,
      status,
      reviewerId,
      timestamp: new Date().toISOString()
    };

    // Try service role elevation first
    if (useServiceRole) {
      const result = await this.executeWithServiceRole('updateInvitationStatus', params, config);
      
      // If service role fails and it's retryable, try fallback
      if (!result.success && result.retryable) {
        logger.warn('Service role operation failed, trying fallback', {
          source: LogSource.ADMIN_SERVICE,
          invitationId,
          error: result.error
        });
        
        const fallbackResult = await this.executeWithUserContext('updateInvitationStatus', params, config);
        
        // If fallback succeeds, return success with warning
        if (fallbackResult.success) {
          return {
            ...fallbackResult,
            details: {
              ...fallbackResult.details,
              warning: 'Service role failed but fallback succeeded',
              originalError: result.error
            }
          };
        }
        
        // If both fail, return the original service role error
        return result;
      }
      
      return result;
    }

    // Use fallback directly if service role is disabled
    return await this.executeWithUserContext('updateInvitationStatus', params, config);
  }

  /**
   * Log admin action with elevated permissions
   */
  static async logAdminAction(
    action: string,
    resourceType: string,
    resourceId: string,
    userId: string,
    metadata: Record<string, any> = {},
    config: AdminServiceConfig = {}
  ): Promise<AdminOperationResult> {
    const { useServiceRole = true } = config;

    const params = {
      action,
      resourceType,
      resourceId,
      userId,
      metadata,
      timestamp: new Date().toISOString()
    };

    if (useServiceRole) {
      const result = await this.executeWithServiceRole('logAdminAction', params, config);
      
      if (!result.success && result.retryable) {
        const fallbackResult = await this.executeWithUserContext('logAdminAction', params, config);
        
        if (fallbackResult.success) {
          return {
            ...fallbackResult,
            details: {
              ...fallbackResult.details,
              warning: 'Service role failed but fallback succeeded',
              originalError: result.error
            }
          };
        }
        
        return result;
      }
      
      return result;
    }

    return await this.executeWithUserContext('logAdminAction', params, config);
  }

  /**
   * Send admin notification email with elevated permissions
   */
  static async sendAdminNotificationEmail(
    emailType: string,
    recipientEmail: string,
    templateData: Record<string, any>,
    config: AdminServiceConfig = {}
  ): Promise<AdminOperationResult> {
    const { useServiceRole = true } = config;

    const params = {
      emailType,
      recipientEmail,
      templateData,
      timestamp: new Date().toISOString()
    };

    if (useServiceRole) {
      const result = await this.executeWithServiceRole('sendAdminEmail', params, config);
      
      // If service role fails, try regular email service as fallback
      if (!result.success) {
        logger.warn('Service role email failed, trying regular email service', {
          source: LogSource.ADMIN_SERVICE,
          error: result.error
        });
        
        try {
          const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
              type: emailType,
              to: recipientEmail,
              templateData
            }
          });

          if (error) {
            throw new Error(error.message);
          }

          return {
            success: true,
            data,
            details: {
              method: 'regular_email_service',
              warning: 'Service role failed but regular email service succeeded'
            }
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: fallbackError.message,
            code: this.getErrorCode(fallbackError),
            retryable: true
          };
        }
      }
      
      return result;
    }

    // Use regular email service directly if service role is disabled
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: emailType,
          to: recipientEmail,
          templateData
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        data,
        details: {
          method: 'regular_email_service'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: this.getErrorCode(error),
        retryable: true
      };
    }
  }

  /**
   * Fallback implementation for updating invitation status
   */
  private static async updateInvitationStatusFallback(
    params: Record<string, any>
  ): Promise<AdminOperationResult> {
    const { invitationId, status, reviewerId, timestamp } = params;

    // Update invitation status using regular user context
    const { data, error } = await supabase
      .from('invitation_requests')
      .update({
        status,
        reviewed_at: timestamp,
        reviewer_id: reviewerId
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    return {
      success: true,
      data,
      details: {
        method: 'user_context_fallback',
        warning: 'Email events may not be logged due to RLS policies'
      }
    };
  }

  /**
   * Fallback implementation for logging admin actions
   */
  private static async logAdminActionFallback(
    params: Record<string, any>
  ): Promise<AdminOperationResult> {
    const { action, resourceType, resourceId, userId, metadata, timestamp } = params;

    try {
      // Try to log using regular audit service
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          user_id: userId,
          success: true,
          metadata,
          created_at: timestamp
        })
        .select()
        .single();

      if (error) {
        // If audit log fails, don't fail the entire operation
        logger.warn('Audit log fallback failed', {
          source: LogSource.ADMIN_SERVICE,
          error: error.message
        });
        
        return {
          success: true,
          data: null,
          details: {
            method: 'user_context_fallback',
            warning: 'Audit logging failed due to permissions'
          }
        };
      }

      return {
        success: true,
        data,
        details: {
          method: 'user_context_fallback'
        }
      };
    } catch (error) {
      // Don't fail the operation if logging fails
      return {
        success: true,
        data: null,
        details: {
          method: 'user_context_fallback',
          warning: `Audit logging failed: ${error.message}`
        }
      };
    }
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';
    
    // Network and timeout errors are retryable
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return true;
    }

    // Check for retryable error patterns
    const retryablePatterns = [
      'network',
      'timeout',
      'connection',
      'temporary',
      'unavailable',
      'service unavailable',
      'failure',
      'failing',
      '500',
      '502',
      '503',
      '504'
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Get error code based on error type
   */
  private static getErrorCode(error: any): string {
    if (!error) return 'UNKNOWN_ERROR';

    const errorMessage = error.message?.toLowerCase() || '';

    if (error.name === 'AbortError' || error.name === 'TimeoutError' || errorMessage.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }

    if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
      return 'PERMISSION_ERROR';
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'NETWORK_ERROR';
    }

    if (errorMessage.includes('database') || errorMessage.includes('sql')) {
      return 'DATABASE_ERROR';
    }

    return 'ADMIN_OPERATION_ERROR';
  }

  /**
   * Validate admin permissions before executing operations
   */
  static async validateAdminPermissions(userId: string): Promise<AdminOperationResult<boolean>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to validate permissions: ${error.message}`,
          code: 'PERMISSION_VALIDATION_ERROR',
          retryable: false
        };
      }

      const isAdmin = data?.role === 'admin' || data?.role === 'moderator';

      return {
        success: true,
        data: isAdmin,
        details: {
          userId,
          role: data?.role,
          hasAdminPermissions: isAdmin
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'PERMISSION_VALIDATION_EXCEPTION',
        retryable: true
      };
    }
  }

  /**
   * Get admin operation status and health check
   */
  static async getOperationStatus(): Promise<AdminOperationResult> {
    try {
      // Test basic database connectivity
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        throw new Error(`Database connectivity test failed: ${error.message}`);
      }

      // Test Edge Function availability
      let edgeFunctionStatus = 'unknown';
      try {
        const { error: funcError } = await supabase.functions.invoke('admin-operations', {
          body: { operation: 'health-check' }
        });
        edgeFunctionStatus = funcError ? 'error' : 'available';
      } catch {
        edgeFunctionStatus = 'unavailable';
      }

      return {
        success: true,
        data: {
          databaseConnectivity: 'ok',
          edgeFunctionStatus,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: 'HEALTH_CHECK_FAILED',
        retryable: true
      };
    }
  }
}

export default AdminService;