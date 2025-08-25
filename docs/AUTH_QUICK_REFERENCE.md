# Authentication System Quick Reference

## Overview

Quick reference guide for developers working with the enhanced authentication system.

## Key Services

### AuthService (`src/services/auth/authService.ts`)
```typescript
// Standard sign-up with auto-login
const result = await authService.signUpWithAutoLogin({
  email: 'user@example.com',
  password: 'password',
  firstName: 'John',
  lastName: 'Doe',
  acceptedTerms: true
});

// Invitation-based registration
const result = await authService.registerWithInvitation({
  token: 'invitation-token',
  email: 'author@example.com',
  password: 'password',
  firstName: 'Jane',
  lastName: 'Author',
  acceptedTerms: true
});
```

### RLS Policy Manager (`src/services/rlsPolicyManager.ts`)
```typescript
// Create profile with service role permissions
const profile = await rlsPolicyManager.createProfileWithServiceRole({
  userId: user.id,
  email: userData.email,
  firstName: userData.firstName,
  lastName: userData.lastName,
  role: 'user' // or 'author'
});

// Bypass RLS for registration operations
const result = await rlsPolicyManager.bypassRLSForRegistration(async () => {
  return await supabase.from('profiles').insert(profileData);
});
```

### Registration Flow Coordinator (`src/services/registrationFlowCoordinator.ts`)
```typescript
// Process complete registration flow
const result = await registrationFlowCoordinator.processStandardRegistration(userData);
const result = await registrationFlowCoordinator.processInvitationRegistration(invitationData);
```

## Common Patterns

### Error Handling
```typescript
try {
  const result = await authService.signUpWithAutoLogin(userData);
  if (result.success) {
    // User is logged in and redirected
    router.push(result.redirectUrl || '/');
  }
} catch (error) {
  const userError = registrationErrorHandler.handleError(error);
  setError(userError.message);
}
```

### Authentication State Management
```typescript
const { user, session, isAuthenticated, refreshAuth } = useAuth();

// Force refresh authentication state
await refreshAuth();

// Check if user is authenticated
if (isAuthenticated) {
  // User is logged in
}
```

### RLS Policy Compliance
```typescript
// Always use RLS policy manager for profile creation during registration
const createUserProfile = async (userData: SignUpData, user: User) => {
  try {
    // Try standard creation first
    return await supabase.from('profiles').insert(profileData);
  } catch (error) {
    if (error.code === 'PGRST301') {
      // RLS violation - use service role
      return await rlsPolicyManager.createProfileWithServiceRole(profileData);
    }
    throw error;
  }
};
```

## Testing

### Unit Tests
```typescript
// Test authentication service
describe('AuthService', () => {
  it('should auto-login after sign-up', async () => {
    const result = await authService.signUpWithAutoLogin(testData);
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.session).toBeDefined();
  });
});

// Test RLS policy manager
describe('RLSPolicyManager', () => {
  it('should create profile with service role', async () => {
    const profile = await rlsPolicyManager.createProfileWithServiceRole(profileData);
    expect(profile).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// Test complete registration flow
describe('Registration Flow', () => {
  it('should complete standard registration with auto-login', async () => {
    const result = await registrationFlowCoordinator.processStandardRegistration(userData);
    expect(result.success).toBe(true);
    
    // Verify user is authenticated
    const { isAuthenticated } = useAuth();
    expect(isAuthenticated).toBe(true);
  });
});
```

## Debugging

### Enable Debug Logging
```typescript
// Add to environment variables
process.env.AUTH_DEBUG = 'true';
process.env.RLS_DEBUG = 'true';
```

### Check Authentication State
```typescript
// Debug authentication state
const debugAuth = () => {
  const authContext = useAuth();
  const supabaseSession = await supabase.auth.getSession();
  
  console.log('Auth Context:', authContext);
  console.log('Supabase Session:', supabaseSession);
};
```

### Monitor Registration Metrics
```typescript
// Track registration attempts
const trackRegistration = (type: 'standard' | 'invitation', success: boolean) => {
  monitoringService.track('registration_attempt', {
    type,
    success,
    timestamp: new Date().toISOString()
  });
};
```

## Common Issues

### RLS Policy Violations
```typescript
// Error: PGRST301 - Row level security policy violation
// Solution: Use RLS policy manager
const profile = await rlsPolicyManager.createProfileWithServiceRole(profileData);
```

### Session Not Established
```typescript
// Error: User not logged in after registration
// Solution: Force session establishment
await authService.establishSession(user);
await authService.syncAuthState();
```

### Invitation Token Issues
```typescript
// Error: Invalid invitation token
// Solution: Validate and refresh token
const isValid = await invitationService.validateToken(token);
if (!isValid) {
  const newToken = await invitationService.refreshToken(token);
}
```

## Environment Variables

```bash
# Required for authentication system
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional debugging
AUTH_DEBUG=false
RLS_DEBUG=false
```

## Database Policies

### Profiles Table
```sql
-- Allow profile creation during registration
CREATE POLICY "Allow profile creation during registration" ON profiles
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR 
    auth.uid() = user_id
  );
```

### User Roles Table
```sql
-- Allow role assignment during registration
CREATE POLICY "Allow role assignment during registration" ON user_roles
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.uid() = user_id AND role IN ('user', 'author'))
  );
```

## Monitoring

### Health Check
```typescript
const healthCheck = await performAuthHealthCheck();
console.log('Auth system health:', healthCheck.overall);
```

### Error Tracking
```typescript
// Automatic error tracking
ErrorMonitor.trackError(error);

// Manual error logging
await registrationErrorHandler.logError(error, context);
```

## Support

- **Documentation**: See `docs/` folder for comprehensive guides
- **Troubleshooting**: [AUTH_TROUBLESHOOTING_GUIDE.md](./AUTH_TROUBLESHOOTING_GUIDE.md)
- **Error Handling**: [AUTH_ERROR_HANDLING_RECOVERY.md](./AUTH_ERROR_HANDLING_RECOVERY.md)
- **RLS Policies**: [RLS_POLICY_MANAGEMENT.md](./RLS_POLICY_MANAGEMENT.md)