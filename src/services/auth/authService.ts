import { ReaderProfile } from '@/types/ReaderProfile';
import { AuthResponse } from '@/types/auth/AuthTypes';
import { createAuthResponse } from './authErrors';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { fetchUserProfile } from './profileService';
import { registrationErrorHandler } from '@/services/registrationErrorHandler';
import { RegistrationErrorContext } from '@/types/RegistrationErrorTypes';
import { registrationFlowCoordinator } from '@/services/registrationFlowCoordinator';

/**
 * @deprecated Use useAuthActions() from @convex-dev/auth/react instead.
 * Login with email and password
 */
export async function loginWithEmailPassword(email: string, password: string) {
  logger.warn(LogSource.AUTH, 'loginWithEmailPassword is deprecated. Use useAuthActions().signIn("password", ...)');
  return { error: new Error('Deprecated: Use Convex Auth via useAuthActions()') } as any;
}

/**
 * @deprecated Use useAuthActions() from @convex-dev/auth/react instead.
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

    // Convex Auth establishes session automatically via provider

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
 * @deprecated Use useAuthActions() value from @convex-dev/auth/react instead.
 * Log out the current user
 */
export async function logoutUser() {
  logger.warn(LogSource.AUTH, 'logoutUser is deprecated. Use useAuthActions().signOut()');
  return { success: false } as any;
}

/**
 * Reset user password
 */
export async function resetPassword(email: string) {
  logger.warn(LogSource.AUTH, 'resetPassword is managed by Convex Auth flows');
  return { success: false } as any;
}

/**
 * @deprecated Valid invitations should be processed by Convex Actions directly.
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

    // Convex Auth establishes session automatically via provider

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
  logger.warn(LogSource.AUTH, 'updatePassword is managed by Convex Auth flows');
  return { success: false } as any;
}
