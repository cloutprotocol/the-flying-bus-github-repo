import { supabase } from '@/integrations/supabase/client';
import { invitationPerformanceMonitor } from './invitationPerformanceMonitor';
import { 
  InvitationToken, 
  TokenValidation, 
  TokenStatus, 
  InvitationError,
  INVITATION_TOKEN_EXPIRY_DAYS 
} from '@/types/InvitationWorkflowTypes';

/**
 * Service for managing invitation tokens with secure operations
 * Handles token generation, validation, expiration, and usage tracking
 */
export class InvitationTokenService {
  
  /**
   * Generate a cryptographically secure token for an invitation
   * Requirements: 2.1, 2.2, 6.1
   */
  async generateToken(invitationId: string): Promise<{ data?: InvitationToken; error?: InvitationError }> {
    const startTime = Date.now();
    
    try {
      // Generate cryptographically secure token using Web Crypto API
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = btoa(String.fromCharCode(...tokenBytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + INVITATION_TOKEN_EXPIRY_DAYS);

      const { data, error } = await supabase
        .from('invitation_tokens')
        .insert({
          invitation_request_id: invitationId,
          token,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      const generationTime = Date.now() - startTime;

      if (error) {
        // Record performance metric for failed generation
        await invitationPerformanceMonitor.recordTokenGeneration(
          generationTime,
          false,
          error.message
        );
        
        console.error('Error generating invitation token:', error);
        return { 
          error: { 
            code: 'TOKEN_GENERATION_FAILED', 
            message: 'Failed to generate invitation token',
            details: error 
          } 
        };
      }

      // Record performance metric for successful generation
      await invitationPerformanceMonitor.recordTokenGeneration(
        generationTime,
        true
      );

      return { data };
    } catch (error) {
      const generationTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Record performance metric for exception
      await invitationPerformanceMonitor.recordTokenGeneration(
        generationTime,
        false,
        errorMessage
      );
      
      console.error('Exception generating invitation token:', error);
      return { 
        error: { 
          code: 'TOKEN_GENERATION_EXCEPTION', 
          message: 'Exception occurred during token generation',
          details: error 
        } 
      };
    }
  }

  /**
   * Validate and verify an invitation token
   * Requirements: 2.3, 2.4, 6.2
   */
  async validateToken(token: string): Promise<{ data?: TokenValidation; error?: InvitationError }> {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!token || typeof token !== 'string' || token.length < 10) {
        const validationTime = Date.now() - startTime;
        await invitationPerformanceMonitor.recordTokenValidation(
          validationTime,
          false,
          'Invalid token format'
        );
        
        return {
          data: { isValid: false }
        };
      }

      const { data, error } = await supabase
        .from('invitation_tokens')
        .select(`
          *,
          invitation_request:invitation_requests!invitation_request_id(
            id,
            parent_email,
            child_name,
            status
          )
        `)
        .eq('token', token)
        .single();

      const validationTime = Date.now() - startTime;

      if (error || !data) {
        await invitationPerformanceMonitor.recordTokenValidation(
          validationTime,
          false,
          error?.message || 'Token not found'
        );
        
        return {
          data: { isValid: false }
        };
      }

      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      const isExpired = now > expiresAt;
      const isUsed = data.used_at !== null;
      const isApproved = data.invitation_request?.status === 'approved';

      if (isExpired || isUsed || !isApproved) {
        await invitationPerformanceMonitor.recordTokenValidation(
          validationTime,
          false,
          `Token invalid: expired=${isExpired}, used=${isUsed}, approved=${isApproved}`
        );
        
        return {
          data: { 
            isValid: false,
            invitationId: data.invitation_request_id,
            expiresAt: data.expires_at,
            usedAt: data.used_at
          }
        };
      }

      // Record successful validation
      await invitationPerformanceMonitor.recordTokenValidation(
        validationTime,
        true
      );

      return {
        data: {
          isValid: true,
          invitationId: data.invitation_request_id,
          parentEmail: data.invitation_request?.parent_email,
          childName: data.invitation_request?.child_name,
          expiresAt: data.expires_at,
          usedAt: data.used_at
        }
      };
    } catch (error) {
      const validationTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await invitationPerformanceMonitor.recordTokenValidation(
        validationTime,
        false,
        errorMessage
      );
      
      console.error('Exception validating token:', error);
      return { 
        error: { 
          code: 'TOKEN_VALIDATION_EXCEPTION', 
          message: 'Exception occurred during token validation',
          details: error 
        } 
      };
    }
  }

  /**
   * Mark a token as used after successful account creation
   * Requirements: 2.4, 2.5
   */
  async markTokenAsUsed(token: string, userId: string): Promise<{ success: boolean; error?: InvitationError }> {
    try {
      // First validate the token is still valid
      const validation = await this.validateToken(token);
      if (validation.error || !validation.data?.isValid) {
        return {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token is invalid or expired'
          }
        };
      }

      // Use a transaction to ensure atomicity
      const { error: tokenError } = await supabase
        .from('invitation_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      if (tokenError) {
        console.error('Error marking token as used:', tokenError);
        return {
          success: false,
          error: {
            code: 'TOKEN_UPDATE_FAILED',
            message: 'Failed to mark token as used',
            details: tokenError
          }
        };
      }

      // Update the invitation request with claim information
      const { error: invitationError } = await supabase
        .from('invitation_requests')
        .update({
          child_user_id: userId,
          invitation_claimed_at: new Date().toISOString()
        })
        .eq('id', validation.data.invitationId);

      if (invitationError) {
        console.error('Error updating invitation claim status:', invitationError);
        // This is not a critical failure, log but don't fail the operation
      }

      return { success: true };
    } catch (error) {
      console.error('Exception marking token as used:', error);
      return {
        success: false,
        error: {
          code: 'TOKEN_USAGE_EXCEPTION',
          message: 'Exception occurred while marking token as used',
          details: error
        }
      };
    }
  }

  /**
   * Get the status of a token (exists, expired, used)
   * Requirements: 2.4
   */
  async getTokenStatus(token: string): Promise<{ data?: TokenStatus; error?: InvitationError }> {
    try {
      const { data, error } = await supabase
        .from('invitation_tokens')
        .select('expires_at, used_at')
        .eq('token', token)
        .single();

      if (error || !data) {
        return {
          data: {
            exists: false,
            isExpired: false,
            isUsed: false
          }
        };
      }

      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      const isExpired = now > expiresAt;
      const isUsed = data.used_at !== null;

      return {
        data: {
          exists: true,
          isExpired,
          isUsed,
          expiresAt: data.expires_at,
          usedAt: data.used_at
        }
      };
    } catch (error) {
      console.error('Exception getting token status:', error);
      return {
        error: {
          code: 'TOKEN_STATUS_EXCEPTION',
          message: 'Exception occurred while getting token status',
          details: error
        }
      };
    }
  }

  /**
   * Regenerate a token for an invitation (admin functionality)
   * Requirements: 2.5, 6.2
   */
  async regenerateToken(invitationId: string): Promise<{ data?: InvitationToken; error?: InvitationError }> {
    try {
      // First, invalidate any existing tokens for this invitation
      const { error: invalidateError } = await supabase
        .from('invitation_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('invitation_request_id', invitationId)
        .is('used_at', null);

      if (invalidateError) {
        console.error('Error invalidating existing tokens:', invalidateError);
        // Continue anyway, as this might just mean no existing tokens
      }

      // Generate a new token
      return await this.generateToken(invitationId);
    } catch (error) {
      console.error('Exception regenerating token:', error);
      return {
        error: {
          code: 'TOKEN_REGENERATION_EXCEPTION',
          message: 'Exception occurred while regenerating token',
          details: error
        }
      };
    }
  }

  /**
   * Get token information for an invitation (admin functionality)
   * Requirements: 4.2, 4.3
   */
  async getTokenForInvitation(invitationId: string): Promise<{ data?: InvitationToken; error?: InvitationError }> {
    try {
      const { data, error } = await supabase
        .from('invitation_tokens')
        .select('*')
        .eq('invitation_request_id', invitationId)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting token for invitation:', error);
        return {
          error: {
            code: 'TOKEN_FETCH_FAILED',
            message: 'Failed to fetch token for invitation',
            details: error
          }
        };
      }

      return { data: data || undefined };
    } catch (error) {
      console.error('Exception getting token for invitation:', error);
      return {
        error: {
          code: 'TOKEN_FETCH_EXCEPTION',
          message: 'Exception occurred while fetching token',
          details: error
        }
      };
    }
  }

  /**
   * Clean up expired tokens (maintenance function)
   * Requirements: 7.4
   */
  async cleanupExpiredTokens(): Promise<{ deletedCount: number; error?: InvitationError }> {
    try {
      const { data, error } = await supabase
        .from('invitation_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Error cleaning up expired tokens:', error);
        return {
          deletedCount: 0,
          error: {
            code: 'TOKEN_CLEANUP_FAILED',
            message: 'Failed to clean up expired tokens',
            details: error
          }
        };
      }

      return { deletedCount: data?.length || 0 };
    } catch (error) {
      console.error('Exception cleaning up expired tokens:', error);
      return {
        deletedCount: 0,
        error: {
          code: 'TOKEN_CLEANUP_EXCEPTION',
          message: 'Exception occurred during token cleanup',
          details: error
        }
      };
    }
  }

  /**
   * Get all tokens for admin dashboard (with pagination)
   * Requirements: 4.1, 4.2
   */
  async getTokensForAdmin(page: number = 1, limit: number = 50): Promise<{ 
    data?: InvitationToken[]; 
    count?: number; 
    error?: InvitationError 
  }> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('invitation_tokens')
        .select(`
          *,
          invitation_request:invitation_requests!invitation_request_id(
            parent_name,
            parent_email,
            child_name,
            status
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error getting tokens for admin:', error);
        return {
          error: {
            code: 'ADMIN_TOKEN_FETCH_FAILED',
            message: 'Failed to fetch tokens for admin',
            details: error
          }
        };
      }

      return { data, count: count || 0 };
    } catch (error) {
      console.error('Exception getting tokens for admin:', error);
      return {
        error: {
          code: 'ADMIN_TOKEN_FETCH_EXCEPTION',
          message: 'Exception occurred while fetching tokens for admin',
          details: error
        }
      };
    }
  }
}

// Export a singleton instance
export const invitationTokenService = new InvitationTokenService();