# Design Document

## Overview

This design addresses the critical issue where users completing the invitation registration process are not being assigned the correct 'author' role, preventing them from accessing author-specific features in the admin dashboard. The solution involves fixing the role assignment during registration, implementing proper role-based access control, and creating a simplified admin dashboard experience for authors.

## Architecture

### Current System Analysis

Based on the codebase analysis, the current system has:

1. **Role Management Service** (`src/services/roleService.ts`) - Contains functions for role assignment and validation
2. **Invitation Service** (`src/services/invitationService.ts`) - Handles invitation flow but may not properly assign author role
3. **Registration Flow Coordinator** - Coordinates the registration process
4. **Admin Dashboard** (`src/pages/Admin/Dashboard.tsx`) - Currently shows all features regardless of role
5. **Database Schema** - `profiles` table with role field supporting 'reader', 'author', 'moderator', 'admin'

### Root Cause Analysis

The issue appears to be in the registration flow where:
1. Users successfully register through invitation tokens
2. The role assignment step is either missing or failing silently
3. Users default to 'reader' role instead of 'author'
4. Admin dashboard doesn't differentiate between admin and author access

## Components and Interfaces

### 1. Enhanced Role Assignment Service

**File**: `src/services/roleService.ts` (enhancement)

```typescript
interface RoleAssignmentResult {
  success: boolean;
  user?: ReaderProfile;
  error?: string;
  auditLog?: string;
}

interface RoleValidationContext {
  invitationToken?: string;
  registrationType: 'standard' | 'invitation';
  userId: string;
  email: string;
}

// New functions to add:
- assignAuthorRoleFromInvitation(userId: string, context: RoleValidationContext): Promise<RoleAssignmentResult>
- validateRoleAssignment(userId: string): Promise<boolean>
- auditRoleChange(userId: string, fromRole: string, toRole: string, context: any): Promise<void>
```

### 2. Registration Flow Enhancement

**File**: `src/services/registrationFlowCoordinator.ts` (enhancement)

The coordinator needs to ensure role assignment happens atomically with user creation:

```typescript
interface InvitationRegistrationFlow {
  1. validateInvitationToken()
  2. createUserAccount()
  3. assignAuthorRole() // This step needs to be guaranteed
  4. auditRoleAssignment()
  5. sendWelcomeEmail()
}
```

### 3. Role-Based Admin Dashboard

**File**: `src/pages/Admin/Dashboard.tsx` (enhancement)

Create role-specific dashboard views:

```typescript
interface DashboardConfig {
  role: 'admin' | 'moderator' | 'author';
  availableFeatures: string[];
  restrictedFeatures: string[];
  customMetrics: DashboardMetrics;
}

// Author-specific features:
- Article creation and editing (own articles only)
- Article submission for review
- Basic analytics (own content only)
- Comment management (own articles only)

// Admin-only features:
- User management
- System settings
- All article management
- Invitation approval
- Site-wide analytics
```

### 4. Article Ownership and Review System

**New Component**: `src/components/Admin/ArticleManagement/AuthorArticleManager.tsx`

```typescript
interface AuthorArticleManager {
  - listOwnArticles(authorId: string)
  - createArticle(data: ArticleData)
  - editOwnArticle(articleId: string, data: ArticleData)
  - submitForReview(articleId: string)
  - viewArticleStatus(articleId: string)
}
```

### 5. Database Triggers and Constraints

**Enhancement**: Database-level role assignment validation

```sql
-- Trigger to ensure invitation-based registrations get author role
CREATE OR REPLACE FUNCTION assign_author_role_from_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user was created through invitation
  IF EXISTS (
    SELECT 1 FROM invitation_tokens 
    WHERE used_by = NEW.id 
    AND used_at IS NOT NULL
  ) THEN
    -- Ensure role is set to author
    NEW.role = 'author';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_invitation_author_role
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_author_role_from_invitation();
```

## Data Models

### Enhanced Profile Model

```typescript
interface EnhancedProfile extends ReaderProfile {
  role_assigned_at: string;
  role_assignment_method: 'invitation' | 'manual' | 'system';
  role_assignment_context?: {
    invitationId?: string;
    assignedBy?: string;
    reason?: string;
  };
}
```

### Article Ownership Model

```typescript
interface ArticleWithOwnership {
  id: string;
  title: string;
  content: string;
  author_id: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  created_at: string;
  updated_at: string;
  submitted_for_review_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  can_edit: boolean; // Computed based on current user
  can_publish: boolean; // Computed based on current user role
}
```

### Role-Based Dashboard Metrics

```typescript
interface RoleBasedMetrics {
  // Common metrics
  totalArticles: number;
  totalViews: number;
  totalComments: number;
  
  // Author-specific metrics
  ownArticles?: number;
  ownArticleViews?: number;
  ownArticleComments?: number;
  articlesInReview?: number;
  articlesPublished?: number;
  
  // Admin-specific metrics
  pendingReviews?: number;
  totalUsers?: number;
  pendingInvitations?: number;
  systemHealth?: 'good' | 'warning' | 'error';
}
```

## Error Handling

### Role Assignment Failures

```typescript
enum RoleAssignmentError {
  INVITATION_TOKEN_INVALID = 'invitation_token_invalid',
  USER_NOT_FOUND = 'user_not_found',
  ROLE_ASSIGNMENT_FAILED = 'role_assignment_failed',
  DATABASE_ERROR = 'database_error',
  AUDIT_LOG_FAILED = 'audit_log_failed'
}

interface RoleAssignmentErrorHandler {
  handleError(error: RoleAssignmentError, context: any): Promise<void>;
  retryRoleAssignment(userId: string, maxRetries: number): Promise<boolean>;
  notifyAdminOfFailure(userId: string, error: any): Promise<void>;
}
```

### Fallback Mechanisms

1. **Database Trigger Fallback**: If service-level role assignment fails, database trigger ensures consistency
2. **Manual Role Assignment**: Admin interface to manually assign roles when automatic assignment fails
3. **Role Validation on Login**: Check and fix role assignments during user authentication
4. **Audit Trail**: Complete logging of all role assignment attempts and failures

## Testing Strategy

### Unit Tests

1. **Role Assignment Service Tests**
   - Test successful author role assignment from invitation
   - Test role assignment failure scenarios
   - Test role validation functions
   - Test audit logging

2. **Registration Flow Tests**
   - Test complete invitation registration flow
   - Test role assignment during registration
   - Test error handling and rollback scenarios

3. **Dashboard Access Control Tests**
   - Test author vs admin feature access
   - Test article ownership validation
   - Test role-based metric calculation

### Integration Tests

1. **End-to-End Registration Flow**
   - Complete invitation approval to author dashboard access
   - Verify role assignment persistence
   - Verify dashboard feature availability

2. **Article Management Flow**
   - Author creates article → submits for review → admin approves → published
   - Verify ownership restrictions
   - Verify review workflow

3. **Role-Based Access Control**
   - Test all admin dashboard features with different roles
   - Verify proper access restrictions
   - Test role upgrade scenarios

### Database Tests

1. **Trigger Validation**
   - Test database trigger for role assignment
   - Test constraint enforcement
   - Test data consistency

2. **Migration Tests**
   - Test existing user role updates
   - Test data migration for new fields
   - Test rollback scenarios

## Security Considerations

### Role-Based Access Control (RBAC)

1. **Server-Side Validation**: All role checks must happen server-side
2. **Database-Level Security**: RLS policies to enforce role-based data access
3. **API Endpoint Protection**: Role validation on all admin endpoints
4. **Frontend Security**: UI elements hidden based on role, but not relied upon for security

### Audit and Compliance

1. **Role Change Logging**: All role assignments and changes must be logged
2. **Access Logging**: Log all admin dashboard access attempts
3. **Data Access Logging**: Log article creation, editing, and publishing actions
4. **Compliance Reporting**: Generate reports on user roles and permissions

### Data Protection

1. **Article Ownership**: Authors can only access their own articles
2. **User Data Protection**: Authors cannot access other users' personal information
3. **System Data Protection**: Authors cannot access system configuration or logs

## Performance Considerations

### Database Optimization

1. **Role-Based Queries**: Optimize queries for role-based data filtering
2. **Article Ownership Indexes**: Add indexes for efficient article ownership queries
3. **Dashboard Metrics Caching**: Cache role-specific metrics to improve dashboard performance

### Frontend Optimization

1. **Conditional Loading**: Load only role-appropriate components
2. **Feature Flags**: Use role-based feature flags for conditional rendering
3. **Route Protection**: Implement role-based route guards

## Migration Strategy

### Phase 1: Fix Role Assignment
1. Deploy enhanced role assignment service
2. Add database triggers for role consistency
3. Create manual role assignment tools for admins

### Phase 2: Implement Role-Based Dashboard
1. Create author-specific dashboard components
2. Implement article ownership restrictions
3. Add role-based feature toggles

### Phase 3: Enhanced Features
1. Implement article review workflow
2. Add role-based analytics
3. Create comprehensive audit logging

### Data Migration

1. **Existing Users**: Identify users who should have author role but don't
2. **Role Assignment**: Batch update roles based on invitation history
3. **Audit Trail**: Create audit entries for migrated role assignments
4. **Validation**: Verify all role assignments are correct post-migration