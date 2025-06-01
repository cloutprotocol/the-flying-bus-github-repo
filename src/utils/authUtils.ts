
import { ReaderProfile } from '@/types/ReaderProfile';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches user profile from Supabase or creates one if it doesn't exist
 */
export const fetchUserProfile = async (userId: string): Promise<ReaderProfile | null> => {
  try {
    console.log('Fetching profile for user ID:', userId);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No profile found, creating a new profile for user ID:', userId);
        
        // Get user email from auth.users
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting user data:', userError);
          return null;
        }
        
        // Create default display name from email
        const email = userData.user?.email || '';
        const username = email.split('@')[0];
        const displayName = username
          .split(/[._-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        
        // For testing purposes, set specific emails to have admin/moderator/author roles
        let assignedRole: 'reader' | 'author' | 'moderator' | 'admin' = 'reader';
        if (email.includes('admin')) {
          assignedRole = 'admin';
        } else if (email.includes('moderator')) {
          assignedRole = 'moderator';
        } else if (email.includes('author')) {
          assignedRole = 'author';
        }
        
        // Insert new profile
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: userId,
              username,
              display_name: displayName,
              email,
              role: assignedRole,
              avatar_url: '',
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating user profile:', insertError);
          return null;
        }
        
        console.log('New profile created successfully:', newProfile);
        
        // Return the newly created profile
        const userProfile: ReaderProfile = {
          id: newProfile.id,
          username: newProfile.username,
          display_name: newProfile.display_name,
          email: newProfile.email,
          role: newProfile.role,
          bio: newProfile.bio || '',
          avatar_url: newProfile.avatar_url || '',
          created_at: newProfile.created_at,
        };
        return userProfile;
      } else {
        console.error('Error fetching user profile:', error);
        return null;
      }
    }
    
    if (profile) {
      console.log('Profile found:', profile);
      const userProfile: ReaderProfile = {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        email: profile.email,
        role: profile.role,
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        created_at: profile.created_at,
      };
      return userProfile;
    }
    
    console.log('No profile found for user ID:', userId);
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
