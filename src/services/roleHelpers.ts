import { ReaderProfile } from '@/types/ReaderProfile';

export function hasAuthorPrivileges(user: ReaderProfile | null): boolean {
  if (!user) return false;
  return ['author', 'moderator', 'admin'].includes(user.role);
}

export function hasAdminPrivileges(user: ReaderProfile | null): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

export function hasModeratorPrivileges(user: ReaderProfile | null): boolean {
  if (!user) return false;
  return ['moderator', 'admin'].includes(user.role);
}

export function canUpgradeRole(currentRole: string, targetRole: string): boolean {
  const roleHierarchy = { reader: 0, author: 1, moderator: 2, admin: 3 } as const;
  const currentLevel = (roleHierarchy as any)[currentRole] ?? -1;
  const targetLevel = (roleHierarchy as any)[targetRole] ?? -1;
  return targetLevel > currentLevel;
}

