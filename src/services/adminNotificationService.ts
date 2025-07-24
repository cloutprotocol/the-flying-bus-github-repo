import { supabase } from '@/integrations/supabase/client';
import { EnhancedInvitationService } from './enhancedInvitationService';
import type { EnhancedInvitationRequest } from './enhancedInvitationService';

export type AdminNotificationType = 
  | 'new_author_registration'
  | 'email_delivery_failed'
  | 'invitation_expiring'
  | 'invitation_expired'
  | 'token_regenerated'
  | 'security_alert'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'replay_attack_detected';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  invitation_id?: string;
  user_id?: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, any>;
}

export interface AdminNotificationSummary {
  unreadCount: number;
  newAuthorRegistrations: number;
  failedEmails: number;
  expiringInvitations: number;
  expiredInvitations: number;
}

export class AdminNotificationService {
  /**
   * Create a new admin notification
   */
  static async createNotification(
    type: AdminNotificationType,
    title: string,
    message: string,
    invitationId?: string,
    userId?: string,
    data?: Record<string, any>
  ): Promise<AdminNotification | null> {
    try {
      const { data: notification, error } = await supabase
        .from('admin_notifications')
        .insert({
          type,
          title,
          message,
          invitation_id: invitationId,
          user_id: userId,
          data: data ? JSON.stringify(data) : null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating admin notification:', error);
        return null;
      }

      return notification;
    } catch (error) {
      console.error('Exception creating admin notification:', error);
      return null;
    }
  }

  /**
   * Get all admin notifications with pagination
   */
  static async getNotifications(
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{ data: AdminNotification[] | null; error: any }> {
    try {
      let query = supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching admin notifications:', error);
        return { data: null, error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Exception fetching admin notifications:', error);
      return { data: null, error };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Get notification summary for dashboard
   */
  static async getNotificationSummary(): Promise<{ data: AdminNotificationSummary | null; error: any }> {
    try {
      const { data: notifications, error } = await supabase
        .from('admin_notifications')
        .select('type, is_read, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (error) {
        console.error('Error fetching notification summary:', error);
        return { data: null, error };
      }

      const summary: AdminNotificationSummary = {
        unreadCount: notifications?.filter(n => !n.is_read).length || 0,
        newAuthorRegistrations: notifications?.filter(n => n.type === 'new_author_registration').length || 0,
        failedEmails: notifications?.filter(n => n.type === 'email_delivery_failed').length || 0,
        expiringInvitations: notifications?.filter(n => n.type === 'invitation_expiring').length || 0,
        expiredInvitations: notifications?.filter(n => n.type === 'invitation_expired').length || 0
      };

      return { data: summary, error: null };
    } catch (error) {
      console.error('Exception fetching notification summary:', error);
      return { data: null, error };
    }
  }

  /**
   * Check for invitations that need attention and create notifications
   */
  static async checkAndCreateInvitationNotifications(): Promise<void> {
    try {
      const { data: invitations } = await EnhancedInvitationService.getInvitationsNeedingAttention();
      
      if (!invitations) return;

      for (const invitation of invitations) {
        // Check for failed emails
        const failedEmails = invitation.notifications.filter(n => n.delivery_status === 'failed');
        for (const failedEmail of failedEmails) {
          // Check if we already notified about this failed email
          const { data: existingNotification } = await supabase
            .from('admin_notifications')
            .select('id')
            .eq('type', 'email_delivery_failed')
            .eq('invitation_id', invitation.id)
            .contains('data', { notification_id: failedEmail.id })
            .single();

          if (!existingNotification) {
            await this.createNotification(
              'email_delivery_failed',
              'Email Delivery Failed',
              `Failed to send ${failedEmail.email_type} email to ${invitation.parent_email} for ${invitation.child_name}`,
              invitation.id,
              undefined,
              { 
                notification_id: failedEmail.id,
                email_type: failedEmail.email_type,
                error_message: failedEmail.error_message 
              }
            );
          }
        }

        // Check for expiring tokens
        if (invitation.token && !invitation.token.used_at) {
          const expiryDate = new Date(invitation.token.expires_at);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
            // Check if we already notified about this expiring token
            const { data: existingNotification } = await supabase
              .from('admin_notifications')
              .select('id')
              .eq('type', 'invitation_expiring')
              .eq('invitation_id', invitation.id)
              .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Within last 7 days
              .single();

            if (!existingNotification) {
              await this.createNotification(
                'invitation_expiring',
                'Invitation Token Expiring Soon',
                `Invitation token for ${invitation.child_name} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
                invitation.id,
                undefined,
                { 
                  days_until_expiry: daysUntilExpiry,
                  expires_at: invitation.token.expires_at 
                }
              );
            }
          } else if (daysUntilExpiry <= 0) {
            // Check if we already notified about this expired token
            const { data: existingNotification } = await supabase
              .from('admin_notifications')
              .select('id')
              .eq('type', 'invitation_expired')
              .eq('invitation_id', invitation.id)
              .single();

            if (!existingNotification) {
              await this.createNotification(
                'invitation_expired',
                'Invitation Token Expired',
                `Invitation token for ${invitation.child_name} has expired and needs to be regenerated`,
                invitation.id,
                undefined,
                { 
                  expired_at: invitation.token.expires_at 
                }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking invitation notifications:', error);
    }
  }

  /**
   * Create notification for new author registration
   */
  static async notifyNewAuthorRegistration(
    invitationId: string,
    userId: string,
    childName: string,
    parentEmail: string
  ): Promise<void> {
    await this.createNotification(
      'new_author_registration',
      'New Author Registered',
      `${childName} has successfully created an account and joined as an author`,
      invitationId,
      userId,
      { 
        child_name: childName,
        parent_email: parentEmail 
      }
    );
  }

  /**
   * Create notification for token regeneration
   */
  static async notifyTokenRegenerated(
    invitationId: string,
    childName: string,
    parentEmail: string
  ): Promise<void> {
    await this.createNotification(
      'token_regenerated',
      'Invitation Token Regenerated',
      `A new invitation token has been generated for ${childName} and sent to ${parentEmail}`,
      invitationId,
      undefined,
      { 
        child_name: childName,
        parent_email: parentEmail 
      }
    );
  }

  /**
   * Create notification for security events
   * Requirements: 6.3
   */
  static async notifySecurityEvent(event: {
    eventType: string;
    ipAddress: string;
    email?: string;
    severity: string;
    details?: any;
    timestamp: string;
  }): Promise<void> {
    const severityMap: Record<string, AdminNotificationType> = {
      'high': 'security_alert',
      'critical': 'security_alert',
      'suspicious_activity_detected': 'suspicious_activity',
      'rate_limit_exceeded': 'rate_limit_exceeded',
      'replay_attack_detected': 'replay_attack_detected'
    };

    const notificationType = severityMap[event.eventType] || severityMap[event.severity] || 'security_alert';

    const titleMap: Record<string, string> = {
      'rate_limit_exceeded': 'Rate Limit Exceeded',
      'suspicious_activity_detected': 'Suspicious Activity Detected',
      'replay_attack_detected': 'Replay Attack Detected',
      'token_integrity_violation': 'Token Tampering Detected',
      'invitation_claim_email_mismatch': 'Email Mismatch in Claim',
      'multiple_failed_attempts': 'Multiple Failed Attempts'
    };

    const title = titleMap[event.eventType] || 'Security Alert';

    let message = `Security event detected: ${event.eventType}`;
    
    // Customize message based on event type
    switch (event.eventType) {
      case 'rate_limit_exceeded':
        message = `Rate limit exceeded from IP ${event.ipAddress}${event.email ? ` for email ${event.email}` : ''}`;
        break;
      case 'suspicious_activity_detected':
        message = `Suspicious activity detected from IP ${event.ipAddress} (Risk Score: ${event.details?.riskScore || 'Unknown'})`;
        break;
      case 'replay_attack_detected':
        message = `Potential replay attack detected from IP ${event.ipAddress}`;
        break;
      case 'token_integrity_violation':
        message = `Token tampering attempt detected from IP ${event.ipAddress}`;
        break;
      case 'invitation_claim_email_mismatch':
        message = `Email mismatch in invitation claim from IP ${event.ipAddress}`;
        break;
      default:
        message = `Security event "${event.eventType}" from IP ${event.ipAddress}`;
    }

    await this.createNotification(
      notificationType,
      title,
      message,
      undefined,
      undefined,
      {
        event_type: event.eventType,
        ip_address: event.ipAddress,
        email: event.email,
        severity: event.severity,
        details: event.details,
        timestamp: event.timestamp
      }
    );
  }

  /**
   * Delete old notifications (cleanup)
   */
  static async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('admin_notifications')
        .delete()
        .lt('created_at', cutoffDate)
        .select('id');

      if (error) {
        console.error('Error cleaning up old notifications:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Exception cleaning up old notifications:', error);
      return 0;
    }
  }
}

// Note: This service assumes an admin_notifications table exists.
// The table would need to be created with a migration:
/*
CREATE TABLE admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  invitation_id UUID REFERENCES invitation_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at);
CREATE INDEX idx_admin_notifications_invitation_id ON admin_notifications(invitation_id);
*/