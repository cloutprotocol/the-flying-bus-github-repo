import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminService from '../adminService';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        limit: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateAdminPermissions', () => {
    it('should validate admin permissions successfully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null
            })
          })
        })
      });

      const result = await AdminService.validateAdminPermissions('admin-user-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(result.details?.hasAdminPermissions).toBe(true);
      expect(result.details?.role).toBe('admin');
    });

    it('should reject non-admin users', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'reader' },
              error: null
            })
          })
        })
      });

      const result = await AdminService.validateAdminPermissions('regular-user-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(result.details?.hasAdminPermissions).toBe(false);
      expect(result.details?.role).toBe('reader');
    });

    it('should handle database errors', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      });

      const result = await AdminService.validateAdminPermissions('user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to validate permissions');
      expect(result.code).toBe('PERMISSION_VALIDATION_ERROR');
    });
  });

  describe('updateInvitationRequestStatus', () => {
    it('should use Edge Function for service role operations', async () => {
      const mockInvitation = {
        id: 'test-id',
        status: 'approved',
        parent_email: 'test@example.com'
      };

      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: true,
          data: mockInvitation,
          details: {
            statusUpdated: true,
            emailSent: true
          }
        },
        error: null
      });

      const result = await AdminService.updateInvitationRequestStatus(
        'test-id',
        'approved',
        'admin-user-id'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvitation);
      expect(result.details?.method).toBe('edge_function');
      
      expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-operations', {
        body: {
          operation: 'updateInvitationStatus',
          params: {
            invitationId: 'test-id',
            status: 'approved',
            reviewerId: 'admin-user-id',
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should use fallback when Edge Function fails', async () => {
      const mockInvitation = {
        id: 'test-id',
        status: 'approved',
        parent_email: 'test@example.com'
      };

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock Edge Function failure
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Network timeout',
          code: 'TIMEOUT_ERROR'
        },
        error: null
      });

      // Mock fallback database operation
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockInvitation,
                error: null
              })
            })
          })
        })
      });

      const result = await AdminService.updateInvitationRequestStatus(
        'test-id',
        'approved',
        'admin-user-id',
        { useServiceRole: true }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvitation);
      expect(result.details?.method).toBe('user_context_fallback');
      
      // Verify both Edge Function and fallback were attempted
      expect(supabase.functions.invoke).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('invitation_requests');
    });

    it('should skip service role when disabled', async () => {
      const mockInvitation = {
        id: 'test-id',
        status: 'denied',
        parent_email: 'test@example.com'
      };

      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockInvitation,
                error: null
              })
            })
          })
        })
      });

      const result = await AdminService.updateInvitationRequestStatus(
        'test-id',
        'denied',
        'admin-user-id',
        { useServiceRole: false }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInvitation);
      expect(result.details?.method).toBe('user_context_fallback');
      
      // Verify Edge Function was not called
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('invitation_requests');
    });

    it('should handle Edge Function errors properly', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValue({
        data: null,
        error: { message: 'Function not found' }
      });

      const result = await AdminService.updateInvitationRequestStatus(
        'test-id',
        'approved',
        'admin-user-id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Edge Function error');
      expect(result.retryable).toBe(false); // Function not found is not retryable
    });
  });

  describe('logAdminAction', () => {
    it('should log admin actions via Edge Function', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: true,
          data: { id: 'log-id' }
        },
        error: null
      });

      const result = await AdminService.logAdminAction(
        'invitation_approved',
        'invitation_request',
        'test-id',
        'admin-user-id',
        { additional: 'metadata' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'log-id' });
      
      expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-operations', {
        body: {
          operation: 'logAdminAction',
          params: {
            action: 'invitation_approved',
            resourceType: 'invitation_request',
            resourceId: 'test-id',
            userId: 'admin-user-id',
            metadata: { additional: 'metadata' },
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should use fallback when Edge Function fails', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock Edge Function failure
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Service unavailable'
        },
        error: null
      });

      // Mock fallback database operation
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'fallback-log-id' },
              error: null
            })
          })
        })
      });

      const result = await AdminService.logAdminAction(
        'invitation_approved',
        'invitation_request',
        'test-id',
        'admin-user-id'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'fallback-log-id' });
      expect(result.details?.method).toBe('user_context_fallback');
    });
  });

  describe('sendAdminNotificationEmail', () => {
    it('should send emails via Edge Function', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: true,
          data: { messageId: 'test-message-id' }
        },
        error: null
      });

      const result = await AdminService.sendAdminNotificationEmail(
        'invitation_approved',
        'test@example.com',
        { parentName: 'John Doe' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ messageId: 'test-message-id' });
      
      expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-operations', {
        body: {
          operation: 'sendAdminEmail',
          params: {
            emailType: 'invitation_approved',
            recipientEmail: 'test@example.com',
            templateData: { parentName: 'John Doe' },
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should use regular email service as fallback', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock Edge Function calls - admin operations will fail (non-retryable), then regular email will succeed
      (supabase.functions.invoke as any)
        .mockResolvedValueOnce({
          data: {
            success: false,
            error: 'Function not found' // Non-retryable error
          },
          error: null
        })
        // Mock regular email service call (will succeed)
        .mockResolvedValueOnce({
          data: { messageId: 'fallback-message-id' },
          error: null
        });

      const result = await AdminService.sendAdminNotificationEmail(
        'invitation_approved',
        'test@example.com',
        { parentName: 'John Doe' },
        { useServiceRole: true } // Use service role so it tries admin operations first, then falls back
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ messageId: 'fallback-message-id' });
      expect(result.details?.method).toBe('regular_email_service');
    });
  });

  describe('getOperationStatus', () => {
    it('should return healthy status when all systems are working', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock database connectivity test
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{}],
            error: null
          })
        })
      });

      // Mock Edge Function health check
      (supabase.functions.invoke as any).mockResolvedValue({
        data: { success: true },
        error: null
      });

      const result = await AdminService.getOperationStatus();

      expect(result.success).toBe(true);
      expect(result.data?.databaseConnectivity).toBe('ok');
      expect(result.data?.edgeFunctionStatus).toBe('available');
    });

    it('should handle database connectivity issues', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection failed' }
          })
        })
      });

      const result = await AdminService.getOperationStatus();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connectivity test failed');
      expect(result.code).toBe('HEALTH_CHECK_FAILED');
    });
  });

  describe('error handling', () => {
    it('should categorize timeout errors correctly', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.functions.invoke as any).mockRejectedValue(
        new Error('Request timeout')
      );

      const result = await AdminService.updateInvitationRequestStatus(
        'test-id',
        'approved',
        'admin-user-id'
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('TIMEOUT_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should categorize permission errors correctly', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Permission denied',
          code: 'PERMISSION_ERROR'
        },
        error: null
      });

      const result = await AdminService.updateInvitationRequestStatus(
        'test-id',
        'approved',
        'admin-user-id'
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('PERMISSION_ERROR');
      expect(result.retryable).toBe(false);
    });

    it('should handle retry logic correctly', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Mock first two calls to fail, third to succeed
      (supabase.functions.invoke as any)
        .mockResolvedValueOnce({
          data: {
            success: false,
            error: 'Temporary failure'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            success: false,
            error: 'Still failing'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { id: 'success-id' }
          },
          error: null
        });

      const result = await AdminService.updateInvitationRequestStatus(
        'test-id',
        'approved',
        'admin-user-id',
        { retryAttempts: 3 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'success-id' });
      expect(result.details?.attempt).toBe(3);
      
      // Verify retry attempts
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(3);
    });
  });
});