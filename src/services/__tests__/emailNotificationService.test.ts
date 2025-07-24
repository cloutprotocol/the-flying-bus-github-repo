// Tests for EmailNotificationService
// These tests verify the email notification functionality for the invitation approval workflow

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailNotificationService } from '../emailNotificationService';
import { InvitationWorkflowService } from '../invitationWorkflowService';
import { EmailDeliveryTrackingService } from '../emailDeliveryTrackingService';
import type { InvitationWithDetails } from '@/types/InvitationWorkflowTypes';

// Mock the dependencies
vi.mock('../invitationWorkflowService');
vi.mock('../emailDeliveryTrackingService');
vi.mock('@/integrations/supabase/client');
vi.mock('../invitationPerformanceMonitor', () => ({
  invitationPerformanceMonitor: {
    recordEmailDelivery: vi.fn()
  }
}));

describe('EmailNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendApprovalEmail', () => {
    it('should send approval email successfully', async () => {
      // Mock invitation data
      const mockInvitation: InvitationWithDetails = {
        id: 'invitation-123',
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 12,
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        status: 'approved',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: [],
        token: {
          id: 'token-123',
          token: 'secure-token-123',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          invitation_request_id: 'invitation-123',
          used_at: null,
          created_at: new Date().toISOString()
        }
      };

      const mockNotification = {
        id: 'notification-123',
        invitation_request_id: 'invitation-123',
        email_type: 'approval' as const,
        recipient_email: 'john@example.com',
        delivery_status: 'pending' as const,
        sent_at: null,
        error_message: null,
        created_at: new Date().toISOString()
      };

      // Setup mocks
      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(mockInvitation);
      vi.mocked(InvitationWorkflowService.createEmailNotification).mockResolvedValue(mockNotification);
      vi.mocked(InvitationWorkflowService.updateInvitationNotificationStatus).mockResolvedValue(true);
      vi.mocked(EmailDeliveryTrackingService.trackEmailDelivery).mockResolvedValue(true);

      // Mock the private sendEmail method by spying on the class
      const sendEmailSpy = vi.spyOn(EmailNotificationService as any, 'sendEmail').mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      });

      const result = await EmailNotificationService.sendApprovalEmail('invitation-123');

      expect(result.success).toBe(true);
      expect(InvitationWorkflowService.getEnhancedInvitationRequest).toHaveBeenCalledWith('invitation-123');
      expect(InvitationWorkflowService.createEmailNotification).toHaveBeenCalledWith(
        'invitation-123',
        'approval',
        'john@example.com'
      );
      expect(EmailDeliveryTrackingService.trackEmailDelivery).toHaveBeenCalledWith(
        'notification-123',
        'sent',
        'msg-123'
      );
    });

    it('should handle missing invitation', async () => {
      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(null);

      const result = await EmailNotificationService.sendApprovalEmail('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invitation not found');
    });

    it('should handle email sending failure', async () => {
      const mockInvitation: InvitationWithDetails = {
        id: 'invitation-123',
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 12,
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        status: 'approved',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: [],
        token: {
          id: 'token-123',
          token: 'secure-token-123',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          invitation_request_id: 'invitation-123',
          used_at: null,
          created_at: new Date().toISOString()
        }
      };

      const mockNotification = {
        id: 'notification-123',
        invitation_request_id: 'invitation-123',
        email_type: 'approval' as const,
        recipient_email: 'john@example.com',
        delivery_status: 'pending' as const,
        sent_at: null,
        error_message: null,
        created_at: new Date().toISOString()
      };

      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(mockInvitation);
      vi.mocked(InvitationWorkflowService.createEmailNotification).mockResolvedValue(mockNotification);
      vi.mocked(EmailDeliveryTrackingService.trackEmailDelivery).mockResolvedValue(true);

      // Mock email sending failure
      const sendEmailSpy = vi.spyOn(EmailNotificationService as any, 'sendEmail').mockResolvedValue({
        success: false,
        error: 'SMTP connection failed'
      });

      const result = await EmailNotificationService.sendApprovalEmail('invitation-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send email after 3 attempts');
      expect(EmailDeliveryTrackingService.trackEmailDelivery).toHaveBeenCalledWith(
        'notification-123',
        'failed',
        undefined,
        'SMTP connection failed'
      );
    });
  });

  describe('sendDenialEmail', () => {
    it('should send denial email successfully', async () => {
      const mockInvitation: InvitationWithDetails = {
        id: 'invitation-123',
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 12,
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        status: 'denied',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: []
      };

      const mockNotification = {
        id: 'notification-123',
        invitation_request_id: 'invitation-123',
        email_type: 'denial' as const,
        recipient_email: 'john@example.com',
        delivery_status: 'pending' as const,
        sent_at: null,
        error_message: null,
        created_at: new Date().toISOString()
      };

      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(mockInvitation);
      vi.mocked(InvitationWorkflowService.createEmailNotification).mockResolvedValue(mockNotification);
      vi.mocked(InvitationWorkflowService.updateInvitationNotificationStatus).mockResolvedValue(true);
      vi.mocked(EmailDeliveryTrackingService.trackEmailDelivery).mockResolvedValue(true);

      const sendEmailSpy = vi.spyOn(EmailNotificationService as any, 'sendEmail').mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      });

      const result = await EmailNotificationService.sendDenialEmail('invitation-123', 'Age requirements not met');

      expect(result.success).toBe(true);
      expect(InvitationWorkflowService.createEmailNotification).toHaveBeenCalledWith(
        'invitation-123',
        'denial',
        'john@example.com'
      );
    });
  });

  describe('getNotificationStatus', () => {
    it('should return notification status for invitation', async () => {
      const mockNotifications = [
        {
          id: 'notification-1',
          invitation_request_id: 'invitation-123',
          email_type: 'approval' as const,
          recipient_email: 'john@example.com',
          delivery_status: 'sent' as const,
          sent_at: new Date().toISOString(),
          error_message: null,
          created_at: new Date().toISOString()
        },
        {
          id: 'notification-2',
          invitation_request_id: 'invitation-123',
          email_type: 'welcome' as const,
          recipient_email: 'john@example.com',
          delivery_status: 'failed' as const,
          sent_at: null,
          error_message: 'SMTP timeout',
          created_at: new Date().toISOString()
        }
      ];

      vi.mocked(InvitationWorkflowService.getEmailNotificationsByInvitation).mockResolvedValue(mockNotifications);

      const result = await EmailNotificationService.getNotificationStatus('invitation-123');

      expect(result).toEqual({
        notifications: mockNotifications,
        hasApprovalEmail: true,
        hasDenialEmail: false,
        hasWelcomeEmail: true,
        hasExpiryWarning: false,
        lastEmailSent: mockNotifications[0].sent_at,
        failedEmails: 1
      });
    });
  });

  describe('retryFailedEmails', () => {
    it('should retry failed emails successfully', async () => {
      const mockFailedEmails = [
        {
          id: 'notification-1',
          invitation_request_id: 'invitation-123',
          email_type: 'approval' as const,
          recipient_email: 'john@example.com',
          delivery_status: 'failed' as const,
          sent_at: null,
          error_message: 'SMTP timeout',
          created_at: new Date().toISOString()
        }
      ];

      const mockInvitation: InvitationWithDetails = {
        id: 'invitation-123',
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 12,
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        status: 'approved',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: [],
        token: {
          id: 'token-123',
          token: 'secure-token-123',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          invitation_request_id: 'invitation-123',
          used_at: null,
          created_at: new Date().toISOString()
        }
      };

      vi.mocked(EmailDeliveryTrackingService.getFailedEmailsForRetry).mockResolvedValue(mockFailedEmails);
      vi.mocked(EmailDeliveryTrackingService.markEmailForRetry).mockResolvedValue(true);
      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(mockInvitation);

      // Mock the sendApprovalEmail method
      const sendApprovalEmailSpy = vi.spyOn(EmailNotificationService, 'sendApprovalEmail').mockResolvedValue({
        success: true,
        messageId: 'msg-retry-123'
      });

      const result = await EmailNotificationService.retryFailedEmails();

      expect(result.retried).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(EmailDeliveryTrackingService.markEmailForRetry).toHaveBeenCalledWith('notification-1');
      expect(sendApprovalEmailSpy).toHaveBeenCalledWith('invitation-123');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const mockInvitation: InvitationWithDetails = {
        id: 'invitation-123',
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 12,
        child_user_id: 'user-123',
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        status: 'approved',
        invitation_claimed_at: new Date().toISOString(),
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: []
      };

      const mockNotification = {
        id: 'notification-123',
        invitation_request_id: 'invitation-123',
        email_type: 'welcome' as const,
        recipient_email: 'john@example.com',
        delivery_status: 'pending' as const,
        sent_at: null,
        error_message: null,
        created_at: new Date().toISOString()
      };

      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(mockInvitation);
      vi.mocked(InvitationWorkflowService.createEmailNotification).mockResolvedValue(mockNotification);
      vi.mocked(EmailDeliveryTrackingService.trackEmailDelivery).mockResolvedValue(true);

      const sendEmailSpy = vi.spyOn(EmailNotificationService as any, 'sendEmail').mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      });

      const result = await EmailNotificationService.sendWelcomeEmail('invitation-123', 'user-123');

      expect(result.success).toBe(true);
      expect(InvitationWorkflowService.createEmailNotification).toHaveBeenCalledWith(
        'invitation-123',
        'welcome',
        'john@example.com'
      );
    });

    it('should handle missing invitation for welcome email', async () => {
      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(null);

      const result = await EmailNotificationService.sendWelcomeEmail('invalid-id', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invitation not found');
    });
  });

  describe('sendExpiryWarningEmail', () => {
    it('should send expiry warning email successfully', async () => {
      const mockInvitation: InvitationWithDetails = {
        id: 'invitation-123',
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 12,
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        status: 'approved',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: [],
        token: {
          id: 'token-123',
          token: 'secure-token-123',
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          invitation_request_id: 'invitation-123',
          used_at: null,
          created_at: new Date().toISOString()
        }
      };

      const mockNotification = {
        id: 'notification-123',
        invitation_request_id: 'invitation-123',
        email_type: 'expiry_warning' as const,
        recipient_email: 'john@example.com',
        delivery_status: 'pending' as const,
        sent_at: null,
        error_message: null,
        created_at: new Date().toISOString()
      };

      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(mockInvitation);
      vi.mocked(InvitationWorkflowService.createEmailNotification).mockResolvedValue(mockNotification);
      vi.mocked(EmailDeliveryTrackingService.trackEmailDelivery).mockResolvedValue(true);

      const sendEmailSpy = vi.spyOn(EmailNotificationService as any, 'sendEmail').mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      });

      const result = await EmailNotificationService.sendExpiryWarningEmail('invitation-123');

      expect(result.success).toBe(true);
      expect(InvitationWorkflowService.createEmailNotification).toHaveBeenCalledWith(
        'invitation-123',
        'expiry_warning',
        'john@example.com'
      );
    });

    it('should handle missing token for expiry warning', async () => {
      const mockInvitation: InvitationWithDetails = {
        id: 'invitation-123',
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 12,
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        status: 'approved',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: []
      };

      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(mockInvitation);

      const result = await EmailNotificationService.sendExpiryWarningEmail('invitation-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invitation or token not found');
    });
  });

  describe('handleEmailBounce', () => {
    it('should handle email bounce successfully', async () => {
      const mockNotifications = [
        { id: 'notification-123' }
      ];

      vi.mocked(EmailDeliveryTrackingService.handleEmailBounce).mockResolvedValue(true);

      // Mock supabase query for finding notifications
      const mockSupabase = await import('@/integrations/supabase/client');
      vi.mocked(mockSupabase.supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockNotifications,
                error: null
              })
            })
          })
        })
      } as any);

      const result = await EmailNotificationService.handleEmailBounce(
        'msg-123',
        'hard',
        'Mailbox does not exist'
      );

      expect(result).toBe(true);
      expect(EmailDeliveryTrackingService.handleEmailBounce).toHaveBeenCalledWith(
        'notification-123',
        'hard',
        'Mailbox does not exist'
      );
    });
  });

  describe('getDeliveryStatistics', () => {
    it('should return delivery statistics', async () => {
      const mockStats = {
        totalSent: 100,
        totalFailed: 5,
        totalBounced: 2,
        deliveryRate: 0.93
      };

      vi.mocked(EmailDeliveryTrackingService.getDeliveryStats).mockResolvedValue(mockStats);

      const result = await EmailNotificationService.getDeliveryStatistics();

      expect(result).toEqual(mockStats);
    });

    it('should handle statistics fetch errors', async () => {
      vi.mocked(EmailDeliveryTrackingService.getDeliveryStats).mockRejectedValue(new Error('Database error'));

      const result = await EmailNotificationService.getDeliveryStatistics();

      expect(result).toBeNull();
    });
  });

  describe('getEmailHealthStatus', () => {
    it('should return email health status', async () => {
      const mockHealthStatus = {
        status: 'healthy',
        message: 'All systems operational'
      };

      vi.mocked(EmailDeliveryTrackingService.getEmailHealthStatus).mockResolvedValue(mockHealthStatus);

      const result = await EmailNotificationService.getEmailHealthStatus();

      expect(result).toEqual(mockHealthStatus);
    });

    it('should handle health check errors', async () => {
      vi.mocked(EmailDeliveryTrackingService.getEmailHealthStatus).mockRejectedValue(new Error('Service unavailable'));

      const result = await EmailNotificationService.getEmailHealthStatus();

      expect(result).toEqual({
        status: 'error',
        message: 'Unable to check email health'
      });
    });
  });

  describe('error handling', () => {
    it('should handle exceptions in sendApprovalEmail', async () => {
      // Clear all previous mocks first
      vi.clearAllMocks();
      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockRejectedValue(new Error('Database connection failed'));

      const result = await EmailNotificationService.sendApprovalEmail('invitation-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send approval email');
    });

    it('should handle notification creation failure', async () => {
      // Clear all previous mocks first
      vi.clearAllMocks();
      
      const mockInvitation: InvitationWithDetails = {
        id: 'invitation-123',
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 12,
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        status: 'approved',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: [],
        token: {
          id: 'token-123',
          token: 'secure-token-123',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          invitation_request_id: 'invitation-123',
          used_at: null,
          created_at: new Date().toISOString()
        }
      };

      vi.mocked(InvitationWorkflowService.getEnhancedInvitationRequest).mockResolvedValue(mockInvitation);
      vi.mocked(InvitationWorkflowService.createEmailNotification).mockResolvedValue(null);

      const result = await EmailNotificationService.sendApprovalEmail('invitation-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create email notification record');
    });
  });
});