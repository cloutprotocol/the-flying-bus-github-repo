/**
 * Role-based access control utilities
 * Provides functions to check feature availability and permissions
 */

import { ReaderProfile } from '@/types/ReaderProfile';
import { 
  UserRole, 
  FeatureConfig, 
  RolePermissions,
  FEATURES, 
  ROLE_PERMISSIONS,
  DASHBOARD_SECTIONS 
} from '@/config/roleBasedFeatures';

/**
 * Get user role from profile, with fallback to 'reader'
 */
export function getUserRole(user: ReaderProfile | null): UserRole {
  // Debug logging to help troubleshoot role issues
  console.log('getUserRole called with user:', {
    hasUser: !!user,
    userId: user?.id,
    userRole: user?.role,
    userEmail: user?.email
  });
  
  if (!user || !user.role) {
    console.log('getUserRole: No user or role, defaulting to reader');
    return 'reader';
  }
  
  const role = user.role.toLowerCase();
  if (['reader', 'author', 'moderator', 'admin'].includes(role)) {
    console.log('getUserRole: Valid role found:', role);
    return role as UserRole;
  }
  
  console.log('getUserRole: Invalid role, defaulting to reader:', role);
  return 'reader';
}

/**
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(user: ReaderProfile | null, featureId: string): boolean {
  const userRole = getUserRole(user);
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions.features.includes(featureId);
}

/**
 * Check if user has access to a dashboard section
 */
export function hasDashboardSectionAccess(user: ReaderProfile | null, sectionId: string): boolean {
  const userRole = getUserRole(user);
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions.dashboardSections.includes(sectionId);
}

/**
 * Check if user has access to a navigation item
 */
export function hasNavigationAccess(user: ReaderProfile | null, navigationId: string): boolean {
  const userRole = getUserRole(user);
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions.navigationItems.includes(navigationId);
}

/**
 * Get all features available to a user
 */
export function getAvailableFeatures(user: ReaderProfile | null): FeatureConfig[] {
  const userRole = getUserRole(user);
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions.features
    .map(featureId => FEATURES[featureId])
    .filter(Boolean);
}

/**
 * Get features by category for a user
 */
export function getFeaturesByCategory(
  user: ReaderProfile | null, 
  category: 'content' | 'management' | 'analytics' | 'system' | 'moderation'
): FeatureConfig[] {
  const availableFeatures = getAvailableFeatures(user);
  return availableFeatures.filter(feature => feature.category === category);
}

/**
 * Get quick actions available to a user
 */
export function getQuickActions(user: ReaderProfile | null): FeatureConfig[] {
  const userRole = getUserRole(user);
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions.quickActions
    .map(featureId => FEATURES[featureId])
    .filter(Boolean);
}

/**
 * Get dashboard sections available to a user
 */
export function getAvailableDashboardSections(user: ReaderProfile | null) {
  const userRole = getUserRole(user);
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions.dashboardSections
    .map(sectionId => DASHBOARD_SECTIONS[sectionId])
    .filter(Boolean);
}

/**
 * Get navigation items available to a user
 */
export function getAvailableNavigationItems(user: ReaderProfile | null): string[] {
  const userRole = getUserRole(user);
  const permissions = ROLE_PERMISSIONS[userRole];
  
  return permissions.navigationItems;
}

/**
 * Check if user has minimum role level
 */
export function hasMinimumRole(user: ReaderProfile | null, minimumRole: UserRole): boolean {
  const userRole = getUserRole(user);
  
  const roleHierarchy: Record<UserRole, number> = {
    reader: 0,
    author: 1,
    moderator: 2,
    admin: 3
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
}

/**
 * Check if user can access admin dashboard at all
 */
export function canAccessAdminDashboard(user: ReaderProfile | null): boolean {
  const userRole = getUserRole(user);
  const hasAccess = hasMinimumRole(user, 'author');
  
  console.log('canAccessAdminDashboard check:', {
    hasUser: !!user,
    userRole,
    hasAccess,
    userId: user?.id
  });
  
  return hasAccess;
}

/**
 * Get appropriate dashboard redirect URL based on user role
 */
export function getDashboardRedirectUrl(user: ReaderProfile | null): string {
  const userRole = getUserRole(user);
  
  switch (userRole) {
    case 'admin':
    case 'moderator':
    case 'author':
      return '/admin/dashboard';
    case 'reader':
    default:
      return '/';
  }
}

/**
 * Check if user can edit a specific article
 */
export function canEditArticle(user: ReaderProfile | null, articleAuthorId?: string): boolean {
  const userRole = getUserRole(user);
  
  // Admins and moderators can edit any article
  if (hasMinimumRole(user, 'moderator')) {
    return true;
  }
  
  // Authors can only edit their own articles
  if (userRole === 'author' && user && articleAuthorId) {
    return user.id === articleAuthorId;
  }
  
  return false;
}

/**
 * Check if user can publish articles directly (without review)
 */
export function canPublishDirectly(user: ReaderProfile | null): boolean {
  return hasMinimumRole(user, 'moderator');
}

/**
 * Check if user needs to submit articles for review
 */
export function needsReviewProcess(user: ReaderProfile | null): boolean {
  const userRole = getUserRole(user);
  return userRole === 'author';
}

/**
 * Get role-specific dashboard title
 */
export function getDashboardTitle(user: ReaderProfile | null): string {
  const userRole = getUserRole(user);
  
  switch (userRole) {
    case 'admin':
      return 'Admin Dashboard';
    case 'moderator':
      return 'Moderator Dashboard';
    case 'author':
      return 'Author Dashboard';
    default:
      return 'Dashboard';
  }
}

/**
 * Get role-specific dashboard description
 */
export function getDashboardDescription(user: ReaderProfile | null): string {
  const userRole = getUserRole(user);
  
  switch (userRole) {
    case 'admin':
      return 'Manage users, content, and system settings for The Flying Bus.';
    case 'moderator':
      return 'Review content, moderate comments, and manage categories.';
    case 'author':
      return 'Create and manage your articles, view your analytics, and moderate comments on your content.';
    default:
      return 'Welcome to The Flying Bus.';
  }
}

/**
 * Feature flag system - check if a feature is enabled for the current user
 */
export function isFeatureEnabled(user: ReaderProfile | null, featureId: string): boolean {
  // This can be extended to include additional feature flag logic
  // such as A/B testing, beta features, etc.
  return hasFeatureAccess(user, featureId);
}

/**
 * Get role-specific metrics that should be displayed
 */
export function getRoleSpecificMetrics(user: ReaderProfile | null): string[] {
  const userRole = getUserRole(user);
  
  switch (userRole) {
    case 'admin':
      return [
        'total_users',
        'total_articles',
        'total_comments',
        'pending_reviews',
        'pending_invitations',
        'system_health'
      ];
    case 'moderator':
      return [
        'total_articles',
        'pending_reviews',
        'total_comments',
        'pending_comments',
        'categories_count'
      ];
    case 'author':
      return [
        'my_articles',
        'my_article_views',
        'my_comments',
        'articles_in_review',
        'articles_published'
      ];
    default:
      return [];
  }
}

/**
 * Check if user can perform bulk operations
 */
export function canPerformBulkOperations(user: ReaderProfile | null): boolean {
  return hasMinimumRole(user, 'moderator');
}

/**
 * Get maximum articles a user can create per day (rate limiting)
 */
export function getArticleCreationLimit(user: ReaderProfile | null): number {
  const userRole = getUserRole(user);
  
  switch (userRole) {
    case 'admin':
      return -1; // Unlimited
    case 'moderator':
      return 50;
    case 'author':
      return 10;
    default:
      return 0;
  }
}

/**
 * Check if user can access system logs
 */
export function canAccessSystemLogs(user: ReaderProfile | null): boolean {
  return hasMinimumRole(user, 'admin');
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(user: ReaderProfile | null): boolean {
  return hasMinimumRole(user, 'admin');
}

/**
 * Check if user can send invitations
 */
export function canSendInvitations(user: ReaderProfile | null): boolean {
  return hasMinimumRole(user, 'admin');
}