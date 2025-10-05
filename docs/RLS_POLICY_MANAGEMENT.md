# RLS Policy Management Developer Guide

## Overview

This guide provides comprehensive documentation for managing Row-Level Security (RLS) policies in the context of user registration and profile creation. The RLS Policy Manager service handles the complex requirements of maintaining security while enabling seamless user onboarding.

## Architecture

### RLS Policy Manager Service

**Location**: `src/services/rlsPolicyManager.ts`

The RLS Policy Manager is responsible for:
- Managing profile creation permissions during registration
- Handling service role operations when necessary
- Bypassing RLS policies safely for user creation
- Maintaining security constraints while enabling registration

### Core Concepts

#### Service Role Operations
Service role operations allow bypassing RLS policies when necessary for system operations like user registration:

```typescript
// Service role context for profile creation
const profile = await rlsPolicyManager.createProfileWithServiceRole({
  userId: user.id,
  email: user.email,
  firstName: userData.firstName,
  lastName: userData.lastName,
  role: 'user' // or 'author' for invitation registration
});
```

#### RLS Bypass Mechanisms
Temporary RLS bypasses are used during registration to ensure profile creation succeeds:

```typescript
// Safely bypass RLS for registration operation
const result = await rlsPolicyManager.bypassRLSForRegistration(async () => {
  return await supabase
    .from('profiles')
    .insert(profileData)
    .select()
    .single();
});
```

## API Reference

### RLSPolicyManager Interface

```typescript
interface RLSPolicyManager {
  /**
   * Creates a user profile using service role permissions
   * @param profileData - Profile data to create
   * @returns Promise<Profile> - Created profile
   */
  createProfileWithServiceRole(profileData: ProfileData): Promise<Profile>;

  /**
   * Validates if current context has registration permissions
   * @param context - Authentication context
   * @returns Promise<boolean> - Whether permissions are sufficient
   */
  validateRegistrationPermissions(context: AuthContext): Promise<boolean>;

  /**
   * Safely bypasses RLS for registration operations
   * @param operation - Function to execute with RLS bypass
   * @returns Promise<T> - Result of the operation
   */
  bypassRLSForRegistration<T>(operation: () => Promise<T>): Promise<T>;

  /**
   * Creates audit log entry for RLS operations
   * @param operation - Type of operation performed
   * @param context - Context information
   */
  logRLSOperation(operation: string, context: RLSOperationContext): Promise<void>;
}
```

### ProfileData Interface

```typescript
interface ProfileData {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'author' | 'admin';
  metadata?: Record<string, any>;
}
```

### RLSOperationContext Interface

```typescript
interface RLSOperationContext {
  userId: string;
  operation: 'profile_creation' | 'permission_assignment' | 'role_update';
  registrationType: 'standard' | 'invitation';
  bypassReason: string;
  timestamp: Date;
}
```

## Usage Patterns

### Standard User Registration

```typescript
import { rlsPolicyManager } from '@/services/rlsPolicyManager';

async function createStandardUserProfile(user: User, userData: SignUpData) {
  try {
    // Validate permissions first
    const hasPermissions = await rlsPolicyManager.validateRegistrationPermissions({
      userId: user.id,
      role: 'authenticated'
    });

    if (!hasPermissions) {
      // Use service role for profile creation
      const profile = await rlsPolicyManager.createProfileWithServiceRole({
        userId: user.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'user'
      });

      return profile;
    }

    // Standard profile creation if permissions sufficient
    return await createProfileStandard(userData);
  } catch (error) {
    console.error('Profile creation failed:', error);
    throw new Error('Failed to create user profile');
  }
}
```

### Invitation-Based Author Registration

```typescript
async function createAuthorProfile(user: User, invitationData: InvitationRegistrationData) {
  try {
    // Author registration always requires service role
    const profile = await rlsPolicyManager.createProfileWithServiceRole({
      userId: user.id,
      email: invitationData.email,
      firstName: invitationData.firstName,
      lastName: invitationData.lastName,
      role: 'author'
    });

    // Assign author permissions
    await assignAuthorPermissions(user.id);

    return profile;
  } catch (error) {
    console.error('Author profile creation failed:', error);
    throw new Error('Failed to create author profile');
  }
}
```

### Error Handling

```typescript
async function handleRLSError(error: any, context: RLSOperationContext) {
  if (error.code === 'PGRST301') {
    // RLS policy violation - retry with service role
    console.warn('RLS policy violation, retrying with service role');
    
    return await rlsPolicyManager.bypassRLSForRegistration(async () => {
      return await retryOperation(context);
    });
  }

  if (error.code === 'PGRST116') {
    // Insufficient permissions
    throw new Error('Insufficient permissions for profile creation');
  }

  // Log unexpected errors
  await rlsPolicyManager.logRLSOperation('error', {
    ...context,
    error: error.message
  });

  throw error;
}
```

## Database Policies

### Current RLS Policies

The following RLS policies are configured to support registration flows:

#### Profiles Table Policies

```sql
-- Allow profile creation during registration with service role
CREATE POLICY "Allow profile creation during registration" ON profiles
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR 
    auth.uid() = user_id
  );

-- Allow profile updates for owners
CREATE POLICY "Allow profile updates for owners" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow profile reads for authenticated users
CREATE POLICY "Allow profile reads for authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
```

#### User Roles Table Policies

```sql
-- Allow role assignment during registration
CREATE POLICY "Allow role assignment during registration" ON user_roles
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.uid() = user_id AND role IN ('user', 'author'))
  );

-- Allow role reads for owners
CREATE POLICY "Allow role reads for owners" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);
```

### Policy Modification Guidelines

When modifying RLS policies:

1. **Test Thoroughly**: Always test policy changes in development environment
2. **Maintain Security**: Ensure policies don't create security vulnerabilities
3. **Document Changes**: Update this documentation when policies change
4. **Audit Trail**: Log all policy modifications
5. **Rollback Plan**: Have a rollback strategy for policy changes

## Security Considerations

### Service Role Usage

Service role operations should be used sparingly and only when necessary:

#### When to Use Service Role
- ✅ User profile creation during registration
- ✅ Author permission assignment during invitation registration
- ✅ System-initiated operations that require elevated permissions

#### When NOT to Use Service Role
- ❌ Regular user operations
- ❌ Profile updates after registration
- ❌ Content creation or modification
- ❌ Any operation that can be performed with user permissions

### Audit and Monitoring

All RLS operations are logged for security monitoring:

```typescript
// Automatic logging of RLS operations
await rlsPolicyManager.logRLSOperation('profile_creation', {
  userId: user.id,
  operation: 'profile_creation',
  registrationType: 'standard',
  bypassReason: 'RLS policy violation during registration',
  timestamp: new Date()
});
```

### Best Practices

1. **Principle of Least Privilege**: Use minimum permissions necessary
2. **Temporary Escalation**: Service role permissions only during registration
3. **Input Validation**: Validate all data before RLS operations
4. **Error Handling**: Graceful degradation when RLS operations fail
5. **Monitoring**: Track all RLS bypasses and service role usage

## Testing

### Unit Tests

Test RLS policy manager functionality:

```typescript
describe('RLSPolicyManager', () => {
  it('should create profile with service role when RLS blocks standard creation', async () => {
    const profileData = {
      userId: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user' as const
    };

    const profile = await rlsPolicyManager.createProfileWithServiceRole(profileData);
    
    expect(profile).toBeDefined();
    expect(profile.userId).toBe(profileData.userId);
  });
});
```

### Integration Tests

Test RLS policies with actual database operations:

```typescript
describe('RLS Policy Integration', () => {
  it('should allow profile creation during registration', async () => {
    // Test with authenticated user context
    const result = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

#### RLS Policy Violations
**Error**: `PGRST301 - Row level security policy violation`

**Solution**: 
1. Check if user has proper authentication context
2. Verify RLS policies allow the operation
3. Use service role if necessary for registration operations

#### Insufficient Permissions
**Error**: `PGRST116 - Insufficient permissions`

**Solution**:
1. Verify user authentication status
2. Check user role assignments
3. Ensure proper RLS policy configuration

#### Service Role Failures
**Error**: Service role operations failing

**Solution**:
1. Verify service role key configuration
2. Check Supabase project settings
3. Ensure service role has necessary permissions

### Debugging

Enable debug logging for RLS operations:

```typescript
// Enable debug mode
process.env.RLS_DEBUG = 'true';

// RLS operations will log detailed information
const profile = await rlsPolicyManager.createProfileWithServiceRole(profileData);
```

### Performance Monitoring

Monitor RLS operation performance:

```typescript
// Track RLS operation timing
const startTime = Date.now();
const result = await rlsPolicyManager.bypassRLSForRegistration(operation);
const duration = Date.now() - startTime;

console.log(`RLS operation completed in ${duration}ms`);
```

## Migration and Deployment

### Database Migrations

When deploying RLS policy changes:

1. **Test in Development**: Verify policies work in development environment
2. **Backup Policies**: Export current policies before changes
3. **Apply Incrementally**: Apply policy changes in stages
4. **Verify Functionality**: Test all registration flows after deployment
5. **Monitor Errors**: Watch for RLS-related errors after deployment

### Environment Configuration

Ensure proper environment configuration:

```bash
# Required environment variables
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_URL=your_supabase_url
RLS_DEBUG=false # Set to true for debugging
```

## Support

For issues with RLS policy management:

1. Check the [Authentication Troubleshooting Guide](./AUTH_TROUBLESHOOTING_GUIDE.md)
2. Review Supabase logs for RLS-related errors
3. Verify database policy configuration
4. Test with service role permissions if needed

For questions or support, consult the development team or create an issue in the project repository.