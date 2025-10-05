import { supabase } from '@/integrations/supabase/client';
import { ReaderProfile } from '@/types/ReaderProfile';
import { AuthResponse } from '@/types/auth/AuthTypes';
import { createAuthResponse } from './authErrors';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { fetchUserProfile } from './profileService';
import { registrationErrorHandler } from '@/services/registrationErrorHandler';
import { RegistrationErrorContext } from '@/types/RegistrationErrorTypes';
import { rlsPolicyManager } from '@/services/rlsPolicyManager';
import { registrationFlowCoordinator } from '@/services/registrationFlowCoordinator';

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
 * Register a new user with automatic login and comprehensive error handling
 * Uses the registration flow coordinator for orchestrated registration process
 * with improved authentication context management
 */
export async function registerUser(
  email: string, 
  password: string, 
  username: string, 
  displayName: string
): Promise<AuthResponse> {
  try {
    logger.info(LogSource.AUTH, 'Registering new user with enhanced authentication context', { 
      email, 
      username 
    });
    
    // Use the registration flow coordinator for orchestrated registration
    const result = await registrationFlowCoordinator.coordinateStandardRegistration({
      email,
      password,
      username,
      displayName
    });

    if (!result.success) {
      logger.error(LogSource.AUTH, 'Registration coordination failed', result.error);
      
      return {
        success: false,
        user: undefined,
        session: undefined,
        error: {
          message: result.error?.message || 'Registration failed',
          code: result.error?.code || 'REGISTRATION_FAILED',
          technicalDetails: result.error?.technicalDetails
        }
      };
    }

    // Handle special case where registration succeeded but has an error (like email confirmation)
    if (result.success && result.error) {
      logger.info(LogSource.AUTH, 'Registration succeeded with email confirmation required', {
        userId: result.user?.id,
        errorCode: result.error.code
      });
      
      return {
        success: true,
        user: result.user,
        session: result.session,
        error: {
          message: result.error.message,
          code: result.error.code,
          technicalDetails: result.error.technicalDetails
        }
      };
    }

    // Ensure authentication context is properly established
    if (result.session) {
      logger.info(LogSource.AUTH, 'Registration successful with active session', { 
        userId: result.user?.id,
        sessionActive: !!result.session
      });
      
      // Verify the session is valid and authentication context is established
      try {
        const { data: sessionCheck } = await supabase.auth.getSession();
        if (sessionCheck?.session?.user?.id === result.user?.id) {
          logger.info(LogSource.AUTH, 'Authentication context verified after registration', {
            userId: result.user?.id
          });
        } else {
          logger.warn(LogSource.AUTH, 'Authentication context mismatch after registration', {
            expectedUserId: result.user?.id,
            actualUserId: sessionCheck?.session?.user?.id
          });
        }
      } catch (sessionError) {
        logger.warn(LogSource.AUTH, 'Could not verify authentication context', sessionError);
      }
    }

    logger.info(LogSource.AUTH, 'User registered and logged in successfully via coordinator', { 
      userId: result.user?.id,
      hasSession: !!result.session,
      hasProfile: !!result.user
    });
    
    return { 
      success: true,
      user: result.user,
      session: result.session
    };
  } catch (error) {
    logger.error(LogSource.AUTH, 'Registration exception', error);
    
    return {
      success: false,
      user: undefined,
      session: undefined,
      error: {
        message: 'An unexpected error occurred during registration',
        code: 'REGISTRATION_EXCEPTION',
        technicalDetails: error.message
      }
    };
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
 * Register user through invitation with comprehensive error handling
 * Uses the registration flow coordinator for orchestrated invitation registration
 * with improved authentication context management
 */
export async function registerUserWithInvitation(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  invitationToken: string
): Promise<AuthResponse> {
  try {
    logger.info(LogSource.AUTH, 'Registering user with invitation and enhanced authentication context', { 
      email, 
      invitationToken 
    });

    // Use the registration flow coordinator for orchestrated invitation registration
    const result = await registrationFlowCoordinator.coordinateInvitationRegistration({
      email,
      password,
      firstName,
      lastName,
      invitationToken
    });

    if (!result.success) {
      logger.error(LogSource.AUTH, 'Invitation registration coordination failed', result.error);
      
      return {
        success: false,
        user: undefined,
        session: undefined,
        error: {
          message: result.error?.message || 'Invitation registration failed',
          code: result.error?.code || 'INVITATION_REGISTRATION_FAILED',
          technicalDetails: result.error?.technicalDetails
        }
      };
    }

    // Ensure authentication context is properly established for invitation registration
    if (result.session) {
      logger.info(LogSource.AUTH, 'Invitation registration successful with active session', { 
        userId: result.user?.id,
        sessionActive: !!result.session,
        role: result.user?.role
      });
      
      // Verify the session is valid and authentication context is established
      try {
        const { data: sessionCheck } = await supabase.auth.getSession();
        if (sessionCheck?.session?.user?.id === result.user?.id) {
          logger.info(LogSource.AUTH, 'Authentication context verified after invitation registration', {
            userId: result.user?.id,
            role: result.user?.role
          });
        } else {
          logger.warn(LogSource.AUTH, 'Authentication context mismatch after invitation registration', {
            expectedUserId: result.user?.id,
            actualUserId: sessionCheck?.session?.user?.id
          });
        }
      } catch (sessionError) {
        logger.warn(LogSource.AUTH, 'Could not verify authentication context for invitation', sessionError);
      }
    }

    logger.info(LogSource.AUTH, 'User registered with invitation successfully via coordinator', { 
      userId: result.user?.id,
      hasSession: !!result.session,
      hasProfile: !!result.user,
      role: result.user?.role
    });

    return {
      success: true,
      user: result.user,
      session: result.session
    };
  } catch (error) {
    logger.error(LogSource.AUTH, 'Invitation registration exception', error);

    return {
      success: false,
      user: undefined,
      session: undefined,
      error: {
        message: 'An unexpected error occurred during invitation registration',
        code: 'INVITATION_REGISTRATION_EXCEPTION',
        technicalDetails: error.message
      }
    };
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
