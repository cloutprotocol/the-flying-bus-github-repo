import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { RegistrationErrorContext } from '@/types/RegistrationErrorTypes';
import { ReaderProfile } from '@/types/ReaderProfile';

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
 * @deprecated Valid registration flow should use useAuthActions() and Convex mutations.
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

    // Deprecated path: use AuthProvider.register (Convex) instead.
    logger.warn(LogSource.AUTH, 'coordinateStandardRegistration is deprecated; use Convex Auth');
    return {
      success: false,
      error: {
        message: 'Deprecated: Use Convex Auth (AuthProvider.register)',
        code: 'DEPRECATED',
      },
    };
  }

  /**
   * Coordinate invitation-based author registration with enhanced role assignment
   */
  async coordinateInvitationRegistration(
    data: InvitationRegistrationData
  ): Promise<RegistrationFlowResult> {
    logger.warn(LogSource.AUTH, 'coordinateInvitationRegistration is deprecated; use Convex Auth');
    return {
      success: false,
      error: {
        message: 'Deprecated: Use Convex Auth (AuthProvider.register/registerWithInvitation)',
        code: 'DEPRECATED',
      },
    };
  }
}

// Export singleton instance
export const registrationFlowCoordinator = new RegistrationFlowCoordinator();
