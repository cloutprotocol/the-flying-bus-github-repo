
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { createAuthResponse } from './authErrors';
import type { AuthResponse } from '@/types/auth/AuthTypes';

export async function loginWithEmailPassword(
  email: string, 
  password: string
): Promise<AuthResponse> {
  try {
    logger.info(LogSource.AUTH, 'Attempting to login with email/password');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return createAuthResponse(false, error);
    }
    
    return { success: true, user: data?.user || null };
  } catch (error) {
    return createAuthResponse(false, error);
  }
}

export async function logoutUser(): Promise<AuthResponse> {
  try {
    logger.info(LogSource.AUTH, 'Attempting to log out user');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return createAuthResponse(false, error);
    }
    
    return { success: true };
  } catch (error) {
    return createAuthResponse(false, error);
  }
}

export async function getCurrentSession() {
  try {
    return await supabase.auth.getSession();
  } catch (error) {
    logger.error(LogSource.AUTH, 'Exception getting session', error);
    return { data: { session: null } };
  }
}
