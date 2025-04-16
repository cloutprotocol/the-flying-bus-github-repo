
import { ReaderProfile } from '@/types/ReaderProfile';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

/**
 * Fetches user profile from Supabase
 */
export const fetchUserProfile = async (userId: string): Promise<ReaderProfile | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    if (profile) {
      const userRole = profile.role as 'reader' | 'author' | 'moderator' | 'admin';
      const userProfile: ReaderProfile = {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        email: profile.email,
        role: userRole,
        bio: profile.bio || '',
        avatar: profile.avatar_url || '',
        joinedDate: new Date(profile.created_at),
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
