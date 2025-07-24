import { supabase } from '@/integrations/supabase/client';
import { InvitationWorkflowService } from './invitationWorkflowService';
import { invitationTokenService } from './invitationTokenService';
import type {
  InvitationWithDetails,
  InvitationStats,
  InvitationToken,
  EmailNotification
} from '@/types/InvitationWorkflowTypes';

export interface EnhancedInvitationRequest {
  id: string;
  parent_name: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  message: string | null;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  child_user_id: string | null;
  invitation_claimed_at: string | null;
  notification_sent_at: string | null;
  notification_status: 'pending' | 'sent' | 'failed';
  // Enhanced fields
  token?: InvitationToken;
  notifications: EmailNotification[];
  linkedUser?: {
    id: string;
    display_name: string;
    email: string;
    username: string;
  };
  reviewer?: {
    display_name: string;
  };
}

export class EnhancedInvitationService {
  /**
   * Get all invitation requests with enhanced data including tokens, notifications, and linked users
   */
  static async getEnhancedInvitationRequests(
    status?: 'pending' | 'approved' | 'denied',
    sortBy: 'created_at' | 'status' | 'notification_status' = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ data: EnhancedInvitationRequest[] | null; error: any }> {
    try {
      let query = supabase
        .from('invitation_requests')
        .select(`
          *,
          reviewer:profiles!reviewer_id(display_name),
          child_user:profiles!child_user_id(id, display_name, email, username)
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: invitations, error } = await query;

      if (error) {
        console.error('Error fetching enhanced invitation requests:', error);
        return { data: null, error };
      }

      if (!invitations) {
        return { data: [], error: null };
      }

      // Enhance each invitation with token and notification data
      const enhancedInvitations = await Promise.all(
        invitations.map(async (invitation) => {
          // Get token data
          const token = await InvitationWorkflowService.getTokenByInvitationId(invitation.id);
          
          // Get notification data
          const notifications = await InvitationWorkflowService.getEmailNotificationsByInvitation(invitation.id);

          return {
            ...invitation,
            token: token || undefined,
            notifications,
            linkedUser: invitation.child_user || undefined,
            reviewer: invitation.reviewer || undefined
          } as EnhancedInvitationRequest;
        })
      );

      return { data: enhancedInvitations, error: null };
    } catch (error) {
      console.error('Exception fetching enhanced invitation requests:', error);
      return { data: null, error };
    }
  }

  /**
   * Get a single enhanced invitation request by ID
   */
  static async getEnhancedInvitationById(id: string): Promise<{ data: InvitationWithDetails | null; error: any }> {
    try {
      const invitation = await InvitationWorkflowService.getEnhancedInvitationRequest(id);
      return { data: invitation, error: null };
    } catch (error) {
      console.error('Exception fetching enhanced invitation by ID:', error);
      return { data: null, error };
    }
  }

  /**
   * Regenerate invitation token for an approved invitation
   */
  static async regenerateInvitationToken(invitationId: string): Promise<{ data: InvitationToken | null; error: any }> {
    try {
      const token = await InvitationWorkflowService.regenerateToken(invitationId);
      
      if (token) {
        // Get invitation details for notification
        const { data: invitation } = await this.getEnhancedInvitationById(invitationId);
        
        if (invitation) {
          // Import AdminNotificationService dynamically to avoid circular dependencies
          const { AdminNotificationService } = await import('./adminNotificationService');
          await AdminNotificationService.notifyTokenRegenerated(
            invitationId,
            invitation.child_name,
            invitation.parent_email
          );
        }
      }
      
      return { data: token, error: null };
    } catch (error) {
      console.error('Exception regenerating invitation token:', error);
      return { data: null, error };
    }
  }

  /**
   * Get invitation statistics for admin dashboard
   */
  static async getInvitationStatistics(): Promise<{ data: InvitationStats | null; error: any }> {
    try {
      const stats = await InvitationWorkflowService.getInvitationStats();
      return { data: stats, error: null };
    } catch (error) {
      console.error('Exception fetching invitation statistics:', error);
      return { data: null, error };
    }
  }

  /**
   * Get invitations that need admin attention (failed emails, expiring tokens, etc.)
   */
  static async getInvitationsNeedingAttention(): Promise<{ data: EnhancedInvitationRequest[] | null; error: any }> {
    try {
      const { data: allInvitations, error } = await this.getEnhancedInvitationRequests();
      
      if (error || !allInvitations) {
        return { data: null, error };
      }

      const needingAttention = allInvitations.filter(invitation => {
        // Failed email notifications
        const hasFailedEmails = invitation.notifications.some(n => n.delivery_status === 'failed');
        
        // Approved but no notification sent
        const approvedButNoNotification = invitation.status === 'approved' && invitation.notification_status === 'pending';
        
        // Token expiring soon (within 7 days)
        const tokenExpiringSoon = invitation.token && 
          new Date(invitation.token.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 &&
          !invitation.token.used_at;

        return hasFailedEmails || approvedButNoNotification || tokenExpiringSoon;
      });

      return { data: needingAttention, error: null };
    } catch (error) {
      console.error('Exception fetching invitations needing attention:', error);
      return { data: null, error };
    }
  }

  /**
   * Get invitation lifecycle status for display
   */
  static getInvitationLifecycleStatus(invitation: EnhancedInvitationRequest): {
    stage: 'pending' | 'approved' | 'denied' | 'notified' | 'claimed';
    substage?: string;
    needsAttention: boolean;
  } {
    if (invitation.status === 'denied') {
      return { stage: 'denied', needsAttention: false };
    }

    if (invitation.status === 'pending') {
      return { stage: 'pending', needsAttention: false };
    }

    if (invitation.status === 'approved') {
      if (invitation.invitation_claimed_at) {
        return { stage: 'claimed', needsAttention: false };
      }

      if (invitation.notification_status === 'sent') {
        const hasFailedEmails = invitation.notifications.some(n => n.delivery_status === 'failed');
        const tokenExpiringSoon = invitation.token && 
          new Date(invitation.token.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

        return { 
          stage: 'notified', 
          substage: tokenExpiringSoon ? 'expiring' : undefined,
          needsAttention: hasFailedEmails || !!tokenExpiringSoon
        };
      }

      if (invitation.notification_status === 'failed') {
        return { stage: 'approved', substage: 'notification_failed', needsAttention: true };
      }

      return { stage: 'approved', substage: 'notification_pending', needsAttention: true };
    }

    return { stage: 'pending', needsAttention: false };
  }
}