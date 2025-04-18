
import { supabase } from '@/integrations/supabase/client';
import { ReaderProfile } from '@/types/ReaderProfile';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { createAuthResponse } from './authErrors';

export async function fetchUserProfile(userId: string): Promise<ReaderProfile | null> {
  try {
    logger.info(LogSource.AUTH, 'Fetching user profile', { userId });
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      logger.error(LogSource.AUTH, 'Error fetching user profile', error);
      return null;
    }
    
    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      email: data.email,
      role: data.role,
      bio: data.bio || '',
      avatar: data.avatar_url || '',
      joinedDate: new Date(data.created_at),
      badges: [],
      readingStreak: 0,
      commentCount: 0,
      achievements: []
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
