import { supabase } from '@/integrations/supabase/client';
import { ReaderProfile } from '@/types/ReaderProfile';
import { AuthResponse } from '@/types/auth/AuthTypes';
import { createAuthResponse } from './authErrors';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { fetchUserProfile } from './profileService';

/**
 * Login with email and password
 */
export async function loginWithEmailPassword(email: string, password: string) {
  try {
    logger.info(LogSource.AUTH, 'Attempting login', { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      logger.error(LogSource.AUTH, 'Login failed', error);
      return { error };
    }
    
    logger.info(LogSource.AUTH, 'Login successful', { userId: data.user?.id });
    
    return { session: data.session, user: data.user };
  } catch (error) {
    logger.error(LogSource.AUTH, 'Login exception', error);
    return { error };
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string, 
  password: string, 
  username: string, 
  displayName: string
): Promise<AuthResponse> {
  try {
    logger.info(LogSource.AUTH, 'Registering new user', { email, username });
    
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName
        }
      }
    });
    
    if (error) {
      logger.error(LogSource.AUTH, 'Registration failed', error);
      return createAuthResponse(false, error);
    }
    
    if (!data.user) {
      logger.error(LogSource.AUTH, 'Registration failed - no user returned');
      return createAuthResponse(false, new Error('Registration failed'));
    }
    
    // Create the user profile with only existing columns
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      username,
      display_name: displayName,
      email,
      role: 'reader',
      avatar_url: '',
      bio: ''
    });
    
    if (profileError) {
      logger.error(LogSource.AUTH, 'Profile creation failed', profileError);
      return createAuthResponse(false, profileError);
    }
    
    logger.info(LogSource.AUTH, 'User registered successfully', { userId: data.user.id });
    
    // Get complete user profile
    const profile = await fetchUserProfile(data.user.id);
    
    return { 
      success: true,
      user: profile || undefined
    };
  } catch (error) {
    logger.error(LogSource.AUTH, 'Registration exception', error);
    return createAuthResponse(false, error);
  }
}

/**
 * Log out the current user
 */
export async function logoutUser() {
  try {
    logger.info(LogSource.AUTH, 'Logging out user');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      logger.error(LogSource.AUTH, 'Logout failed', error);
      return { error };
    }
    
    logger.info(LogSource.AUTH, 'Logout successful');
    
    return { success: true };
  } catch (error) {
    logger.error(LogSource.AUTH, 'Logout exception', error);
    return { error };
  }
}

/**
 * Reset user password
 */
export async function resetPassword(email: string) {
  try {
    logger.info(LogSource.AUTH, 'Password reset requested', { email });
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      logger.error(LogSource.AUTH, 'Password reset failed', error);
      return { error };
    }
    
    logger.info(LogSource.AUTH, 'Password reset email sent', { email });
    
    return { success: true };
  } catch (error) {
    logger.error(LogSource.AUTH, 'Password reset exception', error);
    return { error };
  }
}

/**
 * Update current user password
 */
export async function updatePassword(newPassword: string) {
  try {
    logger.info(LogSource.AUTH, 'Updating password');
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      logger.error(LogSource.AUTH, 'Password update failed', error);
      return { error };
    }
    
    logger.info(LogSource.AUTH, 'Password updated successfully');
    
    return { success: true };
  } catch (error) {
    logger.error(LogSource.AUTH, 'Password update exception', error);
    return { error };
  }
}
