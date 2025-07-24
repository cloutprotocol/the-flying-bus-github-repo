// Email Notification Service for Invitation Approval Workflow
// This service handles the actual sending of emails for different invitation lifecycle events

import { supabase } from '@/integrations/supabase/client';
import { InvitationWorkflowService } from './invitationWorkflowService';
import { EmailDeliveryTrackingService } from './emailDeliveryTrackingService';
import { invitationPerformanceMonitor } from './invitationPerformanceMonitor';
import { generateApprovalEmailTemplate } from './emailTemplates/approvalEmailTemplate';
import { generateDenialEmailTemplate } from './emailTemplates/denialEmailTemplate';
import { generateWelcomeEmailTemplate } from './emailTemplates/welcomeEmailTemplate';
import { generateExpiryWarningEmailTemplate } from './emailTemplates/expiryWarningEmailTemplate';
import type {
  EmailResult,
  EmailType,
  ApprovalEmailData,
  DenialEmailData,
  WelcomeEmailData,
  ExpiryWarningEmailData,
  InvitationWithDetails
} from '@/types/InvitationWorkflowTypes';

export class EmailNotificationService {
  private static readonly RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1000;
  private static readonly BASE_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8080';

  /**
   * Send approval email with invitation token
   */
  static async sendApprovalEmail(invitationId: string): Promise<EmailResult> {
    try {
      // Get invitation details
      const invitation = await InvitationWorkflowService.getEnhancedInvitationRequest(invitationId);
      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      // Get or generate token
      let token = invitation.token;
      if (!token) {
        token = await InvitationWorkflowService.generateToken(invitationId);
        if (!token) {
          return { success: false, error: 'Failed to generate invitation token' };
        }
      }

      // Create email notification record
      const notification = await InvitationWorkflowService.createEmailNotification(
        invitationId,
        'approval',
        invitation.parent_email
      );

      if (!notification) {
        return { success: false, error: 'Failed to create email notification record' };
      }

      // Prepare email data
      const emailData: ApprovalEmailData = {
        parentName: invitation.parent_name,
        childName: invitation.child_name,
        invitationToken: token.token,
        invitationUrl: `${this.BASE_URL}/claim-invitation/${token.token}`,
        expiresAt: new Date(token.expires_at).toLocaleDateString()
      };

      // Send email with retry logic
      const result = await this.sendEmailWithRetry(
        'approval',
        invitation.parent_email,
        emailData,
        notification.id
      );

      // Update invitation notification status
      await InvitationWorkflowService.updateInvitationNotificationStatus(
        invitationId,
        result.success ? 'sent' : 'failed'
      );

      return result;
    } catch (error) {
      console.error('Error sending approval email:', error);
      return { success: false, error: 'Failed to send approval email' };
    }
  }

  /**
   * Send denial email
   */
  static async sendDenialEmail(invitationId: string, reason?: string): Promise<EmailResult> {
    try {
      // Get invitation details
      const invitation = await InvitationWorkflowService.getEnhancedInvitationRequest(invitationId);
      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      // Create email notification record
      const notification = await InvitationWorkflowService.createEmailNotification(
        invitationId,
        'denial',
        invitation.parent_email
      );

      if (!notification) {
        return { success: false, error: 'Failed to create email notification record' };
      }

      // Prepare email data
      const emailData: DenialEmailData = {
        parentName: invitation.parent_name,
        childName: invitation.child_name,
        reason
      };

      // Send email with retry logic
      const result = await this.sendEmailWithRetry(
        'denial',
        invitation.parent_email,
        emailData,
        notification.id
      );

      // Update invitation notification status
      await InvitationWorkflowService.updateInvitationNotificationStatus(
        invitationId,
        result.success ? 'sent' : 'failed'
      );

      return result;
    } catch (error) {
      console.error('Error sending denial email:', error);
      return { success: false, error: 'Failed to send denial email' };
    }
  }

  /**
   * Send welcome email after successful account creation
   */
  static async sendWelcomeEmail(invitationId: string, userId: string): Promise<EmailResult> {
    try {
      // Get invitation details
      const invitation = await InvitationWorkflowService.getEnhancedInvitationRequest(invitationId);
      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      // Create email notification record
      const notification = await InvitationWorkflowService.createEmailNotification(
        invitationId,
        'welcome',
        invitation.parent_email
      );

      if (!notification) {
        return { success: false, error: 'Failed to create email notification record' };
      }

      // Prepare email data
      const emailData: WelcomeEmailData = {
        parentName: invitation.parent_name,
        childName: invitation.child_name,
        platformUrl: this.BASE_URL,
        guidelinesUrl: `${this.BASE_URL}/guidelines`
      };

      // Send email with retry logic
      const result = await this.sendEmailWithRetry(
        'welcome',
        invitation.parent_email,
        emailData,
        notification.id
      );

      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: 'Failed to send welcome email' };
    }
  }

  /**
   * Send expiry warning email
   */
  static async sendExpiryWarningEmail(invitationId: string): Promise<EmailResult> {
    try {
      // Get invitation details
      const invitation = await InvitationWorkflowService.getEnhancedInvitationRequest(invitationId);
      if (!invitation || !invitation.token) {
        return { success: false, error: 'Invitation or token not found' };
      }

      // Create email notification record
      const notification = await InvitationWorkflowService.createEmailNotification(
        invitationId,
        'expiry_warning',
        invitation.parent_email
      );

      if (!notification) {
        return { success: false, error: 'Failed to create email notification record' };
      }

      // Prepare email data
      const emailData: ExpiryWarningEmailData = {
        parentName: invitation.parent_name,
        childName: invitation.child_name,
        expiresAt: new Date(invitation.token.expires_at).toLocaleDateString(),
        supportEmail: 'support@flyingbus.com'
      };

      // Send email with retry logic
      const result = await this.sendEmailWithRetry(
        'expiry_warning',
        invitation.parent_email,
        emailData,
        notification.id
      );

      return result;
    } catch (error) {
      console.error('Error sending expiry warning email:', error);
      return { success: false, error: 'Failed to send expiry warning email' };
    }
  }

  /**
   * Get notification status for an invitation
   */
  static async getNotificationStatus(invitationId: string) {
    try {
      const notifications = await InvitationWorkflowService.getEmailNotificationsByInvitation(invitationId);
      
      return {
        notifications,
        hasApprovalEmail: notifications.some(n => n.email_type === 'approval'),
        hasDenialEmail: notifications.some(n => n.email_type === 'denial'),
        hasWelcomeEmail: notifications.some(n => n.email_type === 'welcome'),
        hasExpiryWarning: notifications.some(n => n.email_type === 'expiry_warning'),
        lastEmailSent: notifications.length > 0 ? notifications[0].sent_at : null,
        failedEmails: notifications.filter(n => n.delivery_status === 'failed').length
      };
    } catch (error) {
      console.error('Error getting notification status:', error);
      return null;
    }
  }

  /**
   * Retry failed email notifications
   */
  static async retryFailedEmails(): Promise<{ retried: number; successful: number; failed: number }> {
    try {
      const failedEmails = await EmailDeliveryTrackingService.getFailedEmailsForRetry();
      let successful = 0;
      let failed = 0;

      for (const notification of failedEmails) {
        try {
          // Mark for retry
          await EmailDeliveryTrackingService.markEmailForRetry(notification.id);
          
          // Get invitation details to resend
          const invitation = await InvitationWorkflowService.getEnhancedInvitationRequest(
            notification.invitation_request_id
          );
          
          if (!invitation) {
            failed++;
            continue;
          }

          // Resend based on email type
          let result: EmailResult;
          switch (notification.email_type) {
            case 'approval':
              result = await this.sendApprovalEmail(invitation.id);
              break;
            case 'denial':
              result = await this.sendDenialEmail(invitation.id);
              break;
            case 'welcome':
              result = await this.sendWelcomeEmail(invitation.id, invitation.child_user_id || '');
              break;
            case 'expiry_warning':
              result = await this.sendExpiryWarningEmail(invitation.id);
              break;
            default:
              failed++;
              continue;
          }

          if (result.success) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error('Error retrying email:', error);
          failed++;
        }
      }

      return {
        retried: failedEmails.length,
        successful,
        failed
      };
    } catch (error) {
      console.error('Error retrying failed emails:', error);
      return { retried: 0, successful: 0, failed: 0 };
    }
  }

  /**
   * Handle email bounce notification from external email service
   */
  static async handleEmailBounce(
    messageId: string,
    bounceType: 'hard' | 'soft' | 'complaint',
    bounceReason: string
  ): Promise<boolean> {
    try {
      // Find the notification by message ID (this would require storing message IDs)
      // For now, we'll use a simplified approach
      const { data: notifications, error } = await supabase
        .from('email_notifications')
        .select('id')
        .eq('delivery_status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error || !notifications || notifications.length === 0) {
        console.error('Could not find notification for bounce handling');
        return false;
      }

      // In a real implementation, you would match by message ID
      // For now, we'll handle the most recent sent email
      const notificationId = notifications[0].id;
      
      return await EmailDeliveryTrackingService.handleEmailBounce(
        notificationId,
        bounceType,
        bounceReason
      );
    } catch (error) {
      console.error('Error handling email bounce:', error);
      return false;
    }
  }

  /**
   * Get email delivery statistics
   */
  static async getDeliveryStatistics() {
    try {
      return await EmailDeliveryTrackingService.getDeliveryStats();
    } catch (error) {
      console.error('Error getting delivery statistics:', error);
      return null;
    }
  }

  /**
   * Get email health status for admin dashboard
   */
  static async getEmailHealthStatus() {
    try {
      return await EmailDeliveryTrackingService.getEmailHealthStatus();
    } catch (error) {
      console.error('Error getting email health status:', error);
      return { status: 'error', message: 'Unable to check email health' };
    }
  }

  /**
   * Send email with retry logic and error handling
   */
  private static async sendEmailWithRetry(
    emailType: EmailType,
    recipientEmail: string,
    emailData: any,
    notificationId: string,
    attempt: number = 1
  ): Promise<EmailResult> {
    try {
      // Update notification status to pending
      await InvitationWorkflowService.updateEmailNotificationStatus(
        notificationId,
        'pending'
      );

      // Generate email content
      const emailContent = this.generateEmailContent(emailType, emailData);
      
      // Send email using Supabase Auth (for now, we'll simulate the email sending)
      // In a real implementation, you would integrate with an email service like SendGrid, AWS SES, etc.
      const result = await this.sendEmail(
        recipientEmail,
        emailContent.subject,
        emailContent.html,
        emailContent.text
      );

      if (result.success) {
        // Update notification status to sent and track delivery
        await EmailDeliveryTrackingService.trackEmailDelivery(
          notificationId,
          'sent',
          result.messageId
        );
        return result;
      } else {
        throw new Error(result.error || 'Email sending failed');
      }
    } catch (error) {
      console.error(`Email sending attempt ${attempt} failed:`, error);
      
      if (attempt < this.RETRY_ATTEMPTS) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * attempt));
        return this.sendEmailWithRetry(emailType, recipientEmail, emailData, notificationId, attempt + 1);
      } else {
        // All attempts failed, track the failure
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await EmailDeliveryTrackingService.trackEmailDelivery(
          notificationId,
          'failed',
          undefined,
          errorMessage
        );
        
        return { 
          success: false, 
          error: `Failed to send email after ${this.RETRY_ATTEMPTS} attempts: ${errorMessage}` 
        };
      }
    }
  }

  /**
   * Generate email content based on type and data
   */
  private static generateEmailContent(emailType: EmailType, data: any) {
    switch (emailType) {
      case 'approval':
        return generateApprovalEmailTemplate(data as ApprovalEmailData);
      case 'denial':
        return generateDenialEmailTemplate(data as DenialEmailData);
      case 'welcome':
        return generateWelcomeEmailTemplate(data as WelcomeEmailData);
      case 'expiry_warning':
        return generateExpiryWarningEmailTemplate(data as ExpiryWarningEmailData);
      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }
  }



  /**
   * Send email using Supabase or external email service
   * This is a placeholder implementation - in production, you would integrate with
   * an email service like SendGrid, AWS SES, Mailgun, etc.
   */
  private static async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<EmailResult> {
    const startTime = Date.now();
    
    try {
      // For now, we'll simulate email sending
      // In production, replace this with actual email service integration
      console.log('Sending email:', { to, subject });
      console.log('HTML content:', html);
      console.log('Text content:', text);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const deliveryTime = Date.now() - startTime;
      
      // Record performance metric
      await invitationPerformanceMonitor.recordEmailDelivery(
        'general', // email type would be determined from subject or context
        deliveryTime,
        true
      );
      
      // For development, we'll always return success
      // In production, this would be replaced with actual email service calls
      return {
        success: true,
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown email sending error';
      
      // Record performance metric for failed delivery
      await invitationPerformanceMonitor.recordEmailDelivery(
        'general',
        deliveryTime,
        false,
        errorMessage
      );
      
      console.error('Error sending email:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}