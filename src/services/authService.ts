
import { ReaderProfile } from '@/types/ReaderProfile';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { profileConvexService } from '@/services/convex/profileConvexService';

export async function fetchUserProfile(userId: string): Promise<ReaderProfile | null> {
  try {
    logger.info(LogSource.AUTH, 'Fetching user profile', { userId });
    
    const { profile, error } = await profileConvexService.getById(userId);
    if (error || !profile) {
      logger.error(LogSource.AUTH, 'Error fetching user profile', error);
      return null;
    }
    return {
      id: profile._id,
      username: profile.username || '',
      display_name: profile.display_name || '',
      email: profile.email,
      role: profile.role as any,
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      public_bio: profile.public_bio,
      crypto_wallet_address: profile.crypto_wallet_address,
      badge_display_preferences: profile.badge_display_preferences,
      favorite_categories: profile.favorite_categories || undefined,
    } as ReaderProfile;
  } catch (e) {
    logger.error(LogSource.AUTH, 'Exception fetching user profile', e);
    return null;
  }
}

export async function checkRoleAccess(
  userProfile: ReaderProfile | null, 
  allowedRoles: string[]
): Promise<boolean> {
  if (!userProfile) return false;
  return allowedRoles.includes(userProfile.role);
}

export async function loginWithEmailPassword(
  email: string, 
  password: string
): Promise<{ session: any; error: any }> {
  logger.warn(LogSource.AUTH, 'Deprecated loginWithEmailPassword. Use useAuthActions().signIn("password", ...)');
  return { session: null, error: new Error('Use Convex Auth via useAuthActions()') };
}

export async function logoutUser(): Promise<{ error: any }> {
  logger.warn(LogSource.AUTH, 'Deprecated logoutUser. Use useAuthActions().signOut()');
  return { error: new Error('Use Convex Auth via useAuthActions()') };
}

export async function getCurrentSession() {
  logger.warn(LogSource.AUTH, 'Deprecated getCurrentSession. Use useConvexAuth()');
  return { data: { session: null } } as any;
}
