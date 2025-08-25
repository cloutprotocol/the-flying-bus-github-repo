/**
 * Route Guard component for role-based access control
 * Protects routes based on user roles and permissions
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, Home } from 'lucide-react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { UserRole } from '@/config/roleBasedFeatures';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredFeature?: string;
  requireAuthentication?: boolean;
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

/**
 * Route guard component that protects routes based on user permissions
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredRole,
  requiredFeature,
  requireAuthentication = false,
  fallbackPath,
  showAccessDenied = true
}) => {
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    hasMinRole,
    hasFeature,
    dashboardRedirectUrl
  } = useRoleBasedAccess();

  // Check authentication requirement
  if (requireAuthentication && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && !hasMinRole(requiredRole)) {
    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />;
    }
    
    if (!showAccessDenied) {
      return <Navigate to={dashboardRedirectUrl} replace />;
    }

    return <AccessDeniedPage requiredRole={requiredRole} />;
  }

  // Check feature requirement
  if (requiredFeature && !hasFeature(requiredFeature)) {
    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />;
    }
    
    if (!showAccessDenied) {
      return <Navigate to={dashboardRedirectUrl} replace />;
    }

    return <AccessDeniedPage requiredFeature={requiredFeature} />;
  }

  return <>{children}</>;
};

/**
 * Admin route guard - requires author role or higher
 */
interface AdminRouteGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  children,
  fallbackPath = '/'
}) => {
  return (
    <RouteGuard
      requiredRole="author"
      requireAuthentication={true}
      fallbackPath={fallbackPath}
      showAccessDenied={true}
    >
      {children}
    </RouteGuard>
  );
};

/**
 * Moderator route guard - requires moderator role or higher
 */
interface ModeratorRouteGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export const ModeratorRouteGuard: React.FC<ModeratorRouteGuardProps> = ({
  children,
  fallbackPath = '/admin/dashboard'
}) => {
  return (
    <RouteGuard
      requiredRole="moderator"
      requireAuthentication={true}
      fallbackPath={fallbackPath}
      showAccessDenied={true}
    >
      {children}
    </RouteGuard>
  );
};

/**
 * Admin-only route guard - requires admin role
 */
interface AdminOnlyRouteGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export const AdminOnlyRouteGuard: React.FC<AdminOnlyRouteGuardProps> = ({
  children,
  fallbackPath = '/admin/dashboard'
}) => {
  return (
    <RouteGuard
      requiredRole="admin"
      requireAuthentication={true}
      fallbackPath={fallbackPath}
      showAccessDenied={true}
    >
      {children}
    </RouteGuard>
  );
};

/**
 * Feature-based route guard
 */
interface FeatureRouteGuardProps {
  children: React.ReactNode;
  requiredFeature: string;
  fallbackPath?: string;
}

export const FeatureRouteGuard: React.FC<FeatureRouteGuardProps> = ({
  children,
  requiredFeature,
  fallbackPath = '/admin/dashboard'
}) => {
  return (
    <RouteGuard
      requiredFeature={requiredFeature}
      requireAuthentication={true}
      fallbackPath={fallbackPath}
      showAccessDenied={true}
    >
      {children}
    </RouteGuard>
  );
};

/**
 * Access denied page component
 */
interface AccessDeniedPageProps {
  requiredRole?: UserRole;
  requiredFeature?: string;
}

const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  requiredRole,
  requiredFeature
}) => {
  const { user, userRole, dashboardRedirectUrl } = useRoleBasedAccess();

  const getMessage = () => {
    if (requiredRole) {
      return `This page requires ${requiredRole} role or higher. You currently have ${userRole} role.`;
    }
    if (requiredFeature) {
      return `This feature is not available for your current role (${userRole}).`;
    }
    return 'You do not have permission to access this page.';
  };

  const getTitle = () => {
    if (requiredRole) {
      return 'Insufficient Role';
    }
    if (requiredFeature) {
      return 'Feature Not Available';
    }
    return 'Access Denied';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getTitle()}
            </h2>
            
            <p className="text-gray-600 mb-6">
              {getMessage()}
            </p>
            
            {user && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <strong>Current User:</strong> {user.display_name || user.username}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Current Role:</strong> {userRole}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = dashboardRedirectUrl}
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => window.history.back()}
                className="w-full"
              >
                Go Back
              </Button>
            </div>
            
            <div className="mt-6 text-sm text-gray-500">
              <p>
                If you believe this is an error, please contact an administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/**
 * Higher-order component for route protection
 */
export function withRouteGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  guardProps: Omit<RouteGuardProps, 'children'>
) {
  return function GuardedComponent(props: P) {
    return (
      <RouteGuard {...guardProps}>
        <WrappedComponent {...props} />
      </RouteGuard>
    );
  };
}

/**
 * Hook for programmatic access control checks
 */
export function useRouteAccess() {
  const {
    isAuthenticated,
    hasMinRole,
    hasFeature,
    dashboardRedirectUrl
  } = useRoleBasedAccess();

  const checkAccess = (requirements: {
    requireAuthentication?: boolean;
    requiredRole?: UserRole;
    requiredFeature?: string;
  }) => {
    if (requirements.requireAuthentication && !isAuthenticated) {
      return { hasAccess: false, redirectTo: '/login' };
    }

    if (requirements.requiredRole && !hasMinRole(requirements.requiredRole)) {
      return { hasAccess: false, redirectTo: dashboardRedirectUrl };
    }

    if (requirements.requiredFeature && !hasFeature(requirements.requiredFeature)) {
      return { hasAccess: false, redirectTo: dashboardRedirectUrl };
    }

    return { hasAccess: true, redirectTo: null };
  };

  return { checkAccess };
}