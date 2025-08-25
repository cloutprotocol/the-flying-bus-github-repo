# Role Management System

This document describes the role management and account activation system implemented for the invitation flow.

## Overview

The role management system handles user role upgrades and account activation as part of the invitation process. It supports both existing users (who need role upgrades) and new users (who need account creation with author privileges).

## Architecture

### Core Components

1. **Role Service** (`src/services/roleService.ts`)
   - Core role management functions
   - Account creation and activation
   - Role validation and permission checking

2. **Role Management Hook** (`src/hooks/useRoleManagement.ts`)
   - React hook for role operations
   - Toast notifications and loading states
   - Integration with auth context

3. **Role Utilities** (`src/utils/roleUtils.ts`)
   - Helper functions for role-based UI logic
   - Permission checking utilities
   - Role display formatting

## Role Hierarchy

The system supports four role levels:

1. **Reader** (Level 0) - Basic user with read access
2. **Author** (Level 1) - Can create and manage articles
3. **Moderator** (Level 2) - Can moderate content and manage users
4. **Admin** (Level 3) - Full system access

## Key Functions

### Role Service Functions

#### `grantAuthorRole(userId: string)`
Upgrades an existing user to author role.

```typescript
const result = await grantAuthorRole('user-123');
if (result.success) {
  console.log('User upgraded:', result.user);
} else {
  console.error('Upgrade failed:', result.error);
}
```

#### `createAuthorAccount(email, password, displayName, username?)`
Creates a new user account with author privileges.

```typescript
const result = await createAuthorAccount(
  'user@example.com',
  'password123',
  'John Doe',
  'johndoe'
);
```

#### `activateExistingUserAccount(userId: string)`
Activates an existing user account by granting author role.

```typescript
const result = await activateExistingUserAccount('user-123');
```

### Permission Checking Functions

#### `hasAuthorPrivileges(user: ReaderProfile | null)`
Checks if user has author-level privileges or higher.

#### `hasModeratorPrivileges(user: ReaderProfile | null)`
Checks if user has moderator-level privileges or higher.

#### `hasAdminPrivileges(user: ReaderProfile | null)`
Checks if user has admin privileges.

#### `canUpgradeRole(currentRole: string, targetRole: string)`
Validates if a role upgrade is allowed.

### Utility Functions

#### `getDashboardUrl(user: ReaderProfile | null)`
Returns the appropriate dashboard URL based on user role.

#### `hasPermission(user, requiredRole)`
Checks if user has permission for a specific role requirement.

#### `getRoleDisplayName(role: string)`
Returns human-readable role name for UI display.

#### `getRoleBadgeColor(role: string)`
Returns CSS classes for role badge styling.

## Integration with Invitation Flow

### Existing User Flow

1. User clicks invitation link
2. System validates token and checks if user exists
3. If user exists but lacks author privileges:
   - Redirect to activation page
   - User signs in with credentials
   - System upgrades user role to author
   - Redirect to author dashboard

### New User Flow

1. User clicks invitation link
2. System validates token and checks if user exists
3. If user doesn't exist:
   - Redirect to registration page
   - User fills registration form
   - System creates account with author role
   - Redirect to author dashboard

### Error Handling

The system handles various error scenarios:

- **Invalid/Expired Tokens**: Redirect to error page with appropriate message
- **Already Activated**: Check if user already has author privileges
- **Database Errors**: Proper error logging and user feedback
- **Authentication Failures**: Clear error messages and recovery options

## Usage Examples

### In React Components

```typescript
import { useRoleManagement } from '@/hooks/useRoleManagement';
import { hasAuthorPrivileges } from '@/services/roleService';

function MyComponent() {
  const { grantAuthor, isLoading } = useRoleManagement();
  const { currentUser } = useAuth();

  const handleGrantAuthor = async (userId: string) => {
    const result = await grantAuthor(userId);
    if (result.success) {
      // Handle success
    }
  };

  if (hasAuthorPrivileges(currentUser)) {
    return <AuthorDashboard />;
  }

  return <ReaderView />;
}
```

### Permission-Based Rendering

```typescript
import { canAccessAdmin, hasPermission } from '@/utils/roleUtils';

function AdminPanel() {
  const { currentUser } = useAuth();

  if (!canAccessAdmin(currentUser)) {
    return <AccessDenied />;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {hasPermission(currentUser, 'moderator') && (
        <ModerationTools />
      )}
    </div>
  );
}
```

## Security Considerations

1. **Role Validation**: All role checks are performed server-side
2. **Token Security**: Invitation tokens are hashed and have expiration
3. **Permission Checks**: UI permissions are backed by server-side validation
4. **Audit Trail**: All role changes are logged for security monitoring

## Database Schema

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'reader',
  -- other fields...
);
```

### Role Constraints
- Role field uses enum: 'reader', 'author', 'moderator', 'admin'
- Default role is 'reader' for new accounts
- Role upgrades are logged in audit tables

## Testing

The role management system includes comprehensive tests:

1. **Unit Tests** (`src/services/__tests__/roleService.test.ts`)
   - Individual function testing
   - Error handling validation
   - Permission checking logic

2. **Integration Tests** (`src/services/__tests__/invitationRoleIntegration.test.ts`)
   - Complete invitation flow testing
   - Role upgrade scenarios
   - Error condition handling

## Future Enhancements

1. **Role Expiration**: Add time-limited roles
2. **Custom Permissions**: Fine-grained permission system
3. **Role History**: Track role change history
4. **Bulk Operations**: Mass role updates for admin users
5. **Role Templates**: Predefined role configurations

## Troubleshooting

### Common Issues

1. **Role Not Updating**: Check if user profile refresh is called
2. **Permission Denied**: Verify role hierarchy and permission logic
3. **Database Errors**: Check RLS policies and table permissions
4. **Token Issues**: Validate token expiration and format

### Debug Tools

```typescript
// Check user permissions
console.log('User role:', currentUser?.role);
console.log('Has author access:', hasAuthorPrivileges(currentUser));
console.log('Dashboard URL:', getDashboardUrl(currentUser));

// Validate role upgrade
console.log('Can upgrade to author:', canUpgradeRole('reader', 'author'));
```