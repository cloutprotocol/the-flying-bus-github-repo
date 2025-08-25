# Email Notification System - Error Handling

This document describes the comprehensive error handling system implemented for the email notification system.

## Overview

The error handling system provides:
- Standardized error codes and messages
- User-friendly error formatting
- Retry mechanisms with exponential backoff
- Comprehensive logging and monitoring
- React hooks for UI error handling
- Enhanced error boundaries

## Components

### 1. Error Handling Utilities (`src/utils/errorHandling.ts`)

#### Error Information System
- **Error Mappings**: Predefined error codes with user-friendly messages and recovery actions
- **Error Categories**: validation, network, server, auth, business
- **Severity Levels**: low, medium, high, critical

#### Key Functions
- `getErrorInfo(code, message?)`: Get detailed error information for a code
- `isRetryableError(error)`: Determine if an error should be retried
- `withRetry(operation, config?)`: Execute operation with retry logic
- `formatErrorForUser(error)`: Format error for user display
- `logError(error, context?)`: Log error with appropriate severity
- `createError(code, message?, details?)`: Create standardized error objects
- `validateEmail(email)`: Validate email addresses with detailed error info

#### Error Codes

**Email Service Errors:**
- `INVALID_EMAIL_FORMAT`: Invalid email address format
- `EMAIL_SERVICE_FAILURE`: Email service temporarily unavailable
- `EMAIL_SEND_FAILED`: Failed to send email
- `TEMPLATE_ERROR`: Email template error
- `RATE_LIMITED`: Rate limit exceeded

**Token Service Errors:**
- `TOKEN_NOT_FOUND`: Token not found or invalid
- `TOKEN_EXPIRED`: Token has expired
- `TOKEN_ALREADY_EXISTS`: Active token already exists
- `INVALID_TOKEN_FORMAT`: Invalid token format

**Invitation Service Errors:**
- `INVITATION_NOT_FOUND`: Invitation not found
- `INVITATION_NOT_APPROVED`: Invitation not approved
- `EMAIL_MISMATCH`: Email doesn't match invitation

**System Errors:**
- `NETWORK_ERROR`: Network connection failed
- `TIMEOUT_ERROR`: Request timed out
- `DATABASE_ERROR`: Database error
- `UNEXPECTED_ERROR`: Unexpected error occurred

### 2. React Error Hooks (`src/hooks/useErrorHandler.ts`)

#### `useErrorHandler(options?)`
General-purpose error handling hook with:
- Error state management
- Toast notifications
- Error logging
- Retry operations
- Error recovery

#### `useEmailErrorHandler()`
Specialized hook for email operations with:
- Email-specific retry configuration
- `sendEmailWithRetry()` method

#### `useTokenErrorHandler()`
Specialized hook for token operations with:
- Token-specific retry configuration
- `validateTokenWithRetry()` method

#### `useInvitationErrorHandler()`
Specialized hook for invitation operations with:
- Invitation-specific retry configuration
- `processInvitationWithRetry()` method

### 3. Enhanced Error Boundary (`src/components/ErrorBoundary/ErrorBoundary.tsx`)

Features:
- Unique error ID generation for tracking
- Enhanced error logging with context
- User-friendly error display
- Recovery actions (retry, refresh, go home)
- Bug reporting functionality
- Technical details toggle
- Full-page and inline error modes

### 4. Service Layer Enhancements

#### Email Service (`supabase/functions/send-email/`)
- Enhanced input validation
- Retry logic with exponential backoff
- Comprehensive error responses
- Template error handling
- Rate limiting detection

#### Token Service (`supabase/functions/invitation-tokens/`)
- Enhanced token validation
- Detailed error responses
- Security checks
- Database retry logic

#### Invitation Service (`src/services/invitationService.ts`)
- Retry mechanisms for API calls
- Enhanced error handling
- Timeout protection
- Detailed error codes

## Usage Examples

### Basic Error Handling
```typescript
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const { errorState, handleError, clearError, executeWithErrorHandling } = useErrorHandler();

  const handleSubmit = async () => {
    const result = await executeWithErrorHandling(async () => {
      // Your operation here
      return await someApiCall();
    });

    if (result) {
      // Success
    }
    // Error is automatically handled
  };

  return (
    <div>
      {errorState.hasError && (
        <div className="error">
          {errorState.message}
          {errorState.canRetry && (
            <button onClick={() => handleSubmit()}>Try Again</button>
          )}
        </div>
      )}
    </div>
  );
}
```

### Email Operations
```typescript
import { useEmailErrorHandler } from '@/hooks/useErrorHandler';

function EmailComponent() {
  const { sendEmailWithRetry } = useEmailErrorHandler();

  const sendEmail = async () => {
    await sendEmailWithRetry(async () => {
      return await emailService.sendEmail(emailData);
    });
  };
}
```

### Manual Error Handling
```typescript
import { withRetry, formatErrorForUser, logError } from '@/utils/errorHandling';

async function robustOperation() {
  try {
    return await withRetry(async () => {
      return await riskyOperation();
    }, {
      maxAttempts: 3,
      baseDelay: 1000
    });
  } catch (error) {
    logError(error, { operation: 'robustOperation' });
    const userError = formatErrorForUser(error);
    showToast(userError.message);
    throw error;
  }
}
```

### Error Boundary Usage
```typescript
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary 
      component="App"
      showDetails={process.env.NODE_ENV === 'development'}
      fullPage={true}
    >
      <MyApplication />
    </ErrorBoundary>
  );
}
```

## Configuration

### Retry Configuration
```typescript
interface RetryConfig {
  maxAttempts: number;     // Default: 3
  baseDelay: number;       // Default: 1000ms
  maxDelay: number;        // Default: 10000ms
  backoffMultiplier: number; // Default: 2
}
```

### Error Handler Options
```typescript
interface UseErrorHandlerOptions {
  showToast?: boolean;     // Default: true
  logErrors?: boolean;     // Default: true
  retryConfig?: Partial<RetryConfig>;
}
```

## Best Practices

### 1. Error Code Usage
- Always use predefined error codes when possible
- Create new error codes for new error types
- Include error codes in API responses

### 2. User Messages
- Keep user messages simple and actionable
- Provide recovery actions when possible
- Avoid technical jargon

### 3. Logging
- Include relevant context in error logs
- Use appropriate severity levels
- Include error IDs for tracking

### 4. Retry Logic
- Only retry retryable errors
- Use exponential backoff
- Set reasonable maximum attempts

### 5. Error Boundaries
- Use error boundaries at appropriate component levels
- Provide fallback UI for critical errors
- Include error reporting mechanisms

## Testing

The error handling system includes comprehensive tests:
- Unit tests for all utility functions
- Hook tests with mocked dependencies
- Integration tests for error flows
- Edge case testing

Run tests with:
```bash
npx vitest run src/utils/__tests__/errorHandling.test.ts
npx vitest run src/hooks/__tests__/useErrorHandler.test.ts
```

## Monitoring and Analytics

### Error Tracking
- Unique error IDs for correlation
- Error frequency and patterns
- User impact analysis
- Recovery success rates

### Metrics to Monitor
- Email delivery success rate
- Token validation failure rate
- Retry attempt frequency
- Error boundary activation rate

### Integration Points
- Sentry for error tracking
- Custom analytics for business metrics
- Log aggregation systems
- Alerting for critical errors

## Future Enhancements

1. **Circuit Breaker Pattern**: Prevent cascading failures
2. **Error Rate Limiting**: Prevent error spam
3. **Smart Retry**: ML-based retry decisions
4. **Error Correlation**: Link related errors
5. **User Feedback**: Collect user error reports
6. **A/B Testing**: Test error message effectiveness