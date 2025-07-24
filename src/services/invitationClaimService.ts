import { supabase } from '@/integrations/supabase/client';
import { invitationTokenService } from './invitationTokenService';
import { EmailNotificationService } from './emailNotificationService';
import { invitationSecurityService } from './invitationSecurityService';
import { invitationErrorHandler } from './invitationErrorHandler';
import { 
  ClaimResult, 
  InvitationData, 
  InvitationError,
  InvitationClaimFormData,
  TokenValidationResponse
} from '@/types/InvitationWorkflowTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Service for processing invitation claims and account creation
 * Handles token validation, account upgrades, new account creation, and invitation linking
 */
export class InvitationClaimService {

  /**
   * Validate token and get invitation data for claim page with security checks
   * Requirements: 3.1, 6.2, 6.1, 6.3, 6.4, 6.5
   */
  async validateTokenForClaim(token: string, ipAddress?: string): Promise<{ data?: TokenValidationResponse; error?: InvitationError }> {
    try {
      logger.info(LogSource.AUTH, 'Validating token for claim', { token: token.substring(0, 8) + '...' });

      // Security validations
      if (ipAddress) {
        // Check rate limiting
        const rateLimitCheck = await invitationSecurityService.checkTokenValidationRateLimit(ipAddress, token);
        if (!rateLimitCheck.allowed) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'token_validation_rate_limited',
            ipAddress,
            tokenHash: token ? this.hashToken(token) : undefined,
            details: { reason: rateLimitCheck.reason, remainingAttempts: rateLimitCheck.remainingAttempts },
            severity: 'medium'
          });

          return {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: rateLimitCheck.reason || 'Too many validation attempts',
              details: { resetTime: rateLimitCheck.resetTime }
            }
          };
        }

        // Check for replay attacks
        const replayCheck = await invitationSecurityService.checkReplayAttack(token, ipAddress);
        if (replayCheck.isReplay) {
          return {
            error: {
              code: 'REPLAY_ATTACK_DETECTED',
              message: replayCheck.reason || 'Suspicious request pattern detected'
            }
          };
        }

        // Check for suspicious activity
        const suspiciousCheck = await invitationSecurityService.checkSuspiciousActivity(ipAddress);
        if (suspiciousCheck.isSuspicious) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'suspicious_validation_attempt',
            ipAddress,
            tokenHash: this.hashToken(token),
            details: { riskScore: suspiciousCheck.riskScore, reasons: suspiciousCheck.reasons },
            severity: suspiciousCheck.riskScore >= 75 ? 'critical' : 'high'
          });
        }

        // Log validation attempt
        await invitationSecurityService.logSecurityEvent({
          eventType: 'token_validation_attempt',
          ipAddress,
          tokenHash: this.hashToken(token),
          details: { tokenPrefix: token.substring(0, 8) },
          severity: 'low'
        });
      }

      // Validate token integrity
      const integrityCheck = await invitationSecurityService.validateTokenIntegrity(token);
      if (!integrityCheck.valid) {
        if (ipAddress) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'token_integrity_violation',
            ipAddress,
            tokenHash: this.hashToken(token),
            details: { reason: integrityCheck.reason },
            severity: 'high'
          });
        }

        return {
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: integrityCheck.reason || 'Invalid token format'
          }
        };
      }

      const validation = await invitationTokenService.validateToken(token);
      
      if (validation.error) {
        if (ipAddress) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'token_validation_failed',
            ipAddress,
            tokenHash: this.hashToken(token),
            details: { error: validation.error },
            severity: 'medium'
          });
        }
        return { error: validation.error };
      }

      if (!validation.data?.isValid) {
        if (ipAddress) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'invalid_token_used',
            ipAddress,
            tokenHash: this.hashToken(token),
            details: { 
              invitationId: validation.data?.invitationId,
              expiresAt: validation.data?.expiresAt,
              usedAt: validation.data?.usedAt
            },
            severity: 'medium'
          });
        }

        return {
          data: {
            valid: false,
            error: 'Invalid or expired invitation token'
          }
        };
      }

      // Get additional invitation details
      const { data: invitationData, error: invitationError } = await supabase
        .from('invitation_requests')
        .select('id, parent_email, child_name, child_age, status')
        .eq('id', validation.data.invitationId!)
        .single();

      if (invitationError || !invitationData) {
        logger.error(LogSource.AUTH, 'Error fetching invitation details', invitationError);
        return {
          error: {
            code: 'INVITATION_FETCH_FAILED',
            message: 'Failed to fetch invitation details',
            details: invitationError
          }
        };
      }

      // Log successful validation
      if (ipAddress) {
        await invitationSecurityService.logSecurityEvent({
          eventType: 'token_validation_success',
          ipAddress,
          tokenHash: this.hashToken(token),
          invitationId: invitationData.id,
          details: { parentEmail: invitationData.parent_email },
          severity: 'low'
        });
      }

      return {
        data: {
          valid: true,
          invitation: {
            id: invitationData.id,
            parentEmail: invitationData.parent_email,
            childName: invitationData.child_name,
            childAge: invitationData.child_age
          }
        }
      };
    } catch (error) {
      const handledError = await invitationErrorHandler.handleError(error, {
        operation: 'validateTokenForClaim',
        invitationId: undefined,
        ipAddress,
        additionalData: { tokenPrefix: token.substring(0, 8) }
      });

      return { error: handledError };
    }
  }

  /**
   * Process invitation claim with comprehensive security validations
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 6.1, 6.3, 6.4
   */
  async claimInvitation(token: string, formData: InvitationClaimFormData, ipAddress?: string): Promise<{ data?: ClaimResult; error?: InvitationError }> {
    try {
      logger.info(LogSource.AUTH, 'Processing invitation claim', { 
        email: formData.email,
        token: token.substring(0, 8) + '...'
      });

      // Security validations
      if (ipAddress) {
        // Check claim rate limiting
        const rateLimitCheck = await invitationSecurityService.checkClaimRateLimit(ipAddress, formData.email);
        if (!rateLimitCheck.allowed) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'invitation_claim_rate_limited',
            ipAddress,
            email: formData.email,
            tokenHash: this.hashToken(token),
            details: { reason: rateLimitCheck.reason, remainingAttempts: rateLimitCheck.remainingAttempts },
            severity: 'medium'
          });

          return {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: rateLimitCheck.reason || 'Too many claim attempts',
              details: { resetTime: rateLimitCheck.resetTime }
            }
          };
        }

        // Log claim attempt
        await invitationSecurityService.logSecurityEvent({
          eventType: 'invitation_claim_attempt',
          ipAddress,
          email: formData.email,
          tokenHash: this.hashToken(token),
          details: { email: formData.email },
          severity: 'low'
        });
      }

      // First validate the token with security checks
      const tokenValidation = await this.validateTokenForClaim(token, ipAddress);
      if (tokenValidation.error || !tokenValidation.data?.valid) {
        if (ipAddress) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'invitation_claim_failed_validation',
            ipAddress,
            email: formData.email,
            tokenHash: this.hashToken(token),
            details: { error: tokenValidation.error },
            severity: 'medium'
          });
        }

        return {
          error: tokenValidation.error || {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired invitation token'
          }
        };
      }

      const invitation = tokenValidation.data.invitation!;

      // Verify email matches the invitation
      if (formData.email.toLowerCase() !== invitation.parentEmail.toLowerCase()) {
        if (ipAddress) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'invitation_claim_email_mismatch',
            ipAddress,
            email: formData.email,
            tokenHash: this.hashToken(token),
            invitationId: invitation.id,
            details: { 
              providedEmail: formData.email,
              expectedEmail: invitation.parentEmail
            },
            severity: 'high'
          });
        }

        return {
          error: {
            code: 'EMAIL_MISMATCH',
            message: 'Email address does not match the invitation'
          }
        };
      }

      // Check email ownership for account upgrades
      if (ipAddress) {
        const emailVerification = await invitationSecurityService.verifyEmailOwnership(formData.email, token);
        if (emailVerification.requiresVerification && !emailVerification.verified) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'invitation_claim_email_verification_required',
            ipAddress,
            email: formData.email,
            tokenHash: this.hashToken(token),
            invitationId: invitation.id,
            details: { reason: emailVerification.reason },
            severity: 'medium'
          });

          // For now, we'll log this but not block the claim
          // In a production system, you might want to require email verification
          logger.warn(LogSource.AUTH, 'Email verification recommended but not enforced', {
            email: formData.email,
            reason: emailVerification.reason
          });
        }
      }

      // Check if user already exists
      const existingUser = await this.checkExistingUser(formData.email);
      
      let claimResult: ClaimResult;
      
      if (existingUser.exists) {
        // Upgrade existing user
        claimResult = await this.upgradeExistingUser(existingUser.userId!, invitation.id);
      } else {
        // Create new user account
        claimResult = await this.createNewAuthorAccount({
          invitationId: invitation.id,
          parentEmail: invitation.parentEmail,
          childName: invitation.childName,
          childAge: invitation.childAge
        }, formData);
      }

      if (!claimResult.success) {
        if (ipAddress) {
          await invitationSecurityService.logSecurityEvent({
            eventType: 'invitation_claim_processing_failed',
            ipAddress,
            email: formData.email,
            tokenHash: this.hashToken(token),
            invitationId: invitation.id,
            details: { error: claimResult.error, isNewUser: existingUser.exists ? false : true },
            severity: 'high'
          });
        }

        return {
          error: {
            code: 'CLAIM_PROCESSING_FAILED',
            message: claimResult.error || 'Failed to process invitation claim'
          }
        };
      }

      // Mark token as used and link invitation to user
      const tokenResult = await invitationTokenService.markTokenAsUsed(token, claimResult.userId!);
      if (!tokenResult.success) {
        logger.error(LogSource.AUTH, 'Failed to mark token as used', tokenResult.error);
        // Don't fail the entire operation, but log the issue
      }

      // Link invitation to user
      await this.linkInvitationToUser(invitation.id, claimResult.userId!);

      // Send welcome email
      try {
        await EmailNotificationService.sendWelcomeEmail(invitation.id, claimResult.userId!);
      } catch (emailError) {
        logger.error(LogSource.AUTH, 'Failed to send welcome email', emailError);
        // Don't fail the claim process for email issues
      }

      // Notify admins of new author registration
      try {
        const { AdminNotificationService } = await import('./adminNotificationService');
        await AdminNotificationService.notifyNewAuthorRegistration(
          invitation.id,
          claimResult.userId!,
          invitation.childName,
          invitation.parentEmail
        );
      } catch (notificationError) {
        logger.error(LogSource.AUTH, 'Failed to send admin notification for new author', notificationError);
        // Don't fail the claim process for notification issues
      }

      // Log successful claim
      if (ipAddress) {
        await invitationSecurityService.logSecurityEvent({
          eventType: 'invitation_claim_success',
          ipAddress,
          email: formData.email,
          tokenHash: this.hashToken(token),
          userId: claimResult.userId!,
          invitationId: invitation.id,
          details: { 
            isNewUser: claimResult.isNewUser,
            childName: invitation.childName
          },
          severity: 'low'
        });
      }

      logger.info(LogSource.AUTH, 'Invitation claim processed successfully', {
        userId: claimResult.userId,
        invitationId: invitation.id,
        isNewUser: claimResult.isNewUser
      });

      return { data: claimResult };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception processing invitation claim', error);
      
      if (ipAddress) {
        await invitationSecurityService.logSecurityEvent({
          eventType: 'invitation_claim_exception',
          ipAddress,
          email: formData.email,
          tokenHash: token ? this.hashToken(token) : undefined,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          severity: 'critical'
        });
      }

      return {
        error: {
          code: 'CLAIM_PROCESSING_EXCEPTION',
          message: 'Exception occurred while processing invitation claim',
          details: error
        }
      };
    }
  }

  /**
   * Check if a user already exists with the given email
   * Requirements: 3.2
   */
  private async checkExistingUser(email: string): Promise<{ exists: boolean; userId?: string }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error(LogSource.AUTH, 'Error checking existing user', error);
        return { exists: false };
      }

      return {
        exists: !!data,
        userId: data?.id
      };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception checking existing user', error);
      return { exists: false };
    }
  }

  /**
   * Upgrade existing user account to author role
   * Requirements: 3.2, 3.4
   */
  async upgradeExistingUser(userId: string, invitationId: string): Promise<ClaimResult> {
    try {
      logger.info(LogSource.AUTH, 'Upgrading existing user to author', { userId, invitationId });

      // Update user role to author
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'author',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        logger.error(LogSource.AUTH, 'Error upgrading user role', updateError);
        return {
          success: false,
          error: 'Failed to upgrade user account to author role'
        };
      }

      return {
        success: true,
        userId,
        isNewUser: false
      };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception upgrading existing user', error);
      return {
        success: false,
        error: 'Exception occurred while upgrading user account'
      };
    }
  }

  /**
   * Create new author account for first-time users
   * Requirements: 3.3, 3.4
   */
  async createNewAuthorAccount(invitationData: InvitationData, formData: InvitationClaimFormData): Promise<ClaimResult> {
    try {
      logger.info(LogSource.AUTH, 'Creating new author account', { 
        email: invitationData.parentEmail,
        childName: invitationData.childName
      });

      // Create auth user if password provided (new signup)
      let authUserId: string | undefined;
      
      if (formData.password) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: invitationData.parentEmail,
          password: formData.password,
          options: {
            data: {
              display_name: formData.displayName,
              username: formData.username
            }
          }
        });

        if (authError) {
          logger.error(LogSource.AUTH, 'Error creating auth user', authError);
          return {
            success: false,
            error: 'Failed to create user account: ' + authError.message
          };
        }

        authUserId = authData.user?.id;
      }

      // Create profile record
      const profileData = {
        id: authUserId, // Will be null if no auth user created
        email: invitationData.parentEmail.toLowerCase(),
        display_name: formData.displayName,
        username: formData.username,
        role: 'author',
        bio: `Parent of ${invitationData.childName}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select('id')
        .single();

      if (profileError) {
        logger.error(LogSource.AUTH, 'Error creating user profile', profileError);
        return {
          success: false,
          error: 'Failed to create user profile: ' + profileError.message
        };
      }

      const userId = profileResult.id;

      logger.info(LogSource.AUTH, 'New author account created successfully', { userId });

      return {
        success: true,
        userId,
        isNewUser: true
      };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception creating new author account', error);
      return {
        success: false,
        error: 'Exception occurred while creating new author account'
      };
    }
  }

  /**
   * Link invitation to user account after successful claim
   * Requirements: 3.4, 3.6
   */
  async linkInvitationToUser(invitationId: string, userId: string): Promise<{ success: boolean; error?: InvitationError }> {
    try {
      logger.info(LogSource.AUTH, 'Linking invitation to user', { invitationId, userId });

      const { error } = await supabase
        .from('invitation_requests')
        .update({
          child_user_id: userId,
          invitation_claimed_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) {
        logger.error(LogSource.AUTH, 'Error linking invitation to user', error);
        return {
          success: false,
          error: {
            code: 'INVITATION_LINK_FAILED',
            message: 'Failed to link invitation to user account',
            details: error
          }
        };
      }

      return { success: true };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception linking invitation to user', error);
      return {
        success: false,
        error: {
          code: 'INVITATION_LINK_EXCEPTION',
          message: 'Exception occurred while linking invitation to user',
          details: error
        }
      };
    }
  }

  /**
   * Get invitation details for a claimed invitation (admin functionality)
   * Requirements: 4.1, 4.2
   */
  async getClaimedInvitationDetails(invitationId: string): Promise<{
    data?: {
      invitation: any;
      user: any;
      claimedAt: string;
    };
    error?: InvitationError;
  }> {
    try {
      const { data, error } = await supabase
        .from('invitation_requests')
        .select(`
          *,
          user:profiles!child_user_id(
            id,
            display_name,
            username,
            email,
            role,
            created_at
          )
        `)
        .eq('id', invitationId)
        .not('child_user_id', 'is', null)
        .single();

      if (error) {
        logger.error(LogSource.AUTH, 'Error fetching claimed invitation details', error);
        return {
          error: {
            code: 'CLAIMED_INVITATION_FETCH_FAILED',
            message: 'Failed to fetch claimed invitation details',
            details: error
          }
        };
      }

      return {
        data: {
          invitation: data,
          user: data.user,
          claimedAt: data.invitation_claimed_at
        }
      };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception fetching claimed invitation details', error);
      return {
        error: {
          code: 'CLAIMED_INVITATION_FETCH_EXCEPTION',
          message: 'Exception occurred while fetching claimed invitation details',
          details: error
        }
      };
    }
  }

  /**
   * Hash token for secure storage in logs
   * Requirements: 6.1, 6.3
   */
  private hashToken(token: string): string {
    // Use a simple hash for token identification in logs
    // This is not cryptographically secure but sufficient for logging
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get statistics for invitation claims (admin dashboard)
   * Requirements: 4.1
   */
  async getClaimStatistics(): Promise<{
    data?: {
      totalClaimed: number;
      claimedToday: number;
      claimedThisWeek: number;
      claimedThisMonth: number;
      averageClaimTime: number; // in hours
    };
    error?: InvitationError;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get claim statistics
      const { data: claimData, error: claimError } = await supabase
        .from('invitation_requests')
        .select('invitation_claimed_at, created_at')
        .not('invitation_claimed_at', 'is', null);

      if (claimError) {
        logger.error(LogSource.AUTH, 'Error fetching claim statistics', claimError);
        return {
          error: {
            code: 'CLAIM_STATS_FETCH_FAILED',
            message: 'Failed to fetch claim statistics',
            details: claimError
          }
        };
      }

      const totalClaimed = claimData.length;
      const claimedToday = claimData.filter(item => 
        new Date(item.invitation_claimed_at!) >= today
      ).length;
      const claimedThisWeek = claimData.filter(item => 
        new Date(item.invitation_claimed_at!) >= weekAgo
      ).length;
      const claimedThisMonth = claimData.filter(item => 
        new Date(item.invitation_claimed_at!) >= monthAgo
      ).length;

      // Calculate average claim time
      const claimTimes = claimData.map(item => {
        const created = new Date(item.created_at);
        const claimed = new Date(item.invitation_claimed_at!);
        return (claimed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
      });
      
      const averageClaimTime = claimTimes.length > 0 
        ? claimTimes.reduce((sum, time) => sum + time, 0) / claimTimes.length
        : 0;

      return {
        data: {
          totalClaimed,
          claimedToday,
          claimedThisWeek,
          claimedThisMonth,
          averageClaimTime
        }
      };
    } catch (error) {
      logger.error(LogSource.AUTH, 'Exception fetching claim statistics', error);
      return {
        error: {
          code: 'CLAIM_STATS_EXCEPTION',
          message: 'Exception occurred while fetching claim statistics',
          details: error
        }
      };
    }
  }
}

// Export a singleton instance
export const invitationClaimService = new InvitationClaimService();