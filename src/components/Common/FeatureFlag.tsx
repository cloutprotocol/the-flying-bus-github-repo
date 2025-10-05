/**
 * Feature Flag component for conditional rendering based on user roles and permissions
 */

import React from 'react';
import { useRoleBasedAccess, useFeatureAccess, useMinimumRole } from '@/hooks/useRoleBasedAccess';
import { UserRole } from '@/config/roleBasedFeatures';

interface FeatureFlagProps {
  children: React.ReactNode;
  feature?: string;
  minimumRole?: UserRole;
  dashboardSection?: string;
  navigation?: string;
  fallback?: React.ReactNode;
  requireAuthentication?: boolean;
}

/**
 * Component that conditionally renders children based on feature access
 */
export const FeatureFlag: React.FC<FeatureFlagProps> = ({
  children,
  feature,
  minimumRole,
  dashboardSection,
  navigation,
  fallback = null,
  requireAuthentication = false
}) => {
  const {
    hasFeature,
    hasDashboardSection,
    hasNavigation,
    hasMinRole,
    isAuthenticated
  } = useRoleBasedAccess();

  // Check authentication requirement
  if (requireAuthentication && !isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check feature access
  if (feature && !hasFeature(feature)) {
    return <>{fallback}</>;
  }

  // Check minimum role requirement
  if (minimumRole && !hasMinRole(minimumRole)) {
    return <>{fallback}</>;
  }

  // Check dashboard section access
  if (dashboardSection && !hasDashboardSection(dashboardSection)) {
    return <>{fallback}</>;
  }

  // Check navigation access
  if (navigation && !hasNavigation(navigation)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Component for feature-specific conditional rendering
 */
interface FeatureAccessProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureAccess: React.FC<FeatureAccessProps> = ({
  featureId,
  children,
  fallback = null
}) => {
  const hasAccess = useFeatureAccess(featureId);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component for role-based conditional rendering
 */
interface RoleAccessProps {
  minimumRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleAccess: React.FC<RoleAccessProps> = ({
  minimumRole,
  children,
  fallback = null
}) => {
  const hasAccess = useMinimumRole(minimumRole);
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component for authenticated user conditional rendering
 */
interface AuthenticatedProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Authenticated: React.FC<AuthenticatedProps> = ({
  children,
  fallback = null
}) => {
  const { isAuthenticated } = useRoleBasedAccess();
  
  return isAuthenticated ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component for admin-only content
 */
interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminOnly: React.FC<AdminOnlyProps> = ({
  children,
  fallback = null
}) => {
  return (
    <RoleAccess minimumRole="admin" fallback={fallback}>
      {children}
    </RoleAccess>
  );
};

/**
 * Component for moderator and above content
 */
interface ModeratorPlusProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ModeratorPlus: React.FC<ModeratorPlusProps> = ({
  children,
  fallback = null
}) => {
  return (
    <RoleAccess minimumRole="moderator" fallback={fallback}>
      {children}
    </RoleAccess>
  );
};

/**
 * Component for author and above content
 */
interface AuthorPlusProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthorPlus: React.FC<AuthorPlusProps> = ({
  children,
  fallback = null
}) => {
  return (
    <RoleAccess minimumRole="author" fallback={fallback}>
      {children}
    </RoleAccess>
  );
};

/**
 * Higher-order component for feature access
 */
export function withFeatureAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureId: string,
  fallback?: React.ComponentType<P>
) {
  return function FeatureAccessWrapper(props: P) {
    const hasAccess = useFeatureAccess(featureId);
    
    if (!hasAccess) {
      return fallback ? <fallback {...props} /> : null;
    }
    
    return <WrappedComponent {...props} />;
  };
}

/**
 * Higher-order component for role access
 */
export function withRoleAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  minimumRole: UserRole,
  fallback?: React.ComponentType<P>
) {
  return function RoleAccessWrapper(props: P) {
    const hasAccess = useMinimumRole(minimumRole);
    
    if (!hasAccess) {
      return fallback ? <fallback {...props} /> : null;
    }
    
    return <WrappedComponent {...props} />;
  };
}