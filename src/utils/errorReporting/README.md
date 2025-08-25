# Error Reporting and Debugging Utilities

This module provides comprehensive error reporting, logging, and debugging utilities for the application. It's designed to help identify and resolve issues with form submissions, navigation, authentication, and component lifecycle management.

## Features

- **Structured Error Logging**: Capture errors with full context and stack traces
- **Form Submission Tracking**: Monitor form submissions from start to completion
- **Network Request Logging**: Log all network requests with timing and response details
- **Authentication State Monitoring**: Track auth state changes and session management
- **Component Lifecycle Tracking**: Monitor component mount/unmount and updates
- **Async Operation Management**: Track long-running operations with retry logic
- **Debug Utilities**: Built-in tools for analyzing logs and monitoring issues
- **Data Sanitization**: Automatically redact sensitive information from logs
- **Memory Management**: Automatic log rotation to prevent memory leaks

## Quick Start

```typescript
import {
  logError,
  logFormSubmission,
  logNetworkRequest,
  logAuthStateChange,
  logComponentLifecycle,
  logAsyncOperation,
  debugUtils
} from '@/utils/errorReporting';
```

## Core Functions

### Error Logging

```typescript
// Log an error with context
const errorId = logError(
  'ComponentName',
  'operationName',
  error,
  { additionalContext: 'value' },
  'userId',
  'sessionId'
);
```

### Form Submission Tracking

```typescript
// Start tracking a form submission
const submissionId = logFormSubmission(formData, 'started');

// Update submission status
logFormSubmission(formData, 'success', undefined, 0, submissionId);

// Log submission error
logFormSubmission(formData, 'error', 'Network timeout', 2, submissionId);
```

### Network Request Logging

```typescript
const startTime = Date.now();

// Make your request
const response = await fetch('/api/endpoint', options);

// Log the request
logNetworkRequest(
  '/api/endpoint',
  'POST',
  headers,
  requestBody,
  response.status,
  responseHeaders,
  responseBody,
  startTime
);
```

### Authentication State Changes

```typescript
logAuthStateChange(
  'unauthenticated',
  'authenticated',
  'login',
  'userId',
  'sessionId',
  { method: 'email' }
);
```

### Component Lifecycle

```typescript
// In a React component
useEffect(() => {
  const componentId = logComponentLifecycle('MyComponent', 'mount', props);
  
  return () => {
    logComponentLifecycle('MyComponent', 'unmount');
  };
}, []);
```

### Async Operations

```typescript
const operationId = logAsyncOperation('dataFetch', 'started', { url });

try {
  const result = await fetchData();
  logAsyncOperation('dataFetch', 'success', { recordCount: result.length }, undefined, 0, operationId, startTime);
} catch (error) {
  logAsyncOperation('dataFetch', 'error', {}, error.message, 0, operationId, startTime);
}
```

## Debug Utilities

### Development Console

In development mode, debug utilities are available globally:

```javascript
// Access debug utilities in browser console
window.debugUtils.getLogs()
window.debugUtils.getLogSummary()
window.debugUtils.monitorFormSubmissions(60) // Last 60 minutes
window.debugUtils.monitorNetworkIssues(30)   // Last 30 minutes
window.debugUtils.monitorAuthIssues(60)      // Last 60 minutes
```

### Programmatic Access

```typescript
import { debugUtils } from '@/utils/errorReporting';

// Get log summary
const summary = debugUtils.getLogSummary();

// Monitor specific issues
const formIssues = debugUtils.monitorFormSubmissions(60);
const networkIssues = debugUtils.monitorNetworkIssues(60);
const authIssues = debugUtils.monitorAuthIssues(60);

// Export logs for analysis
const exportedLogs = debugUtils.exportLogs();
```

## Integration Examples

### Enhanced Form Component

```typescript
import { logFormSubmission, logError } from '@/utils/errorReporting';

const MyForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (formData) => {
    const submissionId = logFormSubmission(formData, 'started');
    setIsSubmitting(true);
    
    try {
      logFormSubmission(formData, 'validating', undefined, 0, submissionId);
      
      // Validation logic here
      
      logFormSubmission(formData, 'submitting', undefined, 0, submissionId);
      
      const result = await submitForm(formData);
      
      logFormSubmission(formData, 'success', undefined, 0, submissionId);
      
      // Handle success
      
    } catch (error) {
      logFormSubmission(formData, 'error', error.message, 0, submissionId);
      logError('MyForm', 'handleSubmit', error, { formData, submissionId });
      
      // Handle error
      
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Rest of component
};
```

### Enhanced API Service

```typescript
import { logNetworkRequest, logError } from '@/utils/errorReporting';

class ApiService {
  async request(url: string, options: RequestInit = {}) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, options);
      
      logNetworkRequest(
        url,
        options.method || 'GET',
        options.headers as Record<string, string>,
        options.body,
        response.status,
        Object.fromEntries(response.headers.entries()),
        undefined, // Response body logged separately for security
        startTime
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
      
    } catch (error) {
      logError('ApiService', 'request', error, { url, options });
      throw error;
    }
  }
}
```

### Enhanced Auth Provider

```typescript
import { logAuthStateChange, logError } from '@/utils/errorReporting';

const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState('initializing');
  
  const login = async (credentials) => {
    const startTime = Date.now();
    
    try {
      logAuthStateChange('unauthenticated', 'authenticating', 'login', undefined, undefined, {}, undefined, startTime);
      
      const result = await authService.login(credentials);
      
      logAuthStateChange(
        'authenticating',
        'authenticated',
        'login',
        result.user.id,
        result.session.id,
        { method: 'email' },
        undefined,
        startTime
      );
      
      setAuthState('authenticated');
      
    } catch (error) {
      logAuthStateChange(
        'authenticating',
        'error',
        'login',
        undefined,
        undefined,
        { method: 'email' },
        error.message,
        startTime
      );
      
      logError('AuthProvider', 'login', error, { credentials: { email: credentials.email } });
      
      setAuthState('unauthenticated');
      throw error;
    }
  };
  
  // Rest of provider
};
```

## Data Sanitization

The error reporting system automatically sanitizes sensitive data:

- **Passwords**: Any field containing "password" is redacted
- **Tokens**: Any field containing "token" is redacted  
- **API Keys**: Any field containing "apikey" is redacted
- **Secrets**: Any field containing "secret" is redacted
- **Authorization**: Any field containing "authorization" is redacted

```typescript
// This data will be sanitized automatically
const sensitiveData = {
  email: 'user@example.com',        // ✅ Logged
  password: 'secret123',            // ❌ Redacted as [REDACTED]
  apiKey: 'key-123',               // ❌ Redacted as [REDACTED]
  authToken: 'bearer-token',       // ❌ Redacted as [REDACTED]
  normalField: 'safe-data'         // ✅ Logged
};
```

## Memory Management

The system automatically manages memory by:

- Limiting each log type to 1000 entries maximum
- Automatically removing oldest entries when limit is reached
- Providing manual cleanup methods

```typescript
// Clear all logs manually
debugUtils.clearLogs();

// Get logs within time range to avoid memory issues
const recentLogs = errorReporter.getLogsByTimeRange('errors', startTime, endTime);
```

## Performance Considerations

- **Development Mode**: Full logging with console output
- **Production Mode**: Structured logging without console output
- **Automatic Cleanup**: Prevents memory leaks with automatic log rotation
- **Lazy Evaluation**: Logs are only processed when accessed
- **Sanitization**: Minimal performance impact with efficient sanitization

## Troubleshooting Common Issues

### Form Submissions Getting Stuck

```typescript
// Monitor recent form submissions
const submissions = debugUtils.monitorFormSubmissions(30);
const stuckSubmissions = submissions.filter(s => 
  s.status === 'submitting' && 
  Date.now() - s.timestamp > 30000 // Stuck for more than 30 seconds
);
```

### Network Request Issues

```typescript
// Monitor failed network requests
const networkIssues = debugUtils.monitorNetworkIssues(60);
const timeouts = networkIssues.filter(req => req.duration > 30000);
const serverErrors = networkIssues.filter(req => req.responseStatus >= 500);
```

### Authentication Problems

```typescript
// Monitor auth state issues
const authIssues = debugUtils.monitorAuthIssues(60);
const failedLogins = authIssues.filter(auth => 
  auth.operation === 'login' && auth.error
);
```

## Best Practices

1. **Always Log Form Submissions**: Track from start to completion
2. **Include Context**: Provide relevant context for debugging
3. **Use Consistent Component Names**: Makes filtering easier
4. **Log Network Requests**: Include timing and response details
5. **Monitor in Development**: Use debug utilities during development
6. **Export Logs for Analysis**: Use exported logs for detailed analysis
7. **Clean Up Regularly**: Clear logs periodically in long-running sessions

## TypeScript Types

All functions are fully typed. Key interfaces:

```typescript
interface ErrorReport {
  errorId: string;
  timestamp: number;
  component: string;
  operation: string;
  error: Error | string;
  context: Record<string, any>;
  // ... more fields
}

interface FormSubmissionLog {
  submissionId: string;
  timestamp: number;
  formData: Record<string, any>;
  status: 'started' | 'validating' | 'submitting' | 'success' | 'error' | 'timeout';
  // ... more fields
}

// See errorReporting.ts for complete type definitions
```

## Contributing

When adding new logging capabilities:

1. Add appropriate TypeScript interfaces
2. Include data sanitization for sensitive fields
3. Add comprehensive tests
4. Update this documentation
5. Consider memory impact of new log types