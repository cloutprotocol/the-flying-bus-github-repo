
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
      display_name: data.display_name,
      email: data.email,
      role: data.role,
      bio: data.bio || '',
      avatar_url: data.avatar_url || '',
      created_at: data.created_at,
      updated_at: data.updated_at,
      public_bio: data.public_bio,
      crypto_wallet_address: data.crypto_wallet_address,
      badge_display_preferences: data.badge_display_preferences,
      favorite_categories: data.favorite_categories,
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
