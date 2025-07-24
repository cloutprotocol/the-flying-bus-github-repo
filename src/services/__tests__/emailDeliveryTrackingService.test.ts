import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailDeliveryTrackingService } from '../emailDeliveryTrackingService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/utils/logger/logger');

const mockSupabase = vi.mocked(supabase);

describe('EmailDeliveryTrackingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackEmailDelivery', () => {
    it('should track successful email delivery', async () => {
      const mockNotificationId = 'notification-123';
      const mockMessageId = 'msg-123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockNotificationId },
            error: null
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.trackEmailDelivery(
        mockNotificationId,
        'sent',
        mockMessageId
      );

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('email_notifications');
    });

    it('should track failed email delivery', async () => {
      const mockNotificationId = 'notification-123';
      const mockErrorMessage = 'SMTP connection failed';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockNotificationId },
            error: null
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.trackEmailDelivery(
        mockNotificationId,
        'failed',
        undefined,
        mockErrorMessage
      );

      expect(result).toBe(true);
    });

    it('should handle tracking errors', async () => {
      const mockNotificationId = 'notification-123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.trackEmailDelivery(
        mockNotificationId,
        'sent',
        'msg-123'
      );

      expect(result).toBe(false);
    });

    it('should handle exceptions during tracking', async () => {
      const mockNotificationId = 'notification-123';

      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await EmailDeliveryTrackingService.trackEmailDelivery(
        mockNotificationId,
        'sent',
        'msg-123'
      );

      expect(result).toBe(false);
    });
  });

  describe('getFailedEmailsForRetry', () => {
    it('should return failed emails eligible for retry', async () => {
      const mockFailedEmails = [
        {
          id: 'notification-1',
          invitation_request_id: 'invitation-1',
          email_type: 'approval',
          recipient_email: 'user1@example.com',
          delivery_status: 'failed',
          error_message: 'SMTP timeout',
          created_at: new Date().toISOString()
        },
        {
          id: 'notification-2',
          invitation_request_id: 'invitation-2',
          email_type: 'welcome',
          recipient_email: 'user2@example.com',
          delivery_status: 'failed',
          error_message: 'Connection refused',
          created_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockFailedEmails,
                  error: null
                })
              })
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getFailedEmailsForRetry();

      expect(result).toEqual(mockFailedEmails);
    });

    it('should handle errors when fetching failed emails', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
                })
              })
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getFailedEmailsForRetry();

      expect(result).toEqual([]);
    });
  });

  describe('markEmailForRetry', () => {
    it('should mark email for retry successfully', async () => {
      const mockNotificationId = 'notification-123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockNotificationId },
            error: null
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.markEmailForRetry(mockNotificationId);

      expect(result).toBe(true);
    });

    it('should handle retry marking errors', async () => {
      const mockNotificationId = 'notification-123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.markEmailForRetry(mockNotificationId);

      expect(result).toBe(false);
    });
  });

  describe('handleEmailBounce', () => {
    it('should handle hard bounces', async () => {
      const mockNotificationId = 'notification-123';
      const mockBounceReason = 'Mailbox does not exist';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockNotificationId },
            error: null
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.handleEmailBounce(
        mockNotificationId,
        'hard',
        mockBounceReason
      );

      expect(result).toBe(true);
    });

    it('should handle soft bounces', async () => {
      const mockNotificationId = 'notification-123';
      const mockBounceReason = 'Mailbox full';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockNotificationId },
            error: null
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.handleEmailBounce(
        mockNotificationId,
        'soft',
        mockBounceReason
      );

      expect(result).toBe(true);
    });

    it('should handle complaints', async () => {
      const mockNotificationId = 'notification-123';
      const mockBounceReason = 'User marked as spam';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockNotificationId },
            error: null
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.handleEmailBounce(
        mockNotificationId,
        'complaint',
        mockBounceReason
      );

      expect(result).toBe(true);
    });

    it('should handle bounce processing errors', async () => {
      const mockNotificationId = 'notification-123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.handleEmailBounce(
        mockNotificationId,
        'hard',
        'Mailbox does not exist'
      );

      expect(result).toBe(false);
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics', async () => {
      const mockStats = [
        { delivery_status: 'sent', count: 100 },
        { delivery_status: 'failed', count: 10 },
        { delivery_status: 'bounced', count: 5 },
        { delivery_status: 'pending', count: 2 }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          group: vi.fn().mockResolvedValue({
            data: mockStats,
            error: null
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getDeliveryStats();

      expect(result).toEqual({
        totalSent: 100,
        totalFailed: 10,
        totalBounced: 5,
        totalPending: 2,
        deliveryRate: 100 / 117, // 100 / (100 + 10 + 5 + 2)
        failureRate: 15 / 117 // (10 + 5) / (100 + 10 + 5 + 2)
      });
    });

    it('should handle stats fetch errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          group: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getDeliveryStats();

      expect(result).toEqual({
        totalSent: 0,
        totalFailed: 0,
        totalBounced: 0,
        totalPending: 0,
        deliveryRate: 0,
        failureRate: 0
      });
    });
  });

  describe('getEmailHealthStatus', () => {
    it('should return healthy status when delivery rate is good', async () => {
      const mockStats = [
        { delivery_status: 'sent', count: 95 },
        { delivery_status: 'failed', count: 3 },
        { delivery_status: 'bounced', count: 2 }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            group: vi.fn().mockResolvedValue({
              data: mockStats,
              error: null
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getEmailHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.deliveryRate).toBe(0.95);
    });

    it('should return warning status when delivery rate is moderate', async () => {
      const mockStats = [
        { delivery_status: 'sent', count: 80 },
        { delivery_status: 'failed', count: 15 },
        { delivery_status: 'bounced', count: 5 }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            group: vi.fn().mockResolvedValue({
              data: mockStats,
              error: null
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getEmailHealthStatus();

      expect(result.status).toBe('warning');
      expect(result.deliveryRate).toBe(0.8);
    });

    it('should return critical status when delivery rate is poor', async () => {
      const mockStats = [
        { delivery_status: 'sent', count: 60 },
        { delivery_status: 'failed', count: 30 },
        { delivery_status: 'bounced', count: 10 }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            group: vi.fn().mockResolvedValue({
              data: mockStats,
              error: null
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getEmailHealthStatus();

      expect(result.status).toBe('critical');
      expect(result.deliveryRate).toBe(0.6);
    });

    it('should handle health check errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            group: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getEmailHealthStatus();

      expect(result.status).toBe('unknown');
      expect(result.message).toContain('Unable to determine');
    });
  });

  describe('getDeliveryHistory', () => {
    it('should return delivery history for invitation', async () => {
      const mockInvitationId = 'invitation-123';
      const mockHistory = [
        {
          id: 'notification-1',
          email_type: 'approval',
          delivery_status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null
        },
        {
          id: 'notification-2',
          email_type: 'welcome',
          delivery_status: 'failed',
          sent_at: null,
          error_message: 'SMTP timeout'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockHistory,
              error: null
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getDeliveryHistory(mockInvitationId);

      expect(result.data).toEqual(mockHistory);
      expect(result.error).toBeUndefined();
    });

    it('should handle history fetch errors', async () => {
      const mockInvitationId = 'invitation-123';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.getDeliveryHistory(mockInvitationId);

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('DELIVERY_HISTORY_FETCH_FAILED');
    });
  });

  describe('cleanupOldDeliveryRecords', () => {
    it('should cleanup old delivery records', async () => {
      const mockDeletedRecords = [
        { id: 'notification-1' },
        { id: 'notification-2' }
      ];

      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: mockDeletedRecords,
              error: null
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.cleanupOldDeliveryRecords(90);

      expect(result.deletedCount).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should handle cleanup errors', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any);

      const result = await EmailDeliveryTrackingService.cleanupOldDeliveryRecords(90);

      expect(result.deletedCount).toBe(0);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('DELIVERY_CLEANUP_FAILED');
    });
  });
});