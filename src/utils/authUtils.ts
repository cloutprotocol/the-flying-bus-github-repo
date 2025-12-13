
import { ReaderProfile } from '@/types/ReaderProfile';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

/**
 * Fetches user profile from Supabase or creates one if it doesn't exist
 */
export const fetchUserProfile = async (userId: string): Promise<ReaderProfile | null> => {
  try {
    console.log('Fetching profile for user ID:', userId);
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const profile: any = await convex.query(api.profiles.getById, { profileId: userId as any as Id<'profiles'> });
    if (profile) {
      const userProfile: ReaderProfile = {
        id: profile._id,
        username: profile.username || '',
        display_name: profile.display_name || '',
        email: profile.email,
        role: profile.role,
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        created_at: profile.created_at,
      };
      return userProfile;
    }
    return null;
  } catch (error) {
    console.error('Profile fetch error:', error);
    return null;
  }
};

/**
 * Checks if user has access based on allowed roles
 */
export const checkRoleAccess = (currentUser: ReaderProfile | null, allowedRoles: string[]): boolean => {
  if (!currentUser) return false;
  return allowedRoles.includes(currentUser.role);
};
