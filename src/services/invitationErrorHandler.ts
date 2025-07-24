import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { InvitationError } from '@/types/InvitationWorkflowTypes';

/**
 * Comprehensive error handling service for invitation system
 * Provides user-friendly messages, graceful degradation, and admin alerts
 * Requirements: 5.5, 7.1, 7.2, 7.3
 */
export class InvitationErrorHandler {
  
  /**
   * Convert technical errors to user-friendly messages
   * Requirements: 5.5
   */
  static getUserFriendlyMessage(error: InvitationError | Error | any): string {
    // Handle InvitationError objects
    if (error && typeof error === 'object' && 'code' in error) {
      const invitationError = error as InvitationError;
      
      switch (invitationError.code) {
        case 'TOKEN_VALIDATION_FAILED':
        case 'INVALID_TOKEN':
          return 'This invitation link is invalid or has expired. Please check the link or request a new invitation.';
        
        case 'TOKEN_EXPIRED':
          return 'This invitation has expired. Please contact support to request a new invitation.';
        
        case 'TOKEN_ALREADY_USED':
          return 'This invitation has already been used. If you need help accessing your account, please contact support.';
        
        case 'EMAIL_MISMATCH':
          return 'The email address you entered does not match the invitation. Please use the email address that received the invitation.';
        
        case 'RATE_LIMIT_EXCEEDED':
          return 'Too many attempts detected. Please wait a few minutes before trying again for security reasons.';
        
        case 'REPLAY_ATTACK_DETECTED':
          return 'Suspicious activity detected. For security reasons, please contact support for assistance.';
        
        case 'INVALID_TOKEN_FORMAT':
          return 'The invitation link appears to be corrupted. Please check the link or contact support for a new invitation.';
        
        case 'ACCOUNT_CREATION_FAILED':
          return 'We encountered an issue creating your account. Please try again or contact support if the problem persists.';
        
        case 'EMAIL_SEND_FAILED':
          return 'We had trouble sending your email. Your account may still be created successfully. Please check your email or contact support.';
        
        case 'DATABASE_ERROR':
          return 'We\'re experiencing technical difficulties. Please try again in a few minutes or contact support.';
        
        case 'NETWORK_ERROR':
          return 'Connection issue detected. Please check your internet connection and try again.';
        
        case 'PERMISSION_DENIED':
          return 'You don\'t have permission to perform this action. Please contact support if you believe this is an error.';
        
        case 'SERVICE_UNAVAILABLE':
          return 'Our service is temporarily unavailable. Please try again in a few minutes.';
        
        case 'VALIDATION_ERROR':
          return invitationError.message || 'Please check your information and try again.';
        
        default:
          return invitationError.message || 'An unexpected error occurred. Please try again or contact support.';
      }
    }
    
    // Handle standard Error objects
    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Connection issue detected. Please check your internet connection and try again.';
      }
      
      if (error.message.includes('timeout')) {
        return 'The request took too long to complete. Please try again.';
      }
      
      if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        return 'You don\'t have permission to perform this action. Please contact support.';
      }
      
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
    }
    
    // Handle string errors
    if (typeof error === 'string') {
      return error;
    }
    
    // Fallback for unknown error types
    return 'An unexpected error occurred. Please try again or contact support.';
  }

  /**
   * Get support contact information based on error type
   * Requirements: 5.5
   */
  static getSupportInfo(error: InvitationError | Error | any): {
    showContact: boolean;
    contactMethod: 'email' | 'form' | 'phone';
    message: string;
  } {
    const criticalErrors = [
      'REPLAY_ATTACK_DETECTED',
      'SUSPICIOUS_ACTIVITY',
      'SECURITY_VIOLATION',
      'ACCOUNT_COMPROMISED'
    ];
    
    const technicalErrors = [
      'DATABASE_ERROR',
      'SERVICE_UNAVAILABLE',
      'INTERNAL_SERVER_ERROR'
    ];
    
    const userErrors = [
      'TOKEN_EXPIRED',
      'EMAIL_MISMATCH',
      'VALIDATION_ERROR'
    ];

    const errorCode = error?.code || 'UNKNOWN';
    
    if (criticalErrors.includes(errorCode)) {
      return {
        showContact: true,
        contactMethod: 'email',
        message: 'For security reasons, please contact our support team immediately at support@flyingbus.com'
      };
    }
    
    if (technicalErrors.includes(errorCode)) {
      return {
        showContact: true,
        contactMethod: 'form',
        message: 'If this problem continues, please report it using our support form or email support@flyingbus.com'
      };
    }
    
    if (userErrors.includes(errorCode)) {
      return {
        showContact: true,
        contactMethod: 'email',
        message: 'Need help? Contact us at support@flyingbus.com and we\'ll assist you with your invitation'
      };
    }
    
    return {
      showContact: true,
      contactMethod: 'email',
      message: 'If you continue to experience issues, please contact support@flyingbus.com'
    };
  }

  /**
   * Handle errors with comprehensive logging and alerting
   * Requirements: 7.1, 7.2, 7.3
   */
  static async handleError(
    error: any,
    context: {
      operation: string;
      userId?: string;
      invitationId?: string;
      ipAddress?: string;
      userAgent?: string;
      additionalData?: Record<string, any>;
    }
  ): Promise<InvitationError> {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    // Create standardized error object
    const standardizedError: InvitationError = {
      code: error?.code || 'UNKNOWN_ERROR',
      message: error?.message || 'An unknown error occurred',
      details: {
        originalError: error,
        context,
        timestamp,
        errorId
      }
    };

    // Log error with appropriate severity
    const severity = this.getErrorSeverity(standardizedError);
    
    logger.error(LogSource.AUTH, `Invitation system error: ${context.operation}`, {
      errorId,
      errorCode: standardizedError.code,
      message: standardizedError.message,
      userId: context.userId,
      invitationId: context.invitationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      severity,
      stack: error?.stack,
      additionalData: context.additionalData
    });

    // Send admin alerts for critical errors
    if (severity === 'critical' || severity === 'high') {
      await this.sendAdminAlert(standardizedError, context, errorId);
    }

    // Log to security audit if security-related
    if (this.isSecurityError(standardizedError)) {
      await this.logSecurityEvent(standardizedError, context);
    }

    return standardizedError;
  }

  /**
   * Implement graceful degradation for service failures
   * Requirements: 7.2
   */
  static async handleServiceDegradation<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    context?: {
      serviceName: string;
      operation: string;
      userId?: string;
    }
  ): Promise<{ data?: T; error?: InvitationError; degraded: boolean }> {
    try {
      const result = await primaryOperation();
      return { data: result, degraded: false };
    } catch (primaryError) {
      logger.warn(LogSource.AUTH, `Primary service failed: ${context?.serviceName}`, {
        operation: context?.operation,
        error: primaryError,
        userId: context?.userId
      });

      // Try fallback if available
      if (fallbackOperation) {
        try {
          const fallbackResult = await fallbackOperation();
          logger.info(LogSource.AUTH, `Fallback successful: ${context?.serviceName}`, {
            operation: context?.operation,
            userId: context?.userId
          });
          return { data: fallbackResult, degraded: true };
        } catch (fallbackError) {
          logger.error(LogSource.AUTH, `Fallback also failed: ${context?.serviceName}`, {
            operation: context?.operation,
            primaryError,
            fallbackError,
            userId: context?.userId
          });
        }
      }

      // Handle the error and return standardized response
      const handledError = await this.handleError(primaryError, {
        operation: context?.operation || 'unknown',
        userId: context?.userId,
        additionalData: { serviceName: context?.serviceName }
      });

      return { error: handledError, degraded: true };
    }
  }

  /**
   * Create retry mechanism with exponential backoff
   * Requirements: 7.2
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      retryCondition?: (error: any) => boolean;
      context?: string;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryCondition = (error) => !this.isUserError(error),
      context = 'unknown operation'
    } = options;

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on final attempt or if retry condition fails
        if (attempt === maxRetries || !retryCondition(error)) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelay
        );
        
        logger.warn(LogSource.AUTH, `Retry attempt ${attempt + 1}/${maxRetries} for ${context}`, {
          error: error?.message,
          delay,
          attempt: attempt + 1
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Determine error severity for logging and alerting
   * Requirements: 7.1, 7.3
   */
  private static getErrorSeverity(error: InvitationError): 'low' | 'medium' | 'high' | 'critical' {
    const criticalErrors = [
      'SECURITY_VIOLATION',
      'REPLAY_ATTACK_DETECTED',
      'ACCOUNT_COMPROMISED',
      'DATA_CORRUPTION'
    ];
    
    const highErrors = [
      'DATABASE_ERROR',
      'SERVICE_UNAVAILABLE',
      'EMAIL_SEND_FAILED',
      'ACCOUNT_CREATION_FAILED'
    ];
    
    const mediumErrors = [
      'RATE_LIMIT_EXCEEDED',
      'TOKEN_VALIDATION_FAILED',
      'PERMISSION_DENIED'
    ];
    
    if (criticalErrors.includes(error.code)) return 'critical';
    if (highErrors.includes(error.code)) return 'high';
    if (mediumErrors.includes(error.code)) return 'medium';
    
    return 'low';
  }

  /**
   * Check if error is security-related
   */
  private static isSecurityError(error: InvitationError): boolean {
    const securityErrors = [
      'REPLAY_ATTACK_DETECTED',
      'RATE_LIMIT_EXCEEDED',
      'INVALID_TOKEN_FORMAT',
      'SUSPICIOUS_ACTIVITY',
      'EMAIL_MISMATCH',
      'PERMISSION_DENIED'
    ];
    
    return securityErrors.includes(error.code);
  }

  /**
   * Check if error is user-caused (shouldn't retry)
   */
  private static isUserError(error: any): boolean {
    const userErrors = [
      'VALIDATION_ERROR',
      'EMAIL_MISMATCH',
      'TOKEN_ALREADY_USED',
      'PERMISSION_DENIED',
      'INVALID_INPUT'
    ];
    
    return userErrors.includes(error?.code);
  }

  /**
   * Send admin alert for critical errors
   */
  private static async sendAdminAlert(
    error: InvitationError,
    context: any,
    errorId: string
  ): Promise<void> {
    try {
      const { AdminNotificationService } = await import('./adminNotificationService');
      
      await AdminNotificationService.createNotification(
        'security_alert',
        `System Error: ${error.code}`,
        `Error in ${context.operation}: ${error.message}`,
        context.invitationId,
        context.userId,
        {
          errorId,
          errorCode: error.code,
          operation: context.operation,
          ipAddress: context.ipAddress,
          timestamp: new Date().toISOString(),
          severity: this.getErrorSeverity(error)
        }
      );
    } catch (alertError) {
      logger.error(LogSource.AUTH, 'Failed to send admin alert', alertError);
    }
  }

  /**
   * Log security events to audit trail
   */
  private static async logSecurityEvent(
    error: InvitationError,
    context: any
  ): Promise<void> {
    try {
      const { invitationSecurityService } = await import('./invitationSecurityService');
      
      await invitationSecurityService.logSecurityEvent({
        eventType: `error_${error.code.toLowerCase()}`,
        ipAddress: context.ipAddress || 'unknown',
        email: context.additionalData?.email,
        userId: context.userId,
        invitationId: context.invitationId,
        details: {
          operation: context.operation,
          errorMessage: error.message,
          userAgent: context.userAgent
        },
        severity: this.getErrorSeverity(error) as any
      });
    } catch (securityLogError) {
      logger.error(LogSource.AUTH, 'Failed to log security event', securityLogError);
    }
  }

  /**
   * Generate unique error ID for tracking
   */
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create error recovery suggestions
   * Requirements: 5.5
   */
  static getRecoverySuggestions(error: InvitationError): string[] {
    const suggestions: string[] = [];
    
    switch (error.code) {
      case 'TOKEN_EXPIRED':
        suggestions.push('Contact support to request a new invitation');
        suggestions.push('Check if you have a more recent invitation email');
        break;
        
      case 'EMAIL_MISMATCH':
        suggestions.push('Use the email address that received the invitation');
        suggestions.push('Check for typos in your email address');
        suggestions.push('Contact support if you\'re using the correct email');
        break;
        
      case 'RATE_LIMIT_EXCEEDED':
        suggestions.push('Wait 15 minutes before trying again');
        suggestions.push('Clear your browser cache and cookies');
        suggestions.push('Try using a different browser or device');
        break;
        
      case 'NETWORK_ERROR':
        suggestions.push('Check your internet connection');
        suggestions.push('Try refreshing the page');
        suggestions.push('Disable VPN if you\'re using one');
        break;
        
      case 'SERVICE_UNAVAILABLE':
        suggestions.push('Try again in a few minutes');
        suggestions.push('Check our status page for service updates');
        break;
        
      default:
        suggestions.push('Try refreshing the page');
        suggestions.push('Clear your browser cache');
        suggestions.push('Contact support if the problem persists');
    }
    
    return suggestions;
  }

  /**
   * Format error for display in UI components
   * Requirements: 5.5
   */
  static formatErrorForUI(error: any): {
    title: string;
    message: string;
    suggestions: string[];
    supportInfo: {
      showContact: boolean;
      contactMethod: 'email' | 'form' | 'phone';
      message: string;
    };
    severity: 'info' | 'warning' | 'error' | 'critical';
  } {
    const standardizedError = error as InvitationError;
    const userMessage = this.getUserFriendlyMessage(standardizedError);
    const suggestions = this.getRecoverySuggestions(standardizedError);
    const supportInfo = this.getSupportInfo(standardizedError);
    const severity = this.getErrorSeverity(standardizedError);
    
    const titleMap: Record<string, string> = {
      'TOKEN_EXPIRED': 'Invitation Expired',
      'EMAIL_MISMATCH': 'Email Address Mismatch',
      'RATE_LIMIT_EXCEEDED': 'Too Many Attempts',
      'NETWORK_ERROR': 'Connection Problem',
      'SERVICE_UNAVAILABLE': 'Service Temporarily Unavailable',
      'ACCOUNT_CREATION_FAILED': 'Account Creation Failed',
      'EMAIL_SEND_FAILED': 'Email Delivery Issue'
    };
    
    const title = titleMap[standardizedError.code] || 'Error';
    
    const severityMap: Record<string, 'info' | 'warning' | 'error' | 'critical'> = {
      'low': 'info',
      'medium': 'warning',
      'high': 'error',
      'critical': 'critical'
    };
    
    return {
      title,
      message: userMessage,
      suggestions,
      supportInfo,
      severity: severityMap[severity] || 'error'
    };
  }
}

// Export singleton instance
export const invitationErrorHandler = InvitationErrorHandler;