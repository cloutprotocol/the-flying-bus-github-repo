// Email Delivery Tracking Service for Invitation Approval Workflow
// This service handles tracking email delivery status, bounces, and failures

import { supabase } from '@/integrations/supabase/client';
import { InvitationWorkflowService } from './invitationWorkflowService';
import type {
  EmailNotification,
  DeliveryStatus,
  EmailType
} from '@/types/InvitationWorkflowTypes';

export interface EmailDeliveryStats {
  totalEmails: number;
  sentEmails: number;
  failedEmails: number;
  bouncedEmails: number;
  pendingEmails: number;
  deliveryRate: number;
  bounceRate: number;
  failureRate: number;
}

export interface EmailDeliveryReport {
  invitationId: string;
  parentEmail: string;
  childName: string;
  notifications: EmailNotification[];
  lastEmailSent: string | null;
  totalAttempts: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  bounces: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface BounceInfo {
  notificationId: string;
  bounceType: 'hard' | 'soft' | 'complaint';
  bounceReason: string;
  timestamp: string;
}

export class EmailDeliveryTrackingService {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly BOUNCE_THRESHOLD = 2; // Max bounces before marking email as problematic

  /**
   * Track email delivery attempt
   */
  static async trackEmailDelivery(
    notificationId: string,
    status: DeliveryStatus,
    messageId?: string,
    errorMessage?: string
  ): Promise<boolean> {
    try {
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
        console.error('Error tracking email delivery:', error);
        return false;
      }

      // Log delivery event for analytics
      await this.logDeliveryEvent(notificationId, status, messageId, errorMessage);

      return true;
    } catch (error) {
      console.error('Exception tracking email delivery:', error);
      return false;
    }
  }

  /**
   * Handle email bounce notification
   */
  static async handleEmailBounce(
    notificationId: string,
    bounceType: 'hard' | 'soft' | 'complaint',
    bounceReason: string
  ): Promise<boolean> {
    try {
      // Update notification status to bounced
      await this.trackEmailDelivery(notificationId, 'bounced', undefined, bounceReason);

      // Log bounce information
      await this.logBounceEvent(notificationId, bounceType, bounceReason);

      // Check if this email address has too many bounces
      const notification = await this.getEmailNotification(notificationId);
      if (notification) {
        const bounceCount = await this.getBounceCountForEmail(notification.recipient_email);
        
        if (bounceCount >= this.BOUNCE_THRESHOLD) {
          await this.markEmailAsProblematic(notification.recipient_email, bounceCount);
        }
      }

      return true;
    } catch (error) {
      console.error('Error handling email bounce:', error);
      return false;
    }
  }

  /**
   * Get delivery statistics for all emails
   */
  static async getDeliveryStats(): Promise<EmailDeliveryStats | null> {
    try {
      const { data: notifications, error } = await supabase
        .from('email_notifications')
        .select('delivery_status');

      if (error) {
        console.error('Error fetching delivery stats:', error);
        return null;
      }

      const totalEmails = notifications.length;
      const sentEmails = notifications.filter(n => n.delivery_status === 'sent').length;
      const failedEmails = notifications.filter(n => n.delivery_status === 'failed').length;
      const bouncedEmails = notifications.filter(n => n.delivery_status === 'bounced').length;
      const pendingEmails = notifications.filter(n => n.delivery_status === 'pending').length;

      const deliveryRate = totalEmails > 0 ? (sentEmails / totalEmails) * 100 : 0;
      const bounceRate = totalEmails > 0 ? (bouncedEmails / totalEmails) * 100 : 0;
      const failureRate = totalEmails > 0 ? (failedEmails / totalEmails) * 100 : 0;

      return {
        totalEmails,
        sentEmails,
        failedEmails,
        bouncedEmails,
        pendingEmails,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100
      };
    } catch (error) {
      console.error('Exception getting delivery stats:', error);
      return null;
    }
  }

  /**
   * Get delivery report for a specific invitation
   */
  static async getDeliveryReport(invitationId: string): Promise<EmailDeliveryReport | null> {
    try {
      // Get invitation details
      const invitation = await InvitationWorkflowService.getEnhancedInvitationRequest(invitationId);
      if (!invitation) {
        return null;
      }

      // Get all notifications for this invitation
      const notifications = await InvitationWorkflowService.getEmailNotificationsByInvitation(invitationId);

      const totalAttempts = notifications.length;
      const successfulDeliveries = notifications.filter(n => n.delivery_status === 'sent').length;
      const failedDeliveries = notifications.filter(n => n.delivery_status === 'failed').length;
      const bounces = notifications.filter(n => n.delivery_status === 'bounced').length;

      // Determine status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (bounces > 0 || failedDeliveries > 1) {
        status = 'critical';
      } else if (failedDeliveries > 0) {
        status = 'warning';
      }

      // Get last email sent timestamp
      const sentNotifications = notifications.filter(n => n.sent_at !== null);
      const lastEmailSent = sentNotifications.length > 0 
        ? sentNotifications.sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime())[0].sent_at
        : null;

      return {
        invitationId,
        parentEmail: invitation.parent_email,
        childName: invitation.child_name,
        notifications,
        lastEmailSent,
        totalAttempts,
        successfulDeliveries,
        failedDeliveries,
        bounces,
        status
      };
    } catch (error) {
      console.error('Exception getting delivery report:', error);
      return null;
    }
  }

  /**
   * Get failed email notifications that need retry
   */
  static async getFailedEmailsForRetry(): Promise<EmailNotification[]> {
    try {
      const { data: notifications, error } = await supabase
        .from('email_notifications')
        .select('*')
        .eq('delivery_status', 'failed')
        .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // At least 5 minutes old
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching failed emails for retry:', error);
        return [];
      }

      // Filter out emails that have been retried too many times
      const retryableEmails = [];
      for (const notification of notifications || []) {
        const retryCount = await this.getRetryCount(notification.id);
        if (retryCount < this.MAX_RETRY_ATTEMPTS) {
          retryableEmails.push(notification);
        }
      }

      return retryableEmails;
    } catch (error) {
      console.error('Exception getting failed emails for retry:', error);
      return [];
    }
  }

  /**
   * Mark email for retry
   */
  static async markEmailForRetry(notificationId: string): Promise<boolean> {
    try {
      // Reset status to pending for retry
      const { error } = await supabase
        .from('email_notifications')
        .update({
          delivery_status: 'pending',
          error_message: null
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking email for retry:', error);
        return false;
      }

      // Log retry attempt
      await this.logRetryAttempt(notificationId);

      return true;
    } catch (error) {
      console.error('Exception marking email for retry:', error);
      return false;
    }
  }

  /**
   * Get bounce information for problematic emails
   */
  static async getBounceInfo(emailAddress: string): Promise<BounceInfo[]> {
    try {
      // This would typically query a bounce tracking table
      // For now, we'll get bounce info from email_notifications
      const { data: notifications, error } = await supabase
        .from('email_notifications')
        .select('id, error_message, created_at')
        .eq('recipient_email', emailAddress)
        .eq('delivery_status', 'bounced')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bounce info:', error);
        return [];
      }

      return (notifications || []).map(n => ({
        notificationId: n.id,
        bounceType: this.determineBounceType(n.error_message || ''),
        bounceReason: n.error_message || 'Unknown bounce reason',
        timestamp: n.created_at
      }));
    } catch (error) {
      console.error('Exception getting bounce info:', error);
      return [];
    }
  }

  /**
   * Clean up old email notifications (older than 90 days)
   */
  static async cleanupOldNotifications(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('email_notifications')
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

  /**
   * Get email health status for admin dashboard
   */
  static async getEmailHealthStatus() {
    try {
      const stats = await this.getDeliveryStats();
      if (!stats) {
        return { status: 'unknown', message: 'Unable to fetch email statistics' };
      }

      // Determine overall health
      if (stats.deliveryRate >= 95 && stats.bounceRate <= 2) {
        return { status: 'healthy', message: 'Email delivery is performing well' };
      } else if (stats.deliveryRate >= 85 && stats.bounceRate <= 5) {
        return { status: 'warning', message: 'Email delivery needs attention' };
      } else {
        return { status: 'critical', message: 'Email delivery has serious issues' };
      }
    } catch (error) {
      console.error('Exception getting email health status:', error);
      return { status: 'error', message: 'Error checking email health' };
    }
  }

  // Private helper methods

  private static async getEmailNotification(notificationId: string): Promise<EmailNotification | null> {
    try {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error) {
        console.error('Error fetching email notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching email notification:', error);
      return null;
    }
  }

  private static async getBounceCountForEmail(emailAddress: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('email_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_email', emailAddress)
        .eq('delivery_status', 'bounced');

      if (error) {
        console.error('Error getting bounce count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Exception getting bounce count:', error);
      return 0;
    }
  }

  private static async getRetryCount(notificationId: string): Promise<number> {
    // In a real implementation, you would track retry attempts in a separate table
    // For now, we'll estimate based on error messages or use a simple counter
    try {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('error_message')
        .eq('id', notificationId)
        .single();

      if (error || !data) {
        return 0;
      }

      // Simple heuristic: count "retry" mentions in error message
      const errorMessage = data.error_message || '';
      const retryMatches = errorMessage.match(/retry|attempt/gi);
      return retryMatches ? retryMatches.length : 0;
    } catch (error) {
      console.error('Exception getting retry count:', error);
      return 0;
    }
  }

  private static async logDeliveryEvent(
    notificationId: string,
    status: DeliveryStatus,
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      // In a production system, you would log to a dedicated analytics/logging service
      console.log('Email delivery event:', {
        notificationId,
        status,
        messageId,
        errorMessage,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging delivery event:', error);
    }
  }

  private static async logBounceEvent(
    notificationId: string,
    bounceType: string,
    bounceReason: string
  ): Promise<void> {
    try {
      // In a production system, you would log to a dedicated bounce tracking system
      console.log('Email bounce event:', {
        notificationId,
        bounceType,
        bounceReason,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging bounce event:', error);
    }
  }

  private static async logRetryAttempt(notificationId: string): Promise<void> {
    try {
      console.log('Email retry attempt:', {
        notificationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging retry attempt:', error);
    }
  }

  private static async markEmailAsProblematic(
    emailAddress: string,
    bounceCount: number
  ): Promise<void> {
    try {
      // In a production system, you would maintain a blacklist or problematic email list
      console.warn('Email marked as problematic:', {
        emailAddress,
        bounceCount,
        timestamp: new Date().toISOString()
      });
      
      // You could also notify administrators about problematic emails
    } catch (error) {
      console.error('Error marking email as problematic:', error);
    }
  }

  private static determineBounceType(errorMessage: string): 'hard' | 'soft' | 'complaint' {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('invalid') || lowerError.includes('not found') || lowerError.includes('does not exist')) {
      return 'hard';
    } else if (lowerError.includes('spam') || lowerError.includes('complaint') || lowerError.includes('abuse')) {
      return 'complaint';
    } else {
      return 'soft';
    }
  }
}