# Authentication Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for authentication and registration issues in the platform. It covers both standard sign-up and invitation-based author registration flows.

## Common Issues and Solutions

### Standard Sign-Up Issues

#### Issue: User Not Automatically Logged In After Registration

**Symptoms:**
- Registration appears successful
- User remains on sign-up form or sees success message
- User not redirected to platform
- Authentication state shows user as not logged in

**Diagnosis:**
```typescript
// Check authentication state after registration
const { user, session, isAuthenticated } = useAuth();
console.log('Auth state:', { user, session, isAuthenticated });

// Check for session establishment errors
console.log('Session errors:', authService.getLastError());
```

**Solutions:**

1. **Check Session Establishment**
   ```typescript
   // Verify session is properly established
   const session = await supabase.auth.getSession();
   if (!session.data.session) {
     // Session not established - check auth service
     await authService.establishSession(user);
   }
   ```

2. **Verify Authentication Context Updates**
   ```typescript
   // Force authentication context refresh
   const { refreshAuth } = useAuth();
   await refreshAuth();
   ```

3. **Check for Network Issues**
   ```typescript
   // Retry registration with network error handling
   try {
     const result = await authService.signUpWithAutoLogin(userData);
   } catch (error) {
     if (error.name === 'NetworkError') {
       // Implement retry logic
       await retryRegistration(userData);
     }
   }
   ```

#### Issue: Email Validation Errors

**Symptoms:**
- Registration fails with email-related errors
- "Invalid email format" messages
- Email confirmation requirements appearing

**Solutions:**

1. **Verify Email Format Validation**
   ```typescript
   // Check email validation logic
   const isValidEmail = (email: string) => {
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     return emailRegex.test(email);
   };
   ```

2. **Confirm Email Confirmation is Disabled**
   ```typescript
   // Verify Supabase auth settings
   const { data, error } = await supabase.auth.signUp({
     email: userData.email,
     password: userData.password,
     options: {
       emailRedirectTo: undefined, // Should be undefined
       data: userData
     }
   });
   ```

### Invitation Registration Issues

#### Issue: RLS Policy Violations During Profile Creation

**Symptoms:**
- Registration fails with "Row level security policy violation" error
- Error code: PGRST301
- Profile creation fails for invited authors

**Diagnosis:**
```typescript
// Check RLS policy compliance
try {
  const profile = await supabase
    .from('profiles')
    .insert(profileData)
    .select()
    .single();
} catch (error) {
  if (error.code === 'PGRST301') {
    console.log('RLS policy violation detected');
    // Use RLS policy manager
  }
}
```

**Solutions:**

1. **Use RLS Policy Manager**
   ```typescript
   // Proper RLS-compliant profile creation
   const profile = await rlsPolicyManager.createProfileWithServiceRole({
     userId: user.id,
     email: invitationData.email,
     firstName: invitationData.firstName,
     lastName: invitationData.lastName,
     role: 'author'
   });
   ```

2. **Verify Service Role Configuration**
   ```bash
   # Check service role key is properly configured
   echo $SUPABASE_SERVICE_ROLE_KEY
   
   # Verify in Supabase dashboard:
   # Settings > API > service_role key
   ```

3. **Check Database Policies**
   ```sql
   -- Verify RLS policies allow registration
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   
   -- Should include policy allowing service_role inserts
   ```

#### Issue: Invitation Token Validation Failures

**Symptoms:**
- "Invalid invitation token" errors
- Token appears expired when it shouldn't be
- Registration fails at token validation step

**Diagnosis:**
```typescript
// Check token validation
const tokenValidation = await invitationService.validateToken(token);
console.log('Token validation result:', tokenValidation);

// Check token expiration
const tokenData = await supabase
  .from('invitation_tokens')
  .select('*')
  .eq('token', token)
  .single();
console.log('Token data:', tokenData);
```

**Solutions:**

1. **Verify Token Format and Expiration**
   ```typescript
   // Check token is properly formatted and not expired
   const isValidToken = await invitationService.validateToken(token);
   if (!isValidToken) {
     // Generate new invitation or extend expiration
     await invitationService.refreshToken(token);
   }
   ```

2. **Check Token Database State**
   ```sql
   -- Verify token exists and is not used
   SELECT token, used_at, expires_at, created_at 
   FROM invitation_tokens 
   WHERE token = 'your-token-here';
   ```

3. **Handle Token Race Conditions**
   ```typescript
   // Prevent double-use of tokens
   const result = await supabase.rpc('use_invitation_token', {
     token_value: token,
     user_id: user.id
   });
   ```

### Session Management Issues

#### Issue: Authentication State Inconsistency

**Symptoms:**
- User appears logged in in some components but not others
- Authentication state doesn't persist across page refreshes
- Inconsistent user data across the application

**Diagnosis:**
```typescript
// Check authentication state across contexts
const authContext = useAuth();
const supabaseSession = await supabase.auth.getSession();

console.log('Auth context:', authContext);
console.log('Supabase session:', supabaseSession);

// Check for state synchronization issues
if (authContext.isAuthenticated !== !!supabaseSession.data.session) {
  console.log('Authentication state mismatch detected');
}
```

**Solutions:**

1. **Force Authentication Sync**
   ```typescript
   // Synchronize authentication state
   const { syncAuthState } = useAuth();
   await syncAuthState();
   ```

2. **Check Session Persistence**
   ```typescript
   // Verify session storage
   const session = localStorage.getItem('supabase.auth.token');
   if (!session) {
     // Re-establish session
     await authService.restoreSession();
   }
   ```

3. **Update Authentication Providers**
   ```typescript
   // Ensure all auth providers are updated
   useEffect(() => {
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => {
         updateAuthContext(session);
       }
     );
     return () => subscription.unsubscribe();
   }, []);
   ```

### Error Handling Issues

#### Issue: Unclear Error Messages

**Symptoms:**
- Generic error messages displayed to users
- Technical error codes shown instead of user-friendly messages
- No guidance on how to resolve issues

**Solutions:**

1. **Implement User-Friendly Error Messages**
   ```typescript
   // Map technical errors to user-friendly messages
   const getErrorMessage = (error: any) => {
     switch (error.code) {
       case 'PGRST301':
         return 'There was an issue creating your account. Please try again.';
       case 'email_already_exists':
         return 'An account with this email already exists. Please sign in instead.';
       case 'weak_password':
         return 'Please choose a stronger password with at least 8 characters.';
       default:
         return 'Something went wrong. Please try again or contact support.';
     }
   };
   ```

2. **Add Error Recovery Options**
   ```typescript
   // Provide recovery actions for common errors
   const handleRegistrationError = (error: any) => {
     const errorMessage = getErrorMessage(error);
     const recoveryAction = getRecoveryAction(error);
     
     setError({ message: errorMessage, action: recoveryAction });
   };
   ```

3. **Implement Retry Mechanisms**
   ```typescript
   // Automatic retry for transient errors
   const retryRegistration = async (userData: SignUpData, maxRetries = 3) => {
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         return await authService.signUpWithAutoLogin(userData);
       } catch (error) {
         if (attempt === maxRetries || !isRetryableError(error)) {
           throw error;
         }
         await delay(1000 * attempt); // Exponential backoff
       }
     }
   };
   ```

## Diagnostic Tools

### Authentication State Debugger

```typescript
// Add to your development environment
const debugAuthState = () => {
  const authContext = useAuth();
  const [supabaseSession, setSupabaseSession] = useState(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseSession(session);
    });
  }, []);
  
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, background: 'white', padding: '10px', border: '1px solid #ccc' }}>
      <h4>Auth Debug</h4>
      <p>Context Auth: {authContext.isAuthenticated ? 'Yes' : 'No'}</p>
      <p>Supabase Session: {supabaseSession ? 'Yes' : 'No'}</p>
      <p>User ID: {authContext.user?.id || 'None'}</p>
      <button onClick={() => authContext.refreshAuth()}>Refresh Auth</button>
    </div>
  );
};
```

### Registration Flow Tester

```typescript
// Test registration flows in development
const testRegistrationFlow = async (type: 'standard' | 'invitation') => {
  const testData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    acceptedTerms: true
  };
  
  try {
    let result;
    if (type === 'standard') {
      result = await authService.signUpWithAutoLogin(testData);
    } else {
      result = await authService.registerWithInvitation({
        ...testData,
        token: 'test-invitation-token'
      });
    }
    
    console.log('Registration test result:', result);
    return result;
  } catch (error) {
    console.error('Registration test failed:', error);
    throw error;
  }
};
```

### RLS Policy Tester

```typescript
// Test RLS policies in development
const testRLSPolicies = async () => {
  const testUserId = 'test-user-id';
  const testProfileData = {
    userId: testUserId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user' as const
  };
  
  try {
    // Test standard profile creation
    const standardResult = await supabase
      .from('profiles')
      .insert(testProfileData)
      .select()
      .single();
    
    console.log('Standard profile creation:', standardResult);
  } catch (error) {
    console.log('Standard creation failed, testing service role...');
    
    // Test with service role
    const serviceRoleResult = await rlsPolicyManager.createProfileWithServiceRole(testProfileData);
    console.log('Service role profile creation:', serviceRoleResult);
  }
};
```

## Monitoring and Logging

### Enable Debug Logging

```typescript
// Add to your environment variables for debugging
process.env.AUTH_DEBUG = 'true';
process.env.RLS_DEBUG = 'true';

// This will enable detailed logging for:
// - Authentication operations
// - RLS policy operations
// - Session management
// - Error handling
```

### Monitor Registration Metrics

```typescript
// Track registration success rates
const trackRegistrationMetrics = (type: 'standard' | 'invitation', success: boolean, error?: any) => {
  const metrics = {
    type,
    success,
    timestamp: new Date().toISOString(),
    error: error?.message,
    errorCode: error?.code
  };
  
  // Send to monitoring service
  monitoringService.track('registration_attempt', metrics);
};
```

### Check System Health

```typescript
// Health check for authentication system
const checkAuthSystemHealth = async () => {
  const checks = {
    supabaseConnection: false,
    rlsPolicies: false,
    sessionManagement: false,
    invitationTokens: false
  };
  
  try {
    // Test Supabase connection
    const { data } = await supabase.from('profiles').select('count').limit(1);
    checks.supabaseConnection = !!data;
    
    // Test RLS policies
    const rlsTest = await rlsPolicyManager.validateRegistrationPermissions({
      userId: 'test',
      role: 'authenticated'
    });
    checks.rlsPolicies = true;
    
    // Test session management
    const session = await supabase.auth.getSession();
    checks.sessionManagement = true;
    
    // Test invitation tokens
    const tokenTest = await supabase.from('invitation_tokens').select('count').limit(1);
    checks.invitationTokens = !!tokenTest.data;
    
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  return checks;
};
```

## Prevention Strategies

### Code Quality

1. **Input Validation**
   ```typescript
   // Always validate user input
   const validateRegistrationData = (data: SignUpData) => {
     const errors = [];
     
     if (!isValidEmail(data.email)) {
       errors.push('Invalid email format');
     }
     
     if (data.password.length < 8) {
       errors.push('Password must be at least 8 characters');
     }
     
     return errors;
   };
   ```

2. **Error Boundaries**
   ```typescript
   // Wrap registration components in error boundaries
   <ErrorBoundary fallback={<RegistrationErrorFallback />}>
     <SignUpForm />
   </ErrorBoundary>
   ```

3. **Testing**
   ```typescript
   // Comprehensive test coverage
   describe('Registration Flows', () => {
     it('should handle standard registration', async () => {
       // Test implementation
     });
     
     it('should handle invitation registration', async () => {
       // Test implementation
     });
     
     it('should handle RLS policy violations', async () => {
       // Test implementation
     });
   });
   ```

### Monitoring

1. **Error Tracking**
   - Monitor registration failure rates
   - Track RLS policy violations
   - Alert on authentication system issues

2. **Performance Monitoring**
   - Track registration completion times
   - Monitor session establishment latency
   - Alert on performance degradation

3. **Security Monitoring**
   - Monitor failed authentication attempts
   - Track service role usage
   - Alert on suspicious activity

## Getting Help

### Internal Resources

1. **Developer Documentation**
   - [Authentication Flow Improvements](./AUTH_FLOW_IMPROVEMENTS.md)
   - [RLS Policy Management](./RLS_POLICY_MANAGEMENT.md)

2. **Code Examples**
   - Check `src/services/examples/` for usage examples
   - Review test files for implementation patterns

3. **Monitoring Dashboards**
   - Authentication metrics dashboard
   - Error tracking dashboard
   - Performance monitoring dashboard

### External Resources

1. **Supabase Documentation**
   - [Authentication Guide](https://supabase.com/docs/guides/auth)
   - [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

2. **Community Support**
   - Supabase Discord community
   - Stack Overflow (tag: supabase)

### Escalation Process

1. **Level 1**: Check this troubleshooting guide
2. **Level 2**: Review code and logs
3. **Level 3**: Consult development team
4. **Level 4**: Contact Supabase support if infrastructure issue

Remember to always include relevant error messages, logs, and steps to reproduce when seeking help.