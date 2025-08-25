/**
 * React hook for role-based access control
 * Provides easy access to role-based features and permissions
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ReaderProfile } from '@/types/ReaderProfile';
import {
  getUserRole,
  hasFeatureAccess,
  hasDashboardSectionAccess,
  hasNavigationAccess,
  getAvailableFeatures,
  getFeaturesByCategory,
  getQuickActions,
  getAvailableDashboardSections,
  getAvailableNavigationItems,
  hasMinimumRole,
  canAccessAdminDashboard,
  getDashboardRedirectUrl,
  canEditArticle,
  canPublishDirectly,
  needsReviewProcess,
  getDashboardTitle,
  getDashboardDescription,
  isFeatureEnabled,
  getRoleSpecificMetrics,
  canPerformBulkOperations,
  getArticleCreationLimit,
  canAccessSystemLogs,
  canManageUsers,
  canSendInvitations
} from '@/utils/roleBasedAccess';
import { UserRole, FeatureConfig } from '@/config/roleBasedFeatures';

export interface UseRoleBasedAccessReturn {
  // User info
  user: ReaderProfile | null;
  userRole: UserRole;
  isAuthenticated: boolean;
  
  // Feature access checks
  hasFeature: (featureId: string) => boolean;
  hasDashboardSection: (sectionId: string) => boolean;
  hasNavigation: (navigationId: string) => boolean;
  hasMinRole: (minimumRole: UserRole) => boolean;
  isFeatureEnabled: (featureId: string) => boolean;
  
  // Feature collections
  availableFeatures: FeatureConfig[];
  contentFeatures: FeatureConfig[];
  managementFeatures: FeatureConfig[];
  analyticsFeatures: FeatureConfig[];
  systemFeatures: FeatureConfig[];
  moderationFeatures: FeatureConfig[];
  quickActions: FeatureConfig[];
  dashboardSections: any[];
  navigationItems: string[];
  roleSpecificMetrics: string[];
  
  // Specific permissions
  canAccessDashboard: boolean;
  canEditArticle: (articleAuthorId?: string) => boolean;
  canPublishDirectly: boolean;
  needsReview: boolean;
  canBulkOperations: boolean;
  canAccessLogs: boolean;
  canManageUsers: boolean;
  canSendInvitations: boolean;
  
  // UI helpers
  dashboardTitle: string;
  dashboardDescription: string;
  dashboardRedirectUrl: string;
  articleCreationLimit: number;
}

/**
 * Hook for role-based access control
 */
export function useRoleBasedAccess(): UseRoleBasedAccessReturn {
  const { user, isAuthenticated } = useAuth();
  
  const userRole = useMemo(() => getUserRole(user), [user]);
  
  const availableFeatures = useMemo(() => getAvailableFeatures(user), [user]);
  
  const contentFeatures = useMemo(() => getFeaturesByCategory(user, 'content'), [user]);
  const managementFeatures = useMemo(() => getFeaturesByCategory(user, 'management'), [user]);
  const analyticsFeatures = useMemo(() => getFeaturesByCategory(user, 'analytics'), [user]);
  const systemFeatures = useMemo(() => getFeaturesByCategory(user, 'system'), [user]);
  const moderationFeatures = useMemo(() => getFeaturesByCategory(user, 'moderation'), [user]);
  
  const quickActions = useMemo(() => getQuickActions(user), [user]);
  const dashboardSections = useMemo(() => getAvailableDashboardSections(user), [user]);
  const navigationItems = useMemo(() => getAvailableNavigationItems(user), [user]);
  const roleSpecificMetrics = useMemo(() => getRoleSpecificMetrics(user), [user]);
  
  const canAccessDashboard = useMemo(() => canAccessAdminDashboard(user), [user]);
  const canPublishDirectlyPermission = useMemo(() => canPublishDirectly(user), [user]);
  const needsReview = useMemo(() => needsReviewProcess(user), [user]);
  const canBulkOperations = useMemo(() => canPerformBulkOperations(user), [user]);
  const canAccessLogs = useMemo(() => canAccessSystemLogs(user), [user]);
  const canManageUsersPermission = useMemo(() => canManageUsers(user), [user]);
  const canSendInvitationsPermission = useMemo(() => canSendInvitations(user), [user]);
  
  const dashboardTitle = useMemo(() => getDashboardTitle(user), [user]);
  const dashboardDescription = useMemo(() => getDashboardDescription(user), [user]);
  const dashboardRedirectUrl = useMemo(() => getDashboardRedirectUrl(user), [user]);
  const articleCreationLimit = useMemo(() => getArticleCreationLimit(user), [user]);
  
  return {
    // User info
    user,
    userRole,
    isAuthenticated,
    
    // Feature access checks
    hasFeature: (featureId: string) => hasFeatureAccess(user, featureId),
    hasDashboardSection: (sectionId: string) => hasDashboardSectionAccess(user, sectionId),
    hasNavigation: (navigationId: string) => hasNavigationAccess(user, navigationId),
    hasMinRole: (minimumRole: UserRole) => hasMinimumRole(user, minimumRole),
    isFeatureEnabled: (featureId: string) => isFeatureEnabled(user, featureId),
    
    // Feature collections
    availableFeatures,
    contentFeatures,
    managementFeatures,
    analyticsFeatures,
    systemFeatures,
    moderationFeatures,
    quickActions,
    dashboardSections,
    navigationItems,
    roleSpecificMetrics,
    
    // Specific permissions
    canAccessDashboard,
    canEditArticle: (articleAuthorId?: string) => canEditArticle(user, articleAuthorId),
    canPublishDirectly: canPublishDirectlyPermission,
    needsReview,
    canBulkOperations,
    canAccessLogs,
    canManageUsers: canManageUsersPermission,
    canSendInvitations: canSendInvitationsPermission,
    
    // UI helpers
    dashboardTitle,
    dashboardDescription,
    dashboardRedirectUrl,
    articleCreationLimit
  };
}

/**
 * Hook for checking a specific feature access
 */
export function useFeatureAccess(featureId: string): boolean {
  const { user } = useAuth();
  return useMemo(() => hasFeatureAccess(user, featureId), [user, featureId]);
}

/**
 * Hook for checking minimum role requirement
 */
export function useMinimumRole(minimumRole: UserRole): boolean {
  const { user } = useAuth();
  return useMemo(() => hasMinimumRole(user, minimumRole), [user, minimumRole]);
}

/**
 * Hook for getting user's role
 */
export function useUserRole(): UserRole {
  const { user } = useAuth();
  return useMemo(() => getUserRole(user), [user]);
}

/**
 * Hook for dashboard access check
 */
export function useDashboardAccess(): boolean {
  const { user } = useAuth();
  return useMemo(() => canAccessAdminDashboard(user), [user]);
}

/**
 * Hook for article editing permissions
 */
export function useArticleEditAccess(articleAuthorId?: string): boolean {
  const { user } = useAuth();
  return useMemo(() => canEditArticle(user, articleAuthorId), [user, articleAuthorId]);
}