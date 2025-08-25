// Registration-specific error types and interfaces

export type RegistrationErrorType = 'validation' | 'rls' | 'network' | 'session' | 'invitation' | 'unknown';

export type RegistrationErrorCode = 
  // Validation errors
  | 'VALIDATION_FAILED'
  | 'EMAIL_INVALID'
  | 'PASSWORD_WEAK'
  | 'REQUIRED_FIELD_MISSING'
  | 'TERMS_NOT_ACCEPTED'
  
  // RLS and permission errors
  | 'RLS_POLICY_VIOLATION'
  | 'PERMISSION_DENIED'
  | 'PROFILE_CREATION_FAILED'
  | 'SERVICE_ROLE_REQUIRED'
  
  // Network errors
  | 'NETWORK_ERROR'
  | 'REQUEST_TIMEOUT'
  | 'CONNECTION_FAILED'
  | 'API_UNAVAILABLE'
  
  // Session errors
  | 'SESSION_ESTABLISHMENT_FAILED'
  | 'TOKEN_INVALID'
  | 'AUTH_STATE_INCONSISTENT'
  
  // Invitation errors
  | 'INVITATION_EXPIRED'
  | 'INVITATION_INVALID'
  | 'INVITATION_ALREADY_USED'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_ERROR'
  
  // Unknown errors
  | 'UNKNOWN_ERROR'
  | 'UNEXPECTED_ERROR';

export interface RegistrationErrorContext {
  userId?: string;
  email?: string;
  registrationType?: 'standard' | 'invitation';
  invitationToken?: string;
  attempt?: number;
  timestamp?: string;
  userAgent?: string;
  ipAddress?: string;
  formData?: Record<string, any>;
  stackTrace?: string;
}

export interface RegistrationErrorDetails {
  code: RegistrationErrorCode;
  type: RegistrationErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  technicalDetails?: string;
  context?: RegistrationErrorContext;
  suggestedAction?: string;
  helpUrl?: string;
}

export interface RetryConfiguration {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrorTypes: RegistrationErrorType[];
  retryableErrorCodes: RegistrationErrorCode[];
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'escalate' | 'fallback' | 'redirect' | 'manual';
  description: string;
  automated: boolean;
  requiresUserAction: boolean;
  actionData?: Record<string, any>;
}

export interface RegistrationErrorReport {
  error: RegistrationErrorDetails;
  recoveryActions: ErrorRecoveryAction[];
  timestamp: string;
  resolved: boolean;
  resolution?: string;
}

// Form-specific error interfaces
export interface FormFieldError {
  field: string;
  message: string;
  code: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
  globalError?: string;
}

// User-friendly error messages mapping
export const ERROR_MESSAGES: Record<RegistrationErrorCode, string> = {
  // Validation errors
  VALIDATION_FAILED: 'Please check your input and try again.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
  REQUIRED_FIELD_MISSING: 'Please fill in all required fields.',
  TERMS_NOT_ACCEPTED: 'Please accept the terms and conditions to continue.',
  
  // RLS and permission errors
  RLS_POLICY_VIOLATION: 'There was an issue creating your account. Please try again.',
  PERMISSION_DENIED: 'Account creation failed due to permissions. Please contact support.',
  PROFILE_CREATION_FAILED: 'Unable to create your profile. Please try again.',
  SERVICE_ROLE_REQUIRED: 'Account creation requires elevated permissions. Please try again.',
  
  // Network errors
  NETWORK_ERROR: 'Connection issue detected. Please check your internet and try again.',
  REQUEST_TIMEOUT: 'Request timed out. Please try again.',
  CONNECTION_FAILED: 'Unable to connect to our servers. Please try again.',
  API_UNAVAILABLE: 'Our service is temporarily unavailable. Please try again later.',
  
  // Session errors
  SESSION_ESTABLISHMENT_FAILED: 'Account created but login failed. Please sign in manually.',
  TOKEN_INVALID: 'Authentication token is invalid. Please try again.',
  AUTH_STATE_INCONSISTENT: 'Authentication state error. Please refresh and try again.',
  
  // Invitation errors
  INVITATION_EXPIRED: 'This invitation has expired. Please request a new invitation.',
  INVITATION_INVALID: 'This invitation is invalid or malformed.',
  INVITATION_ALREADY_USED: 'This invitation has already been used.',
  INVITATION_NOT_FOUND: 'Invitation not found. Please check the link.',
  INVITATION_ERROR: 'There was an issue with your invitation. Please contact support.',
  
  // Unknown errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  UNEXPECTED_ERROR: 'Something went wrong. Please contact support if this persists.'
};

// Recovery action templates
export const RECOVERY_ACTIONS: Record<RegistrationErrorType, ErrorRecoveryAction[]> = {
  validation: [
    {
      type: 'manual',
      description: 'Correct the form fields and try again',
      automated: false,
      requiresUserAction: true
    }
  ],
  rls: [
    {
      type: 'retry',
      description: 'Retry with service role escalation',
      automated: true,
      requiresUserAction: false
    },
    {
      type: 'escalate',
      description: 'Escalate to support team',
      automated: false,
      requiresUserAction: true
    }
  ],
  network: [
    {
      type: 'retry',
      description: 'Retry with exponential backoff',
      automated: true,
      requiresUserAction: false
    },
    {
      type: 'manual',
      description: 'Check internet connection and try again',
      automated: false,
      requiresUserAction: true
    }
  ],
  session: [
    {
      type: 'retry',
      description: 'Retry session establishment',
      automated: true,
      requiresUserAction: false
    },
    {
      type: 'redirect',
      description: 'Redirect to manual login',
      automated: true,
      requiresUserAction: false,
      actionData: { redirectUrl: '/login' }
    }
  ],
  invitation: [
    {
      type: 'manual',
      description: 'Request new invitation or contact support',
      automated: false,
      requiresUserAction: true
    }
  ],
  unknown: [
    {
      type: 'retry',
      description: 'Retry operation once',
      automated: true,
      requiresUserAction: false
    },
    {
      type: 'escalate',
      description: 'Contact support with error details',
      automated: false,
      requiresUserAction: true
    }
  ]
};