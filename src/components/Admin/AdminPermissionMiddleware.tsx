/**
 * Admin Permission Middleware
 * Validates user permissions for specific admin features and provides fallback handling
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Shield, 
  ArrowLeft, 
  Home,
  RefreshCw
} from 'lucide-react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { UserRole } from '@/config/roleBasedFeatures';

interface AdminPermissionMiddlewareProps {
  children: React.ReactNode;
  requiredPermissions?: {
    role?: UserRole;
    features?: string[];
    customCheck?: () => boolean;
  };
  fallbackComponent?: React.ComponentType;
  onUnauthorized?: (reason: string) => void;
  showLoadingState?: boolean;
}

/**
 * Middleware component that validates admin permissions and handles unauthorized access
 */
export const AdminPermissionMiddleware: React.FC<AdminPermissionMiddlewareProps> = ({
  children,
  requiredPermissions,
  fallbackComponent: FallbackComponent,
  onUnauthorized,
  showLoadingState = true
}) => {
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    user,
    userRole,
    isAuthenticated,
    hasMinRole,
    hasFeature,
    canAccessDashboard,
    dashboardRedirectUrl
  } = useRoleBasedAccess();

  useEffect(() => {
    const validatePermissions = async () => {
      setIsValidating(true);
      setValidationError(null);

      try {
        // Check if user is authenticated
        if (!isAuthenticated) {
          const error = 'Authentication required';
          setValidationError(error);
          if (onUnauthorized) onUnauthorized(error);
          navigate('/login', { state: { from: location } });
          return;
        }

        // Check if user can access admin dashboard at all
        if (!canAccessDashboard) {
          const error = 'Admin dashboard access denied';
          setValidationError(error);
          if (onUnauthorized) onUnauthorized(error);
          navigate('/', { replace: true });
          return;
        }

        // Check specific permissions if provided
        if (requiredPermissions) {
          // Check role requirement
          if (requiredPermissions.role && !hasMinRole(requiredPermissions.role)) {
            const error = `Requires ${requiredPermissions.role} role or higher. Current role: ${userRole}`;
            setValidationError(error);
            if (onUnauthorized) onUnauthorized(error);
            return;
          }

          // Check feature requirements
          if (requiredPermissions.features) {
            const missingFeatures = requiredPermissions.features.filter(feature => !hasFeature(feature));
            if (missingFeatures.length > 0) {
              const error = `Missing required features: ${missingFeatures.join(', ')}`;
              setValidationError(error);
              if (onUnauthorized) onUnauthorized(error);
              return;
            }
          }

          // Check custom validation
          if (requiredPermissions.customCheck && !requiredPermissions.customCheck()) {
            const error = 'Custom permission check failed';
            setValidationError(error);
            if (onUnauthorized) onUnauthorized(error);
            return;
          }
        }

        // All checks passed
        setValidationError(null);
      } catch (error) {
        console.error('Permission validation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Permission validation failed';
        setValidationError(errorMessage);
        if (onUnauthorized) onUnauthorized(errorMessage);
      } finally {
        setIsValidating(false);
      }
    };

    validatePermissions();
  }, [
    isAuthenticated,
    user,
    userRole,
    canAccessDashboard,
    requiredPermissions,
    onUnauthorized,
    navigate,
    location,
    hasMinRole,
    hasFeature
  ]);

  // Show loading state during validation
  if (isValidating && showLoadingState) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Validating Permissions</h3>
            <p className="text-muted-foreground">
              Checking your access permissions...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if validation failed
  if (validationError) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground mb-4">
              {validationError}
            </p>
            
            {user && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                <p><strong>User:</strong> {user.display_name || user.username}</p>
                <p><strong>Role:</strong> {userRole}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Button 
                onClick={() => navigate(dashboardRedirectUrl)}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate(-1)}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children if all validations pass
  return <>{children}</>;
};

/**
 * Specific middleware for user management features
 */
interface UserManagementMiddlewareProps {
  children: React.ReactNode;
  onUnauthorized?: (reason: string) => void;
}

export const UserManagementMiddleware: React.FC<UserManagementMiddlewareProps> = ({
  children,
  onUnauthorized
}) => {
  return (
    <AdminPermissionMiddleware
      requiredPermissions={{
        role: 'admin',
        features: ['manage_users']
      }}
      onUnauthorized={onUnauthorized}
    >
      {children}
    </AdminPermissionMiddleware>
  );
};

/**
 * Specific middleware for content moderation features
 */
interface ModerationMiddlewareProps {
  children: React.ReactNode;
  onUnauthorized?: (reason: string) => void;
}

export const ModerationMiddleware: React.FC<ModerationMiddlewareProps> = ({
  children,
  onUnauthorized
}) => {
  return (
    <AdminPermissionMiddleware
      requiredPermissions={{
        role: 'moderator',
        features: ['moderate_all_comments', 'review_articles']
      }}
      onUnauthorized={onUnauthorized}
    >
      {children}
    </AdminPermissionMiddleware>
  );
};

/**
 * Specific middleware for system settings
 */
interface SystemSettingsMiddlewareProps {
  children: React.ReactNode;
  onUnauthorized?: (reason: string) => void;
}

export const SystemSettingsMiddleware: React.FC<SystemSettingsMiddlewareProps> = ({
  children,
  onUnauthorized
}) => {
  return (
    <AdminPermissionMiddleware
      requiredPermissions={{
        role: 'admin',
        features: ['system_settings']
      }}
      onUnauthorized={onUnauthorized}
    >
      {children}
    </AdminPermissionMiddleware>
  );
};

/**
 * Middleware for article ownership validation
 */
interface ArticleOwnershipMiddlewareProps {
  children: React.ReactNode;
  articleAuthorId?: string;
  onUnauthorized?: (reason: string) => void;
}

export const ArticleOwnershipMiddleware: React.FC<ArticleOwnershipMiddlewareProps> = ({
  children,
  articleAuthorId,
  onUnauthorized
}) => {
  const { user, hasMinRole } = useRoleBasedAccess();

  const customCheck = () => {
    // Admins and moderators can edit any article
    if (hasMinRole('moderator')) {
      return true;
    }
    
    // Authors can only edit their own articles
    if (user && articleAuthorId) {
      return user.id === articleAuthorId;
    }
    
    return false;
  };

  return (
    <AdminPermissionMiddleware
      requiredPermissions={{
        role: 'author',
        customCheck
      }}
      onUnauthorized={onUnauthorized}
    >
      {children}
    </AdminPermissionMiddleware>
  );
};

/**
 * Hook for permission validation in components
 */
export function useAdminPermissionValidation() {
  const {
    user,
    userRole,
    isAuthenticated,
    hasMinRole,
    hasFeature,
    canAccessDashboard
  } = useRoleBasedAccess();

  const validatePermission = (requirements: {
    role?: UserRole;
    features?: string[];
    customCheck?: () => boolean;
  }) => {
    if (!isAuthenticated) {
      return { isValid: false, reason: 'Not authenticated' };
    }

    if (!canAccessDashboard) {
      return { isValid: false, reason: 'No admin dashboard access' };
    }

    if (requirements.role && !hasMinRole(requirements.role)) {
      return { 
        isValid: false, 
        reason: `Requires ${requirements.role} role or higher. Current: ${userRole}` 
      };
    }

    if (requirements.features) {
      const missingFeatures = requirements.features.filter(feature => !hasFeature(feature));
      if (missingFeatures.length > 0) {
        return { 
          isValid: false, 
          reason: `Missing features: ${missingFeatures.join(', ')}` 
        };
      }
    }

    if (requirements.customCheck && !requirements.customCheck()) {
      return { isValid: false, reason: 'Custom validation failed' };
    }

    return { isValid: true, reason: null };
  };

  return { validatePermission };
}