/**
 * RLS (Row Level Security) Policy Error Handler
 * 
 * Provides specific error handling for RLS policy violations and database permission errors
 * that commonly occur in the invitation system.
 */

import { UserFriendlyError } from '@/utils/userFriendlyErrors';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

export interface RLSErrorContext {
  operation: string;
  table?: string;
  userId?: string;
  userRole?: string;
  isAuthenticated?: boolean;
  component?: string;
}

export interface RLSErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'rls_policy' | 'permission' | 'authentication' | 'database';
  recoveryActions: string[];
  adminRequired?: boolean;
  fallbackAvailable?: boolean;
}

/**
 * RLS error patterns and their mappings
 */
export const RLS_ERROR_PATTERNS: Record<string, RLSErrorDetails> = {
  'PGRST301': {
    code: 'RLS_POLICY_VIOLATION',
    message: 'Row Level Security policy violation',
    userMessage: 'You don\'t have permission to access this data.',
    retryable: false,
    severity: 'medium',
    category: 'rls_policy',
    recoveryActions: [
      'Verify you are logged in with the correct account',
      'Contact an administrator if you believe you should have access',
      'Try refreshing the page to update your session'
    ],
    adminRequired: false
  },
  'PGRST116': {
    code: 'JWT_EXPIRED',
    message: 'JWT token has expired',
    userMessage: 'Your session has expired. Please log in again.',
    retryable: true,
    severity: 'medium',
    category: 'authentication',
    recoveryActions: [
      'Log out and log back in',
      'Refresh the page to renew your session',
      'Clear your browser cache if the problem persists'
    ],
    adminRequired: false
  },
  'PGRST204': {
    code: 'NO_ROWS_RETURNED',
    message: 'No rows returned from query',
    userMessage: 'The requested data could not be found or you don\'t have access to it.',
    retryable: true,
    severity: 'low',
    category: 'rls_policy',
    recoveryActions: [
      'Verify the data exists',
      'Check your permissions',
      'Try refreshing the page'
    ],
    adminRequired: false
  },
  'PGRST103': {
    code: 'INSUFFICIENT_PRIVILEGE',
    message: 'Insufficient privilege',
    userMessage: 'You don\'t have sufficient permissions for this operation.',
    retryable: false,
    severity: 'medium',
    category: 'permission',
    recoveryActions: [
      'Contact an administrator for elevated permissions',
      'Verify you are using the correct account',
      'Check if your account needs activation'
    ],
    adminRequired: true
  },
  'PGRST000': {
    code: 'CONNECTION_ERROR',
    message: 'Database connection error',
    userMessage: 'Unable to connect to the database. Please try again.',
    retryable: true,
    severity: 'high',
    category: 'database',
    recoveryActions: [
      'Try again in a few moments',
      'Check your internet connection',
      'Contact support if the problem persists'
    ],
    adminRequired: false,
    fallbackAvailable: true
  }
};

/**
 * Specific error patterns for invitation system operations
 */
export const INVITATION_RLS_ERRORS: Record<string, RLSErrorDetails> = {
  'INVITATION_REQUESTS_INSERT_DENIED': {
    code: 'INVITATION_INSERT_DENIED',
    message: 'Cannot insert invitation request due to RLS policy',
    userMessage: 'Unable to submit your invitation request due to permission restrictions.',
    retryable: true,
    severity: 'medium',
    category: 'rls_policy',
    recoveryActions: [
      'Try logging out and submitting as an anonymous user',
      'Refresh the page and try again',
      'Contact support if you continue to have issues'
    ],
    adminRequired: false,
    fallbackAvailable: true
  },
  'EMAIL_EVENTS_INSERT_DENIED': {
    code: 'EMAIL_EVENTS_INSERT_DENIED',
    message: 'Cannot log email events due to RLS policy',
    userMessage: 'Your request was processed but we couldn\'t log the email notification.',
    retryable: false,
    severity: 'low',
    category: 'rls_policy',
    recoveryActions: [
      'Your request was still successful',
      'Check your email for confirmation',
      'Contact support if you don\'t receive expected emails'
    ],
    adminRequired: false
  },
  'INVITATION_UPDATE_DENIED': {
    code: 'INVITATION_UPDATE_DENIED',
    message: 'Cannot update invitation status due to RLS policy',
    userMessage: 'Unable to update the invitation status. Admin permissions may be required.',
    retryable: true,
    severity: 'medium',
    category: 'rls_policy',
    recoveryActions: [
      'Verify you have admin permissions',
      'Try using the admin service with elevated permissions',
      'Contact a system administrator'
    ],
    adminRequired: true,
    fallbackAvailable: true
  },
  'AUDIT_LOGS_INSERT_DENIED': {
    code: 'AUDIT_LOGS_INSERT_DENIED',
    message: 'Cannot create audit log due to RLS policy',
    userMessage: 'The operation completed but audit logging failed.',
    retryable: false,
    severity: 'low',
    category: 'rls_policy',
    recoveryActions: [
      'The main operation was successful',
      'Audit logging will be handled by system processes',
      'No action required from you'
    ],
    adminRequired: false
  }
};

/**
 * Detect RLS policy violations from error messages and codes
 */
export function detectRLSError(error: any, context: RLSErrorContext): RLSErrorDetails | null {
  if (!error) return null;

  const errorMessage = (error.message || error.error || '').toLowerCase();
  const errorCode = error.code || error.status;

  // Check for specific PostgreSQL error codes
  if (errorCode && RLS_ERROR_PATTERNS[errorCode]) {
    return RLS_ERROR_PATTERNS[errorCode];
  }

  // Check for invitation-specific RLS errors
  for (const [pattern, details] of Object.entries(INVITATION_RLS_ERRORS)) {
    if (errorMessage.includes(pattern.toLowerCase()) || 
        errorMessage.includes(details.code.toLowerCase())) {
      return details;
    }
  }

  // Check for common RLS error message patterns
  const rlsPatterns = [
    { pattern: 'row level security', error: 'PGRST301' },
    { pattern: 'jwt', error: 'PGRST116' },
    { pattern: 'insufficient privilege', error: 'PGRST103' },
    { pattern: 'permission denied', error: 'PGRST103' },
    { pattern: 'policy violation', error: 'PGRST301' },
    { pattern: 'access denied', error: 'PGRST301' },
    { pattern: 'forbidden', error: 'PGRST301' }
  ];

  for (const { pattern, error: errorKey } of rlsPatterns) {
    if (errorMessage.includes(pattern)) {
      return RLS_ERROR_PATTERNS[errorKey] || null;
    }
  }

  // Check for table-specific patterns based on context
  if (context.table) {
    if (context.table === 'invitation_requests' && errorMessage.includes('insert')) {
      return INVITATION_RLS_ERRORS['INVITATION_REQUESTS_INSERT_DENIED'];
    }
    if (context.table === 'email_events' && errorMessage.includes('insert')) {
      return INVITATION_RLS_ERRORS['EMAIL_EVENTS_INSERT_DENIED'];
    }
    if (context.table === 'invitation_requests' && errorMessage.includes('update')) {
      return INVITATION_RLS_ERRORS['INVITATION_UPDATE_DENIED'];
    }
    if (context.table === 'audit_logs' && errorMessage.includes('insert')) {
      return INVITATION_RLS_ERRORS['AUDIT_LOGS_INSERT_DENIED'];
    }
  }

  return null;
}

/**
 * Generate user-friendly error message for RLS violations
 */
export function generateRLSErrorMessage(
  error: any, 
  context: RLSErrorContext
): UserFriendlyError {
  const rlsError = detectRLSError(error, context);

  if (!rlsError) {
    // Fallback for non-RLS errors
    return {
      title: 'Permission Error',
      message: 'You don\'t have permission to perform this action.',
      details: error.message || 'Unknown permission error',
      nextSteps: [
        'Verify you are logged in with the correct account',
        'Contact support if you believe this is an error',
        'Try refreshing the page'
      ],
      retryable: true,
      retryLabel: 'Try Again'
    };
  }

  // Generate context-specific recovery actions
  const contextualActions = generateContextualRecoveryActions(rlsError, context);

  return {
    title: getRLSErrorTitle(rlsError),
    message: rlsError.userMessage,
    details: `${rlsError.code}: ${rlsError.message}`,
    nextSteps: [...rlsError.recoveryActions, ...contextualActions],
    retryable: rlsError.retryable,
    retryLabel: rlsError.retryable ? 'Try Again' : undefined
  };
}

/**
 * Generate contextual recovery actions based on the operation and user context
 */
function generateContextualRecoveryActions(
  rlsError: RLSErrorDetails, 
  context: RLSErrorContext
): string[] {
  const actions: string[] = [];

  // Add authentication-specific actions
  if (rlsError.category === 'authentication') {
    if (context.isAuthenticated) {
      actions.push('Your session may have expired - try logging out and back in');
    } else {
      actions.push('Try logging in to access this feature');
    }
  }

  // Add operation-specific actions
  switch (context.operation) {
    case 'form_submission':
      if (!context.isAuthenticated) {
        actions.push('Anonymous form submission should work - try refreshing the page');
      }
      if (rlsError.fallbackAvailable) {
        actions.push('The system will attempt alternative submission methods');
      }
      break;

    case 'admin_operation':
      if (context.userRole !== 'admin' && context.userRole !== 'moderator') {
        actions.push('This operation requires admin or moderator permissions');
      }
      if (rlsError.fallbackAvailable) {
        actions.push('The system will try alternative admin methods');
      }
      break;

    case 'data_loading':
      actions.push('Try refreshing the page to reload the data');
      if (context.isAuthenticated) {
        actions.push('Your permissions may have changed - try logging out and back in');
      }
      break;
  }

  // Add component-specific actions
  if (context.component === 'RequestInvitation') {
    actions.push('Invitation requests should work for both logged-in and anonymous users');
    if (context.isAuthenticated) {
      actions.push('Try logging out and submitting the form anonymously');
    }
  }

  if (context.component === 'InvitationManagement') {
    actions.push('Admin operations require proper permissions and may use elevated access');
    actions.push('Contact a system administrator if you should have access');
  }

  return actions;
}

/**
 * Get appropriate title for RLS error based on category
 */
function getRLSErrorTitle(rlsError: RLSErrorDetails): string {
  switch (rlsError.category) {
    case 'rls_policy':
      return 'Access Restricted';
    case 'permission':
      return 'Permission Denied';
    case 'authentication':
      return 'Authentication Required';
    case 'database':
      return 'Database Error';
    default:
      return 'Access Error';
  }
}

/**
 * Log RLS error with appropriate context and severity
 */
export function logRLSError(
  error: any, 
  context: RLSErrorContext, 
  rlsError?: RLSErrorDetails
): void {
  const detectedError = rlsError || detectRLSError(error, context);
  
  const logData = {
    rlsErrorCode: detectedError?.code || 'UNKNOWN_RLS_ERROR',
    originalError: {
      message: error.message,
      code: error.code,
      status: error.status
    },
    context,
    severity: detectedError?.severity || 'medium',
    category: detectedError?.category || 'rls_policy',
    retryable: detectedError?.retryable || false,
    adminRequired: detectedError?.adminRequired || false,
    fallbackAvailable: detectedError?.fallbackAvailable || false,
    timestamp: new Date().toISOString()
  };

  const logLevel = detectedError?.severity === 'critical' ? 'error' : 
                   detectedError?.severity === 'high' ? 'error' :
                   detectedError?.severity === 'medium' ? 'warn' : 'info';

  logger[logLevel]('RLS Policy Error Detected', {
    source: LogSource.ADMIN_SERVICE,
    ...logData
  });
}

/**
 * Check if an error is an RLS policy violation
 */
export function isRLSError(error: any): boolean {
  return detectRLSError(error, { operation: 'unknown' }) !== null;
}

/**
 * Get suggested fallback actions for RLS errors
 */
export function getRLSFallbackActions(
  error: any, 
  context: RLSErrorContext
): string[] {
  const rlsError = detectRLSError(error, context);
  
  if (!rlsError || !rlsError.fallbackAvailable) {
    return [];
  }

  const fallbackActions: string[] = [];

  switch (context.operation) {
    case 'form_submission':
      fallbackActions.push('Try submitting as an anonymous user');
      fallbackActions.push('Use alternative submission method');
      break;

    case 'admin_operation':
      fallbackActions.push('Use service role elevation');
      fallbackActions.push('Try alternative admin method');
      break;

    case 'email_logging':
      fallbackActions.push('Skip email event logging');
      fallbackActions.push('Use system-level logging');
      break;
  }

  return fallbackActions;
}