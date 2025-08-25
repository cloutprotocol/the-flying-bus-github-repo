# Authentication Error Handling and Recovery Procedures

## Overview

This document provides comprehensive procedures for handling and recovering from authentication errors in the platform. It covers error categorization, handling strategies, recovery mechanisms, and operational procedures for maintaining system reliability.

## Error Categories

### 1. Validation Errors

**Description**: Client-side validation failures and input format issues.

**Common Errors**:
- Invalid email format
- Weak password requirements
- Missing required fields
- Terms of service not accepted

**Error Codes**:
- `VALIDATION_EMAIL_INVALID`
- `VALIDATION_PASSWORD_WEAK`
- `VALIDATION_REQUIRED_FIELD`
- `VALIDATION_TERMS_NOT_ACCEPTED`

**Handling Strategy**:
```typescript
interface ValidationError {
  code: string;
  field: string;
  message: string;
  value?: any;
}

const handleValidationError = (error: ValidationError): UserFriendlyError => {
  const fieldMessages = {
    email: 'Please enter a valid email address',
    password: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
    firstName: 'First name is required',
    lastName: 'Last name is required',
    acceptedTerms: 'You must accept the terms of service to continue'
  };

  return {
    type: 'validation',
    message: fieldMessages[error.field] || error.message,
    field: error.field,
    recoverable: true,
    action: 'correct_input'
  };
};
```

### 2. RLS Policy Errors

**Description**: Row-Level Security policy violations during profile creation.

**Common Errors**:
- Profile creation blocked by RLS policies
- Insufficient permissions for author registration
- Service role authentication failures

**Error Codes**:
- `PGRST301` - RLS policy violation
- `PGRST116` - Insufficient permissions
- `RLS_SERVICE_ROLE_FAILED`

**Handling Strategy**:
```typescript
const handleRLSError = async (error: RLSError): Promise<RetryableError | FatalError> => {
  if (error.code === 'PGRST301') {
    // RLS policy violation - retry with service role
    return {
      type: 'rls_policy_violation',
      message: 'Profile creation requires elevated permissions',
      recoverable: true,
      retryStrategy: 'service_role',
      action: async () => {
        return await rlsPolicyManager.createProfileWithServiceRole(error.context.profileData);
      }
    };
  }

  if (error.code === 'PGRST116') {
    // Insufficient permissions - check authentication
    return {
      type: 'insufficient_permissions',
      message: 'Authentication required for this operation',
      recoverable: true,
      retryStrategy: 'reauthenticate',
      action: async () => {
        await authService.refreshSession();
        return await retryOriginalOperation(error.context);
      }
    };
  }

  // Unrecoverable RLS error
  return {
    type: 'rls_fatal',
    message: 'Unable to create profile due to security constraints',
    recoverable: false,
    requiresSupport: true
  };
};
```

### 3. Network Errors

**Description**: API communication failures and connectivity issues.

**Common Errors**:
- Network timeouts
- Connection failures
- API rate limiting
- Service unavailability

**Error Codes**:
- `NETWORK_TIMEOUT`
- `NETWORK_CONNECTION_FAILED`
- `API_RATE_LIMITED`
- `SERVICE_UNAVAILABLE`

**Handling Strategy**:
```typescript
const handleNetworkError = (error: NetworkError): RetryableError => {
  const retryStrategies = {
    NETWORK_TIMEOUT: {
      maxRetries: 3,
      backoffMs: 1000,
      multiplier: 2
    },
    NETWORK_CONNECTION_FAILED: {
      maxRetries: 5,
      backoffMs: 2000,
      multiplier: 1.5
    },
    API_RATE_LIMITED: {
      maxRetries: 3,
      backoffMs: 5000,
      multiplier: 1
    }
  };

  const strategy = retryStrategies[error.code] || retryStrategies.NETWORK_TIMEOUT;

  return {
    type: 'network',
    message: 'Connection issue detected. Retrying...',
    recoverable: true,
    retryStrategy: 'exponential_backoff',
    maxRetries: strategy.maxRetries,
    backoffMs: strategy.backoffMs,
    multiplier: strategy.multiplier,
    action: async (attempt: number) => {
      const delay = strategy.backoffMs * Math.pow(strategy.multiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return await retryOriginalOperation(error.context);
    }
  };
};
```

### 4. Session Errors

**Description**: Authentication state management and session-related issues.

**Common Errors**:
- Session establishment failures
- Token expiration
- Authentication state inconsistency
- Session persistence issues

**Error Codes**:
- `SESSION_ESTABLISHMENT_FAILED`
- `TOKEN_EXPIRED`
- `AUTH_STATE_INCONSISTENT`
- `SESSION_PERSISTENCE_FAILED`

**Handling Strategy**:
```typescript
const handleSessionError = async (error: SessionError): Promise<void> => {
  switch (error.code) {
    case 'SESSION_ESTABLISHMENT_FAILED':
      // Retry session establishment
      await authService.establishSession(error.context.user);
      break;

    case 'TOKEN_EXPIRED':
      // Refresh authentication tokens
      await authService.refreshSession();
      break;

    case 'AUTH_STATE_INCONSISTENT':
      // Synchronize authentication state
      await authService.syncAuthState();
      break;

    case 'SESSION_PERSISTENCE_FAILED':
      // Clear and re-establish session
      await authService.clearSession();
      await authService.establishSession(error.context.user);
      break;

    default:
      throw new Error(`Unhandled session error: ${error.code}`);
  }
};
```

### 5. Invitation Errors

**Description**: Invitation token validation and processing issues.

**Common Errors**:
- Invalid invitation tokens
- Expired invitations
- Already used tokens
- Token format issues

**Error Codes**:
- `INVITATION_TOKEN_INVALID`
- `INVITATION_TOKEN_EXPIRED`
- `INVITATION_TOKEN_USED`
- `INVITATION_TOKEN_MALFORMED`

**Handling Strategy**:
```typescript
const handleInvitationError = (error: InvitationError): UserFriendlyError => {
  const errorMessages = {
    INVITATION_TOKEN_INVALID: {
      message: 'This invitation link is not valid. Please check the link or request a new invitation.',
      action: 'request_new_invitation'
    },
    INVITATION_TOKEN_EXPIRED: {
      message: 'This invitation has expired. Please request a new invitation to continue.',
      action: 'request_new_invitation'
    },
    INVITATION_TOKEN_USED: {
      message: 'This invitation has already been used. If you already have an account, please sign in.',
      action: 'redirect_to_login'
    },
    INVITATION_TOKEN_MALFORMED: {
      message: 'The invitation link appears to be corrupted. Please check the link or request a new invitation.',
      action: 'request_new_invitation'
    }
  };

  const errorInfo = errorMessages[error.code] || {
    message: 'There was an issue with your invitation. Please contact support.',
    action: 'contact_support'
  };

  return {
    type: 'invitation',
    message: errorInfo.message,
    recoverable: error.code !== 'INVITATION_TOKEN_USED',
    action: errorInfo.action
  };
};
```

## Recovery Mechanisms

### Automatic Recovery

#### Retry Logic Implementation

```typescript
class RetryManager {
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === options.maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        const delay = this.calculateBackoff(attempt, options);
        await this.delay(delay);
        
        console.log(`Retry attempt ${attempt}/${options.maxRetries} after ${delay}ms`);
      }
    }
    
    throw lastError;
  }

  private static isRetryableError(error: any): boolean {
    const retryableCodes = [
      'NETWORK_TIMEOUT',
      'NETWORK_CONNECTION_FAILED',
      'API_RATE_LIMITED',
      'PGRST301', // RLS policy violation
      'SESSION_ESTABLISHMENT_FAILED'
    ];
    
    return retryableCodes.includes(error.code);
  }

  private static calculateBackoff(attempt: number, options: RetryOptions): number {
    return options.backoffMs * Math.pow(options.multiplier || 2, attempt - 1);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### Manual Recovery Procedures

#### Registration Flow Recovery

```typescript
const recoverRegistrationFlow = async (
  userData: SignUpData | InvitationRegistrationData,
  errorContext: ErrorContext
): Promise<AuthResult> => {
  console.log('Starting registration flow recovery', { errorContext });

  // Step 1: Validate current state
  const currentState = await validateCurrentAuthState();
  
  if (currentState.hasPartialRegistration) {
    // Clean up partial registration
    await cleanupPartialRegistration(currentState.userId);
  }

  // Step 2: Retry with appropriate strategy
  try {
    if ('token' in userData) {
      // Invitation registration recovery
      return await recoverInvitationRegistration(userData as InvitationRegistrationData);
    } else {
      // Standard registration recovery
      return await recoverStandardRegistration(userData as SignUpData);
    }
  } catch (error) {
    // Step 3: Escalate to manual intervention
    await logRecoveryFailure(error, errorContext);
    throw new Error('Registration recovery failed. Manual intervention required.');
  }
};

const recoverInvitationRegistration = async (
  invitationData: InvitationRegistrationData
): Promise<AuthResult> => {
  // Validate invitation token
  const tokenValidation = await invitationService.validateToken(invitationData.token);
  
  if (!tokenValidation.valid) {
    if (tokenValidation.reason === 'expired') {
      // Request token refresh
      const newToken = await invitationService.refreshToken(invitationData.token);
      invitationData.token = newToken;
    } else {
      throw new Error(`Invalid invitation token: ${tokenValidation.reason}`);
    }
  }

  // Use RLS policy manager for profile creation
  return await registrationFlowCoordinator.processInvitationRegistration(invitationData);
};
```

#### Session Recovery

```typescript
const recoverSession = async (userId: string): Promise<void> => {
  console.log('Starting session recovery for user:', userId);

  try {
    // Step 1: Clear existing session state
    await authService.clearSession();

    // Step 2: Retrieve user data
    const userData = await userService.getUserById(userId);
    if (!userData) {
      throw new Error('User data not found');
    }

    // Step 3: Re-establish session
    await authService.establishSession(userData);

    // Step 4: Verify session establishment
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw new Error('Session establishment failed');
    }

    // Step 5: Update authentication context
    await authService.syncAuthState();

    console.log('Session recovery completed successfully');
  } catch (error) {
    console.error('Session recovery failed:', error);
    throw error;
  }
};
```

### Database Recovery Procedures

#### Profile Creation Recovery

```sql
-- Check for orphaned user accounts without profiles
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL
AND u.created_at > NOW() - INTERVAL '24 hours';

-- Create missing profiles for orphaned accounts
INSERT INTO public.profiles (user_id, email, first_name, last_name, role, created_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'firstName', 'Unknown'),
  COALESCE(u.raw_user_meta_data->>'lastName', 'User'),
  'user',
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL
AND u.created_at > NOW() - INTERVAL '24 hours';
```

#### Invitation Token Recovery

```sql
-- Check for stuck invitation tokens
SELECT token, email, created_at, expires_at, used_at
FROM invitation_tokens
WHERE expires_at > NOW()
AND used_at IS NULL
AND created_at < NOW() - INTERVAL '1 hour';

-- Extend expiration for valid unused tokens
UPDATE invitation_tokens
SET expires_at = NOW() + INTERVAL '7 days'
WHERE expires_at > NOW()
AND used_at IS NULL
AND created_at < NOW() - INTERVAL '1 hour';
```

## Monitoring and Alerting

### Error Monitoring Setup

```typescript
class ErrorMonitor {
  private static errorCounts = new Map<string, number>();
  private static alertThresholds = {
    validation: 100,
    rls_policy: 10,
    network: 50,
    session: 25,
    invitation: 20
  };

  static trackError(error: AuthError): void {
    const errorType = this.categorizeError(error);
    const count = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, count + 1);

    // Check if alert threshold reached
    if (count + 1 >= this.alertThresholds[errorType]) {
      this.sendAlert(errorType, count + 1);
    }

    // Log error details
    this.logError(error, errorType);
  }

  private static sendAlert(errorType: string, count: number): void {
    const alert = {
      type: 'auth_error_threshold_exceeded',
      errorType,
      count,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(errorType, count)
    };

    alertingService.send(alert);
  }

  private static getSeverity(errorType: string, count: number): 'low' | 'medium' | 'high' | 'critical' {
    const threshold = this.alertThresholds[errorType];
    
    if (count >= threshold * 3) return 'critical';
    if (count >= threshold * 2) return 'high';
    if (count >= threshold * 1.5) return 'medium';
    return 'low';
  }
}
```

### Health Check Implementation

```typescript
const performAuthHealthCheck = async (): Promise<HealthCheckResult> => {
  const checks = {
    supabaseConnection: false,
    rlsPolicies: false,
    sessionManagement: false,
    invitationSystem: false,
    errorHandling: false
  };

  const results = {
    overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
    details: {} as Record<string, any>
  };

  try {
    // Test Supabase connection
    const connectionTest = await supabase.from('profiles').select('count').limit(1);
    checks.supabaseConnection = !connectionTest.error;
    results.details.supabaseConnection = connectionTest.error?.message;

    // Test RLS policies
    try {
      await rlsPolicyManager.validateRegistrationPermissions({
        userId: 'health-check',
        role: 'authenticated'
      });
      checks.rlsPolicies = true;
    } catch (error) {
      results.details.rlsPolicies = error.message;
    }

    // Test session management
    try {
      const session = await supabase.auth.getSession();
      checks.sessionManagement = true;
      results.details.sessionManagement = 'OK';
    } catch (error) {
      results.details.sessionManagement = error.message;
    }

    // Test invitation system
    try {
      const tokenTest = await supabase.from('invitation_tokens').select('count').limit(1);
      checks.invitationSystem = !tokenTest.error;
      results.details.invitationSystem = tokenTest.error?.message;
    } catch (error) {
      results.details.invitationSystem = error.message;
    }

    // Test error handling
    try {
      const testError = new Error('Health check test error');
      const handled = await registrationErrorHandler.handleError(testError);
      checks.errorHandling = !!handled;
    } catch (error) {
      results.details.errorHandling = error.message;
    }

    // Determine overall health
    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    if (healthyChecks === totalChecks) {
      results.overall = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      results.overall = 'degraded';
    } else {
      results.overall = 'unhealthy';
    }

  } catch (error) {
    results.overall = 'unhealthy';
    results.details.criticalError = error.message;
  }

  return results;
};
```

## Operational Procedures

### Incident Response

#### Severity Levels

1. **Critical (P0)**: Complete authentication system failure
   - Response time: Immediate (< 15 minutes)
   - Actions: Page on-call engineer, activate incident response

2. **High (P1)**: Major functionality impaired
   - Response time: < 1 hour
   - Actions: Notify engineering team, begin investigation

3. **Medium (P2)**: Degraded performance or minor issues
   - Response time: < 4 hours
   - Actions: Create ticket, schedule investigation

4. **Low (P3)**: Minor issues with workarounds available
   - Response time: < 24 hours
   - Actions: Create ticket for next sprint

#### Incident Response Checklist

```markdown
## Authentication System Incident Response

### Immediate Actions (0-15 minutes)
- [ ] Acknowledge incident
- [ ] Assess severity level
- [ ] Check system health dashboard
- [ ] Verify if issue is widespread or isolated
- [ ] Notify stakeholders if P0/P1

### Investigation (15-60 minutes)
- [ ] Review error logs and monitoring dashboards
- [ ] Check Supabase status page
- [ ] Test authentication flows manually
- [ ] Identify root cause
- [ ] Implement temporary workaround if possible

### Resolution (1-4 hours)
- [ ] Implement permanent fix
- [ ] Test fix in staging environment
- [ ] Deploy fix to production
- [ ] Verify resolution
- [ ] Update stakeholders

### Post-Incident (24-48 hours)
- [ ] Conduct post-mortem meeting
- [ ] Document lessons learned
- [ ] Update runbooks and procedures
- [ ] Implement preventive measures
```

### Maintenance Procedures

#### Regular Maintenance Tasks

```typescript
// Weekly maintenance script
const performWeeklyMaintenance = async () => {
  console.log('Starting weekly authentication system maintenance');

  // Clean up expired invitation tokens
  await cleanupExpiredTokens();

  // Remove orphaned registration contexts
  await cleanupOrphanedRegistrationContexts();

  // Update error handling statistics
  await updateErrorStatistics();

  // Verify RLS policy integrity
  await verifyRLSPolicies();

  // Generate health report
  const healthReport = await generateHealthReport();
  
  console.log('Weekly maintenance completed', healthReport);
};

const cleanupExpiredTokens = async () => {
  const result = await supabase
    .from('invitation_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());
    
  console.log(`Cleaned up ${result.count} expired tokens`);
};
```

### Backup and Recovery

#### Configuration Backup

```bash
#!/bin/bash
# Backup authentication configuration

# Backup RLS policies
pg_dump --schema-only --table=profiles --table=user_roles \
  $DATABASE_URL > auth_policies_backup_$(date +%Y%m%d).sql

# Backup Supabase configuration
cp supabase/config.toml backups/config_$(date +%Y%m%d).toml

# Backup environment variables (sanitized)
env | grep -E '^(SUPABASE_|AUTH_)' | sed 's/=.*/=***/' \
  > backups/env_config_$(date +%Y%m%d).txt
```

#### Recovery Procedures

```bash
#!/bin/bash
# Restore authentication configuration

# Restore RLS policies
psql $DATABASE_URL < auth_policies_backup_YYYYMMDD.sql

# Restore Supabase configuration
cp backups/config_YYYYMMDD.toml supabase/config.toml

# Restart services
supabase stop
supabase start
```

This comprehensive error handling and recovery documentation ensures that authentication issues can be quickly identified, properly handled, and effectively resolved while maintaining system reliability and user experience.