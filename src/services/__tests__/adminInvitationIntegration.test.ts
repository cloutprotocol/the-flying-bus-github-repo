import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateInvitationRequestStatus } from '../invitationService';
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

// Mock AdminService
vi.mock('../adminService', () => ({
  default: {
    validateAdminPermissions: vi.fn(),
    updateInvitationRequestStatus: vi.fn()
  }
}));

// Mock other services
vi.mock('../auditLogService', () => ({
  default: {
    logEvent: vi.fn()
  }
}));

vi.mock('../rateLimitService', () => ({
  default: {
    checkRateLimit: vi.fn(),
    recordAttempt: vi.fn()
  }
}));

vi.mock('../inputSanitizationService', () => ({
  default: {
    sanitizeInvitationRequest: vi.fn()
  }
}));

vi.mock('../authenticatedApiService', () => ({
  AuthenticatedApiService: {
    sendEmail: vi.fn()
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

describe('Admin-Invitation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateInvitationRequestStatus with AdminService integration', () => {
    it('should successfully update invitation status using AdminService', async () => {
      const mockInvitation = {
        id: 'test-invitation-id',
        status: 'approved',
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        parent_email: 'john@example.com',
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-user-id'
      };

      // Mock AdminService methods
      const mockAdminService = AdminService as any;
      mockAdminService.validateAdminPermissions.mockResolvedValue({
        success: true,
        data: true,
        details: {
          userId: 'admin-user-id',
          role: 'admin',
          hasAdminPermissions: true
        }
      });

      mockAdminService.updateInvitationRequestStatus.mockResolvedValue({
        success: true,
        data: mockInvitation,
        details: {
          method: 'admin_service',
          statusUpdated: true,
          emailSent: true,
          emailMethod: 'edge_function'
        }
      });

      const result = await updateInvitationRequestStatus(
        'test-invitation-id',
        'approved',
        'admin-user-id'
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockInvitation);
      expect(result.details?.method).toBe('admin_service');
      expect(result.details?.statusUpdated).toBe(true);

      // Verify AdminService was called correctly
      expect(mockAdminService.validateAdminPermissions).toHaveBeenCalledWith('admin-user-id');
      expect(mockAdminService.updateInvitationRequestStatus).toHaveBeenCalledWith(
        'test-invitation-id',
        'approved',
        'admin-user-id',
        {
          useServiceRole: true,
          timeout: 30000,
          retryAttempts: 3
        }
      );
    });

    it('should reject non-admin users', async () => {
      // Mock AdminService permission validation failure
      const mockAdminService = AdminService as any;
      mockAdminService.validateAdminPermissions.mockResolvedValue({
        success: true,
        data: false,
        details: {
          userId: 'regular-user-id',
          role: 'reader',
          hasAdminPermissions: false
        }
      });

      const result = await updateInvitationRequestStatus(
        'test-invitation-id',
        'approved',
        'regular-user-id'
      );

      expect(result.error).toBe('Insufficient permissions to update invitation status');
      expect(result.code).toBe('PERMISSION_DENIED');
      expect(result.retryable).toBe(false);

      // Verify AdminService was called for permission check but not for update
      expect(mockAdminService.validateAdminPermissions).toHaveBeenCalledWith('regular-user-id');
      expect(mockAdminService.updateInvitationRequestStatus).not.toHaveBeenCalled();
    });

    it('should use fallback when AdminService fails with retryable error', async () => {
      const mockInvitation = {
        id: 'test-invitation-id',
        status: 'approved',
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        parent_email: 'john@example.com',
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-user-id'
      };

      // Mock AdminService methods
      const mockAdminService = AdminService as any;
      mockAdminService.validateAdminPermissions.mockResolvedValue({
        success: true,
        data: true,
        details: { role: 'admin', hasAdminPermissions: true }
      });

      // Mock AdminService failure with retryable error
      mockAdminService.updateInvitationRequestStatus.mockResolvedValue({
        success: false,
        error: 'Network timeout',
        code: 'TIMEOUT_ERROR',
        retryable: true
      });

      // Mock fallback database operation
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
            })
          })
        })
      });

      const result = await updateInvitationRequestStatus(
        'test-invitation-id',
        'approved',
        'admin-user-id'
      );

      expect(result.error).toBeUndefined();
      expect(result.data?.status).toBe('approved');
      expect(result.details?.method).toBe('fallback');
      expect(result.details?.warning).toContain('AdminService failed but fallback succeeded');

      // Verify both AdminService and fallback were attempted
      expect(mockAdminService.updateInvitationRequestStatus).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('invitation_requests');
    });

    it('should handle validation errors properly', async () => {
      const result = await updateInvitationRequestStatus('', 'approved', 'admin-user-id');

      expect(result.error).toBe('Missing required parameters for status update');
      expect(result.code).toBe('INVALID_UPDATE_PARAMS');
      expect(result.retryable).toBe(false);
    });

    it('should handle invalid status values', async () => {
      const result = await updateInvitationRequestStatus('test-id', 'invalid' as any, 'admin-user-id');

      expect(result.error).toBe('Invalid status value');
      expect(result.code).toBe('INVALID_STATUS');
      expect(result.retryable).toBe(false);
    });

    it('should not use fallback when AdminService fails with non-retryable error', async () => {
      // Mock AdminService methods
      const mockAdminService = AdminService as any;
      mockAdminService.validateAdminPermissions.mockResolvedValue({
        success: true,
        data: true,
        details: { role: 'admin', hasAdminPermissions: true }
      });

      // Mock AdminService failure with non-retryable error
      mockAdminService.updateInvitationRequestStatus.mockResolvedValue({
        success: false,
        error: 'Invalid invitation ID',
        code: 'VALIDATION_ERROR',
        retryable: false
      });

      const result = await updateInvitationRequestStatus('invalid-id', 'approved', 'admin-user-id');

      expect(result.error).toBe('Invalid invitation ID');
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.retryable).toBe(false);

      // Verify AdminService was called but fallback was not attempted
      expect(mockAdminService.updateInvitationRequestStatus).toHaveBeenCalled();
    });

    it('should handle AdminService permission validation errors', async () => {
      // Mock AdminService permission validation error
      const mockAdminService = AdminService as any;
      mockAdminService.validateAdminPermissions.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
        code: 'PERMISSION_VALIDATION_ERROR',
        retryable: false
      });

      const result = await updateInvitationRequestStatus('test-id', 'approved', 'admin-user-id');

      expect(result.error).toBe('Insufficient permissions to update invitation status');
      expect(result.code).toBe('PERMISSION_DENIED');
      expect(result.retryable).toBe(false);

      // Verify AdminService was called for permission check but not for update
      expect(mockAdminService.validateAdminPermissions).toHaveBeenCalledWith('admin-user-id');
      expect(mockAdminService.updateInvitationRequestStatus).not.toHaveBeenCalled();
    });
  });
});