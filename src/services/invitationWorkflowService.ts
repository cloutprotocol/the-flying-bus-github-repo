// Database service for invitation workflow operations
// This service handles all database interactions for the invitation approval workflow

import { supabase } from '@/integrations/supabase/client';
import type {
  InvitationToken,
  EmailNotification,
  EnhancedInvitationRequest,
  TokenValidation,
  ValidateTokenResult,
  InvitationWithDetails,
  EmailType,
  DeliveryStatus
} from '@/types/InvitationWorkflowTypes';

export class InvitationWorkflowService {
  // Token management methods
  static async generateToken(invitationId: string): Promise<InvitationToken | null> {
    const { data, error } = await supabase
      .from('invitation_tokens')
      .insert({
        invitation_request_id: invitationId,
        token: this.generateSecureToken(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })
      .select()
      .single();

    if (error) {
      console.error('Error generating invitation token:', error);
      return null;
    }

    return data;
  }

  static async validateToken(token: string): Promise<TokenValidation> {
    try {
      const { data, error } = await supabase
        .rpc('validate_invitation_token', { token_input: token });

      if (error) {
        console.error('Error validating token:', error);
        return { isValid: false };
      }

      if (!data || data.length === 0) {
        return { isValid: false };
      }

      const result = data[0] as ValidateTokenResult;
      return {
        isValid: result.is_valid,
        invitationId: result.invitation_id,
        parentEmail: result.parent_email,
        childName: result.child_name,
        expiresAt: result.expires_at,
        usedAt: result.used_at
      };
    } catch (error) {
      console.error('Error in validateToken:', error);
      return { isValid: false };
    }
  }

  static async markTokenAsUsed(token: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('use_invitation_token', { 
          token_input: token, 
          user_id_input: userId 
        });

      if (error) {
        console.error('Error marking token as used:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in markTokenAsUsed:', error);
      return false;
    }
  }

  static async getTokenByInvitationId(invitationId: string): Promise<InvitationToken | null> {
    const { data, error } = await supabase
      .from('invitation_tokens')
      .select('*')
      .eq('invitation_request_id', invitationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching token:', error);
      return null;
    }

    return data;
  }

  static async regenerateToken(invitationId: string): Promise<InvitationToken | null> {
    // First, mark existing tokens as expired by updating their expires_at
    await supabase
      .from('invitation_tokens')
      .update({ expires_at: new Date().toISOString() })
      .eq('invitation_request_id', invitationId)
      .is('used_at', null);

    // Generate new token
    return this.generateToken(invitationId);
  }

  // Email notification methods
  static async createEmailNotification(
    invitationId: string,
    emailType: EmailType,
    recipientEmail: string
  ): Promise<EmailNotification | null> {
    const { data, error } = await supabase
      .from('email_notifications')
      .insert({
        invitation_request_id: invitationId,
        email_type: emailType,
        recipient_email: recipientEmail
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating email notification:', error);
      return null;
    }

    return data;
  }

  static async updateEmailNotificationStatus(
    notificationId: string,
    status: DeliveryStatus,
    errorMessage?: string
  ): Promise<boolean> {
    const updateData: any = {
      delivery_status: status,
      sent_at: status === 'sent' ? new Date().toISOString() : undefined
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('email_notifications')
      .update(updateData)
      .eq('id', notificationId);

    if (error) {
      console.error('Error updating email notification status:', error);
      return false;
    }

    return true;
  }

  static async getEmailNotificationsByInvitation(invitationId: string): Promise<EmailNotification[]> {
    const { data, error } = await supabase
      .from('email_notifications')
      .select('*')
      .eq('invitation_request_id', invitationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching email notifications:', error);
      return [];
    }

    return data || [];
  }

  // Enhanced invitation request methods
  static async getEnhancedInvitationRequest(invitationId: string): Promise<InvitationWithDetails | null> {
    const { data: invitation, error: invitationError } = await supabase
      .from('invitation_requests')
      .select(`
        *,
        profiles!invitation_requests_child_user_id_fkey(id, display_name, email, username)
      `)
      .eq('id', invitationId)
      .single();

    if (invitationError) {
      console.error('Error fetching invitation request:', invitationError);
      return null;
    }

    // Get token
    const token = await this.getTokenByInvitationId(invitationId);
    
    // Get notifications
    const notifications = await this.getEmailNotificationsByInvitation(invitationId);

    return {
      ...invitation,
      token: token || undefined,
      notifications,
      linkedUser: invitation.profiles || undefined
    };
  }

  static async updateInvitationNotificationStatus(
    invitationId: string,
    status: 'pending' | 'sent' | 'failed'
  ): Promise<boolean> {
    const { error } = await supabase
      .from('invitation_requests')
      .update({
        notification_status: status,
        notification_sent_at: status === 'sent' ? new Date().toISOString() : undefined
      })
      .eq('id', invitationId);

    if (error) {
      console.error('Error updating invitation notification status:', error);
      return false;
    }

    return true;
  }

  static async markInvitationAsClaimed(invitationId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('invitation_requests')
      .update({
        child_user_id: userId,
        invitation_claimed_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (error) {
      console.error('Error marking invitation as claimed:', error);
      return false;
    }

    return true;
  }

  // Utility methods
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_tokens');

      if (error) {
        console.error('Error cleaning up expired tokens:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in cleanupExpiredTokens:', error);
      return 0;
    }
  }

  static async getInvitationStats() {
    const { data: requests, error } = await supabase
      .from('invitation_requests')
      .select('status, invitation_claimed_at');

    if (error) {
      console.error('Error fetching invitation stats:', error);
      return null;
    }

    const stats = {
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'pending').length,
      approvedRequests: requests.filter(r => r.status === 'approved').length,
      deniedRequests: requests.filter(r => r.status === 'denied').length,
      claimedInvitations: requests.filter(r => r.invitation_claimed_at !== null).length,
      unclaimedInvitations: requests.filter(r => r.status === 'approved' && r.invitation_claimed_at === null).length,
      expiredTokens: 0 // Will be calculated separately
    };

    return stats;
  }

  // Private helper methods
  private static generateSecureToken(): string {
    // Generate a cryptographically secure token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}