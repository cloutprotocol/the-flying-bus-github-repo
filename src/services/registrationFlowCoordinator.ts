import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { type ProfileCreationData } from './rlsPolicyManager';
import { registrationErrorHandler } from './registrationErrorHandler';
import { RegistrationErrorContext } from '@/types/RegistrationErrorTypes';
import { ReaderProfile } from '@/types/ReaderProfile';
import { validateInvitationToken } from './invitationService';
import { 
  assignAuthorRoleFromInvitation, 
  validateRoleAssignment,
  RoleValidationContext 
} from './roleService';

/**
 * Registration flow types and interfaces
 */
export interface StandardRegistrationData {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface InvitationRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  invitationToken: string;
}

export interface RegistrationFlowResult {
  success: boolean;
  user?: ReaderProfile;
  session?: any;
  error?: {
    message: string;
    code: string;
    technicalDetails?: string;
  };
  roleAssignmentResult?: {
    success: boolean;
    auditLog?: string;
    error?: string;
  };
}

/**
 * Registration Flow Coordinator Service
 * 
 * Orchestrates complete registration processes for both standard and invitation flows.
 * Uses simplified error handling without complex transaction rollback mechanisms.
 */
export class RegistrationFlowCoordinator {

  /**
   * Coordinate standard user registration with auto-login
   */
  async coordinateStandardRegistration(
    data: StandardRegistrationData
  ): Promise<RegistrationFlowResult> {
    const context: RegistrationErrorContext = {
      email: data.email,
      registrationType: 'standard',
      timestamp: new Date().toISOString()
    };

    try {
      logger.info(LogSource.AUTH, 'Starting standard registration', {
        email: data.email,
        username: data.username
      });

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            display_name: data.displayName
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User registration failed - no user data returned');
      }

      const { user, session } = authData;

      // Wait for automatic profile creation by database trigger
      let profile: any = null;
      let retryCount = 0;
      const maxRetries = 5;
      
      while (retryCount < maxRetries && !profile) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (existingProfile) {
          profile = existingProfile;
          logger.info(LogSource.AUTH, 'Profile found from database trigger', {
            userId: user.id,
            username: existingProfile.username
          });
          break;
        }

        retryCount++;
        if (retryCount < maxRetries) {
          logger.info(LogSource.AUTH, `Profile not found, retrying (${retryCount}/${maxRetries})`, {
            userId: user.id
          });
          await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
        }
      }

      // If profile still doesn't exist, attempt manual creation
      if (!profile) {
        logger.info(LogSource.AUTH, 'Creating profile manually', { userId: user.id });

        const profileData: ProfileCreationData = {
          id: user.id,
          email: data.email,
          username: data.username,
          display_name: data.displayName,
          role: 'reader'
        };

        const { data: profileResult, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();
        
        if (profileError) {
          logger.error(LogSource.AUTH, 'Manual profile creation failed', { 
            error: profileError.message,
            userId: user.id
          });
          // Don't throw here - user account was created successfully
          // Profile creation can be handled later
        } else {
          profile = profileResult;
          logger.info(LogSource.AUTH, 'Manual profile created successfully', { 
            userId: user.id,
            username: data.username
          });
        }
      }

      // Email confirmation is automatically handled by database trigger
      // Users get instant access to their account with active session
      logger.info(LogSource.AUTH, 'Registration completed with instant access', { 
        userId: user.id,
        hasSession: !!session,
        emailConfirmed: !!user.email_confirmed_at
      });

      logger.info(LogSource.AUTH, 'Standard registration completed successfully', {
        userId: user.id,
        hasProfile: !!profile,
        hasSession: !!session
      });

      return {
        success: true,
        user: profile,
        session: session
      };

    } catch (error) {
      logger.error(LogSource.AUTH, 'Standard registration failed', error);
      
      // Process error through registration error handler
      const errorResult = registrationErrorHandler.processError(error as Error, context);
      
      return {
        success: false,
        user: undefined,
        session: undefined,
        error: {
          message: errorResult?.userMessage || 'Registration failed',
          code: errorResult?.error?.code || 'REGISTRATION_FAILED',
          technicalDetails: errorResult?.error?.technicalDetails || (error as Error).message
        }
      };
    }
  }

  /**
   * Coordinate invitation-based author registration with enhanced role assignment
   */
  async coordinateInvitationRegistration(
    data: InvitationRegistrationData
  ): Promise<RegistrationFlowResult> {
    const context: RegistrationErrorContext = {
      email: data.email,
      registrationType: 'invitation',
      invitationToken: data.invitationToken,
      timestamp: new Date().toISOString()
    };

    let userId: string | null = null;
    let rollbackRequired = false;

    try {
      logger.info(LogSource.AUTH, 'Starting invitation registration with enhanced role assignment', {
        email: data.email,
        invitationToken: data.invitationToken
      });

      // Validate invitation token using the same logic as invitationService
      const tokenValidation = await validateInvitationToken(data.invitationToken, data.email);
      
      if (tokenValidation.error) {
        throw new Error(tokenValidation.error);
      }

      const tokenData = tokenValidation.data;

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            invitation_token: data.invitationToken
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User registration failed - no user data returned');
      }

      const { user, session } = authData;
      userId = user.id;
      rollbackRequired = true; // Mark that we may need rollback from this point

      // Wait for automatic profile creation by database trigger
      let profile: any = null;
      let retryCount = 0;
      const maxRetries = 5;
      
      while (retryCount < maxRetries && !profile) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (existingProfile) {
          profile = existingProfile;
          logger.info(LogSource.AUTH, 'Profile found from database trigger', {
            userId: user.id,
            role: existingProfile.role,
            username: existingProfile.username
          });
          break;
        }

        retryCount++;
        if (retryCount < maxRetries) {
          logger.info(LogSource.AUTH, `Profile not found, retrying (${retryCount}/${maxRetries})`, {
            userId: user.id
          });
          await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
        }
      }

      // If profile still doesn't exist, attempt manual creation
      if (!profile) {
        logger.info(LogSource.AUTH, 'Creating profile manually', { userId: user.id });

        const profileData: ProfileCreationData = {
          id: user.id,
          email: data.email,
          username: `${data.firstName.toLowerCase()}_${data.lastName.toLowerCase()}`,
          display_name: `${data.firstName} ${data.lastName}`,
          role: 'reader' // Start with reader, will be upgraded by role service
        };

        const { data: profileResult, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();
        
        if (profileError) {
          logger.error(LogSource.AUTH, 'Manual profile creation failed', { 
            error: profileError.message,
            userId: user.id
          });
          throw new Error(`Profile creation failed: ${profileError.message}`);
        }

        profile = profileResult;
        logger.info(LogSource.AUTH, 'Manual profile created successfully', { 
          userId: user.id,
          role: profile.role
        });
      }

      // Mark invitation token as used BEFORE role assignment
      try {
        await supabase
          .from('invitation_tokens')
          .update({
            used_at: new Date().toISOString(),
            used_by: user.id
          })
          .eq('id', tokenData.id);
        
        logger.info(LogSource.AUTH, 'Invitation token marked as used', {
          tokenId: tokenData.id,
          userId: user.id
        });
      } catch (tokenUpdateError) {
        logger.error(LogSource.AUTH, 'Failed to mark invitation token as used', {
          error: (tokenUpdateError as Error).message,
          tokenId: tokenData.id,
          userId: user.id
        });
        throw new Error(`Token update failed: ${(tokenUpdateError as Error).message}`);
      }

      // Use enhanced role assignment service
      const roleContext: RoleValidationContext = {
        registrationType: 'invitation',
        userId: user.id,
        email: data.email,
        invitationToken: data.invitationToken,
        invitationId: tokenData.id,
        reason: 'invitation_registration'
      };

      logger.info(LogSource.AUTH, 'Assigning author role using enhanced service', {
        userId: user.id,
        currentRole: profile.role
      });

      const roleAssignmentResult = await assignAuthorRoleFromInvitation(user.id, roleContext);

      if (!roleAssignmentResult.success) {
        logger.error(LogSource.AUTH, 'Role assignment failed', {
          userId: user.id,
          error: roleAssignmentResult.error
        });
        
        // Don't fail the entire registration - user account was created successfully
        // Log the issue and continue
        logger.warn(LogSource.AUTH, 'Continuing with registration despite role assignment failure', {
          userId: user.id,
          currentRole: profile.role
        });
      } else {
        profile = roleAssignmentResult.user || profile;
        logger.info(LogSource.AUTH, 'Role assignment completed successfully', {
          userId: user.id,
          newRole: profile.role,
          auditLog: roleAssignmentResult.auditLog
        });
      }

      // Validate role assignment was successful
      const roleValidationPassed = await validateRoleAssignment(user.id);
      if (!roleValidationPassed) {
        logger.warn(LogSource.AUTH, 'Role validation failed after assignment', {
          userId: user.id,
          currentRole: profile.role
        });
      }

      logger.info(LogSource.AUTH, 'Invitation registration completed successfully', {
        userId: user.id,
        hasProfile: !!profile,
        hasSession: !!session,
        finalRole: profile.role,
        roleAssignmentSuccess: roleAssignmentResult.success,
        roleValidationPassed
      });

      return {
        success: true,
        user: profile,
        session: session,
        roleAssignmentResult: {
          success: roleAssignmentResult.success,
          auditLog: roleAssignmentResult.auditLog,
          error: roleAssignmentResult.error
        }
      };

    } catch (error) {
      logger.error(LogSource.AUTH, 'Invitation registration failed', {
        error: (error as Error).message,
        userId,
        rollbackRequired
      });

      // Implement rollback mechanism if user was created but registration failed
      if (rollbackRequired && userId) {
        await this.rollbackFailedRegistration(userId, data.email);
      }
      
      // Process error through registration error handler
      const errorResult = registrationErrorHandler.processError(error as Error, context);
      
      return {
        success: false,
        user: undefined,
        session: undefined,
        error: {
          message: errorResult?.userMessage || 'Invitation registration failed',
          code: errorResult?.error?.code || 'INVITATION_REGISTRATION_FAILED',
          technicalDetails: errorResult?.error?.technicalDetails || (error as Error).message
        }
      };
    }
  }

  /**
   * Rollback mechanism for failed registrations
   */
  private async rollbackFailedRegistration(userId: string, email: string): Promise<void> {
    try {
      logger.info(LogSource.AUTH, 'Starting registration rollback', { userId, email });

      // Remove profile if it was created
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileDeleteError) {
        logger.error(LogSource.AUTH, 'Failed to delete profile during rollback', {
          userId,
          error: profileDeleteError.message
        });
      } else {
        logger.info(LogSource.AUTH, 'Profile deleted during rollback', { userId });
      }

      // Note: We cannot delete the auth user via client SDK
      // This would need to be handled by admin functions if required
      logger.warn(LogSource.AUTH, 'Auth user cannot be deleted via client SDK', { userId });

      // Reset invitation token if it was marked as used
      const { error: tokenResetError } = await supabase
        .from('invitation_tokens')
        .update({
          used_at: null,
          used_by: null
        })
        .eq('used_by', userId);

      if (tokenResetError) {
        logger.error(LogSource.AUTH, 'Failed to reset invitation token during rollback', {
          userId,
          error: tokenResetError.message
        });
      } else {
        logger.info(LogSource.AUTH, 'Invitation token reset during rollback', { userId });
      }

      logger.info(LogSource.AUTH, 'Registration rollback completed', { userId });

    } catch (rollbackError) {
      logger.error(LogSource.AUTH, 'Rollback failed', {
        userId,
        error: (rollbackError as Error).message
      });
    }
  }


}

// Export singleton instance
export const registrationFlowCoordinator = new RegistrationFlowCoordinator();