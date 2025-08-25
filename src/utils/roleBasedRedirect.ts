/**
 * Role-based redirect utilities
 * Handles redirects based on user roles and permissions
 */

import { ReaderProfile } from '@/types/ReaderProfile';
import { getUserRole, canAccessAdminDashboard, getDashboardRedirectUrl } from './roleBasedAccess';
import { UserRole } from '@/config/roleBasedFeatures';

/**
 * Redirect configuration for different scenarios
 */
interface RedirectConfig {
  path: string;
  replace?: boolean;
  state?: any;
}

/**
 * Get appropriate redirect after login based on user role
 */
export function getPostLoginRedirect(
  user: ReaderProfile | null,
  intendedDestination?: string
): RedirectConfig {
  // If user specified an intended destination and has access, go there
  if (intendedDestination && canAccessRoute(user, intendedDestination)) {
    return {
      path: intendedDestination,
      replace: true
    };
  }

  // Otherwise, redirect based on role
  const redirectUrl = getDashboardRedirectUrl(user);
  return {
    path: redirectUrl,
    replace: true
  };
}

/**
 * Get appropriate redirect after logout
 */
export function getPostLogoutRedirect(): RedirectConfig {
  return {
    path: '/',
    replace: true
  };
}

/**
 * Get redirect for unauthorized access attempts
 */
export function getUnauthorizedRedirect(
  user: ReaderProfile | null,
  attemptedPath: string
): RedirectConfig {
  const userRole = getUserRole(user);

  // If user can access admin dashboard, redirect there
  if (canAccessAdminDashboard(user)) {
    return {
      path: '/admin/dashboard',
      replace: true,
      state: {
        from: attemptedPath,
        reason: 'insufficient_permissions'
      }
    };
  }

  // If user is authenticated but can't access admin, go to home
  if (user) {
    return {
      path: '/',
      replace: true,
      state: {
        from: attemptedPath,
        reason: 'no_admin_access'
      }
    };
  }

  // If user is not authenticated, go to login
  return {
    path: '/login',
    replace: false,
    state: {
      from: attemptedPath,
      reason: 'authentication_required'
    }
  };
}

/**
 * Get redirect for role upgrade scenarios
 */
export function getRoleUpgradeRedirect(
  oldRole: UserRole,
  newRole: UserRole
): RedirectConfig {
  // If upgraded to author or higher, redirect to admin dashboard
  if (newRole !== 'reader' && oldRole === 'reader') {
    return {
      path: '/admin/dashboard',
      replace: true,
      state: {
        roleUpgraded: true,
        oldRole,
        newRole
      }
    };
  }

  // If upgraded within admin roles, stay on current page or go to dashboard
  return {
    path: '/admin/dashboard',
    replace: false,
    state: {
      roleUpgraded: true,
      oldRole,
      newRole
    }
  };
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(user: ReaderProfile | null, path: string): boolean {
  const userRole = getUserRole(user);

  // Public routes - accessible to everyone
  const publicRoutes = [
    '/',
    '/about',
    '/articles',
    '/categories',
    '/login',
    '/register',
    '/request-invitation'
  ];

  // Check if it's a public route
  if (publicRoutes.some(route => path.startsWith(route))) {
    return true;
  }

  // Admin routes - require author role or higher
  if (path.startsWith('/admin')) {
    return canAccessAdminDashboard(user);
  }

  // Profile routes - require authentication
  if (path.startsWith('/profile')) {
    return !!user;
  }

  // Default to allowing access for other routes
  return true;
}

/**
 * Get role-specific landing page after successful registration
 */
export function getRegistrationSuccessRedirect(
  user: ReaderProfile | null,
  registrationType: 'standard' | 'invitation'
): RedirectConfig {
  const userRole = getUserRole(user);

  // If registered through invitation and got author role, go to admin dashboard
  if (registrationType === 'invitation' && userRole === 'author') {
    return {
      path: '/admin/dashboard',
      replace: true,
      state: {
        welcomeMessage: 'Welcome to The Flying Bus! You can now create and manage articles.',
        newAuthor: true
      }
    };
  }

  // For standard registration, go to home page
  return {
    path: '/',
    replace: true,
    state: {
      welcomeMessage: 'Welcome to The Flying Bus! Start exploring our content.',
      newUser: true
    }
  };
}

/**
 * Get redirect for feature access denial
 */
export function getFeatureAccessDeniedRedirect(
  user: ReaderProfile | null,
  featureId: string,
  currentPath: string
): RedirectConfig {
  const userRole = getUserRole(user);

  return {
    path: '/admin/dashboard',
    replace: true,
    state: {
      from: currentPath,
      reason: 'feature_access_denied',
      featureId,
      userRole
    }
  };
}

/**
 * Handle navigation based on user role and intended action
 */
export function handleRoleBasedNavigation(
  user: ReaderProfile | null,
  action: 'create_article' | 'manage_users' | 'view_analytics' | 'moderate_comments',
  navigate: (path: string, options?: any) => void
): void {
  const userRole = getUserRole(user);

  switch (action) {
    case 'create_article':
      if (userRole === 'reader') {
        navigate('/request-invitation', {
          state: { reason: 'create_article_requires_author' }
        });
      } else {
        navigate('/admin/articles/create');
      }
      break;

    case 'manage_users':
      if (userRole !== 'admin') {
        navigate('/admin/dashboard', {
          state: { reason: 'admin_only_feature' }
        });
      } else {
        navigate('/admin/users');
      }
      break;

    case 'view_analytics':
      if (userRole === 'reader') {
        navigate('/request-invitation', {
          state: { reason: 'analytics_requires_author' }
        });
      } else if (userRole === 'author') {
        navigate('/admin/analytics/my-content');
      } else {
        navigate('/admin/analytics');
      }
      break;

    case 'moderate_comments':
      if (userRole === 'reader') {
        navigate('/request-invitation', {
          state: { reason: 'moderation_requires_author' }
        });
      } else if (userRole === 'author') {
        navigate('/admin/comments/my-articles');
      } else {
        navigate('/admin/comments');
      }
      break;

    default:
      navigate('/admin/dashboard');
  }
}

/**
 * Get breadcrumb navigation based on current path and user role
 */
export function getRoleBasedBreadcrumbs(
  user: ReaderProfile | null,
  currentPath: string
): Array<{ label: string; path: string; active: boolean }> {
  const userRole = getUserRole(user);
  const breadcrumbs: Array<{ label: string; path: string; active: boolean }> = [];

  // Always start with home
  breadcrumbs.push({ label: 'Home', path: '/', active: false });

  // Add admin dashboard if user has access
  if (canAccessAdminDashboard(user)) {
    breadcrumbs.push({ 
      label: userRole === 'admin' ? 'Admin Dashboard' : 
             userRole === 'moderator' ? 'Moderator Dashboard' : 'Author Dashboard', 
      path: '/admin/dashboard', 
      active: currentPath === '/admin/dashboard' 
    });
  }

  // Add specific page breadcrumbs based on current path
  if (currentPath.startsWith('/admin/articles')) {
    if (userRole === 'author') {
      breadcrumbs.push({ 
        label: 'My Articles', 
        path: '/admin/articles/my-articles', 
        active: currentPath === '/admin/articles/my-articles' 
      });
    } else {
      breadcrumbs.push({ 
        label: 'Articles', 
        path: '/admin/articles', 
        active: currentPath === '/admin/articles' 
      });
    }

    if (currentPath.includes('/create')) {
      breadcrumbs.push({ label: 'Create Article', path: currentPath, active: true });
    } else if (currentPath.includes('/edit')) {
      breadcrumbs.push({ label: 'Edit Article', path: currentPath, active: true });
    }
  }

  // Add other admin section breadcrumbs
  if (currentPath.startsWith('/admin/users') && userRole === 'admin') {
    breadcrumbs.push({ label: 'User Management', path: '/admin/users', active: true });
  }

  if (currentPath.startsWith('/admin/analytics')) {
    const label = userRole === 'author' ? 'My Analytics' : 'Analytics';
    breadcrumbs.push({ label, path: currentPath, active: true });
  }

  return breadcrumbs;
}

/**
 * Validate and redirect if necessary based on current route and user permissions
 */
export function validateCurrentRoute(
  user: ReaderProfile | null,
  currentPath: string,
  navigate: (path: string, options?: any) => void
): boolean {
  // Check if user can access current route
  if (!canAccessRoute(user, currentPath)) {
    const redirect = getUnauthorizedRedirect(user, currentPath);
    navigate(redirect.path, { 
      replace: redirect.replace, 
      state: redirect.state 
    });
    return false;
  }

  return true;
}