import { ReaderProfile } from '@/types/ReaderProfile';
import { 
  hasAuthorPrivileges, 
  hasAdminPrivileges, 
  hasModeratorPrivileges,
} from '@/services/roleHelpers';

/**
 * Utility functions for role-based operations
 */

/**
 * Check if user can access admin features
 */
export function canAccessAdmin(user: ReaderProfile | null): boolean {
  return hasAdminPrivileges(user);
}

/**
 * Check if user can access moderator features
 */
export function canAccessModerator(user: ReaderProfile | null): boolean {
  return hasModeratorPrivileges(user);
}

/**
 * Check if user can access author features
 */
export function canAccessAuthor(user: ReaderProfile | null): boolean {
  return hasAuthorPrivileges(user);
}

/**
 * Get the appropriate dashboard URL for a user based on their role
 */
export function getDashboardUrl(user: ReaderProfile | null): string {
  if (!user) return '/';
  switch (user.role) {
    case 'admin': return '/admin/dashboard';
    case 'moderator': return '/admin/dashboard';
    case 'author': return '/admin/my-articles';
    default: return '/';
  }
}

/**
 * Check if user has permission to perform an action
 */
export function hasPermission(
  user: ReaderProfile | null, 
  requiredRole: 'reader' | 'author' | 'moderator' | 'admin'
): boolean {
  if (!user) return false;

  const roleHierarchy = {
    'reader': 0,
    'author': 1,
    'moderator': 2,
    'admin': 3
  };

  const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] ?? -1;
  const requiredLevel = roleHierarchy[requiredRole] ?? 999;

  return userLevel >= requiredLevel;
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames = {
    'reader': 'Reader',
    'author': 'Author',
    'moderator': 'Moderator',
    'admin': 'Administrator'
  };

  return roleNames[role as keyof typeof roleNames] || 'Unknown';
}

/**
 * Get role badge color for UI display
 */
export function getRoleBadgeColor(role: string): string {
  const roleColors = {
    'reader': 'bg-gray-100 text-gray-800',
    'author': 'bg-blue-100 text-blue-800',
    'moderator': 'bg-yellow-100 text-yellow-800',
    'admin': 'bg-red-100 text-red-800'
  };

  return roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800';
}
