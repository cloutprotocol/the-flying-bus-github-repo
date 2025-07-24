import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { EmailNotificationService } from '../emailNotificationService';
import { invitationTokenService } from '../invitationTokenService';
import { invitationClaimService } from '../invitationClaimService';
import { InvitationWorkflowService } from '../invitationWorkflowService';
import { updateInvitationRequestStatus } from '../invitationService';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn()
    }
  }
}));

vi.mock('@/utils/logger/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn()
  },
  logMessage: vi.fn()
}));

const mockSupabase = vi.mocked(supabase);

describe('Invitation Workflow End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis()
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Parent Invitation Journey', () => {
    it('should execute complete workflow from invitation approval to account creation', async () => {
      const mockInvitationId = 'invitation-journey-123';
      const mockToken = 'journey-token-abc';
      const mockUserId = 'user-journey-456';

      // Step 1: Token generation
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'token-journey-123',
                invitation_request_id: mockInvitationId,
                token: mockToken,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                used_at: null,
                created_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      } as any);

      const tokenResult = await invitationTokenService.generateToken(mockInvitationId);
      expect(tokenResult.data).toBeDefined();
      expect(tokenResult.data?.token).toBe(mockToken);

      // Step 2: Email notification
      const mockInvitation = {
        id: mockInvitationId,
        parent_name: 'Journey Parent',
        parent_email: 'journey@example.com',
        child_name: 'Journey Child',
        child_age: 10,
        status: 'approved',
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: 'Complete journey test',
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: [],
        token: tokenResult.data
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockInvitation,
              error: null
            })
          })
        })
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: {
            id: 'notification-journey-123',
            invitation_request_id: mockInvitationId,
            email_type: 'approval',
            recipient_email: 'journey@example.com',
            delivery_status: 'pending',
            sent_at: null,
            error_message: null,
            created_at: new Date().toISOString()
          },
          error: null
        })
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: 'notification-journey-123' },
            error: null
          })
        })
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockInvitationId },
            error: null
          })
        })
      } as any);

      const emailResult = await EmailNotificationService.sendApprovalEmail(mockInvitationId);
      expect(emailResult.success).toBe(true);

      // Step 3: Token validation
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...tokenResult.data,
                invitation_request: {
                  id: mockInvitationId,
                  parent_email: 'journey@example.com',
                  child_name: 'Journey Child',
                  status: 'approved'
                }
              },
              error: null
            })
          })
        })
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockInvitationId,
                parent_email: 'journey@example.com',
                child_name: 'Journey Child',
                child_age: 10,
                status: 'approved'
              },
              error: null
            })
          })
        })
      } as any);

      const tokenValidation = await invitationClaimService.validateTokenForClaim(mockToken);
      expect(tokenValidation.data?.valid).toBe(true);
      expect(tokenValidation.data?.invitation?.parentEmail).toBe('journey@example.com');

      // Step 4: Account creation
      const claimFormData = {
        email: 'journey@example.com',
        displayName: 'Journey Parent',
        username: 'journeyparent',
        password: 'securepassword123',
        confirmPassword: 'securepassword123'
      };

      // Mock existing user check (no existing user)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      } as any);

      // Mock token validation for claim
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...tokenResult.data,
                invitation_request: {
                  id: mockInvitationId,
                  parent_email: 'journey@example.com',
                  child_name: 'Journey Child',
                  status: 'approved'
                }
              },
              error: null
            })
          })
        })
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockInvitationId,
                parent_email: 'journey@example.com',
                child_name: 'Journey Child',
                child_age: 10,
                status: 'approved'
              },
              error: null
            })
          })
        })
      } as any);

      // Mock auth user creation
      (mockSupabase.auth.signUp as any).mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock profile creation
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: mockUserId },
              error: null
            })
          })
        })
      } as any);

      // Mock token marking as used
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: tokenResult.data?.id },
            error: null
          })
        })
      } as any);

      // Mock invitation linking
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockInvitationId },
            error: null
          })
        })
      } as any);

      const claimResult = await invitationClaimService.claimInvitation(mockToken, claimFormData);
      expect(claimResult.data?.success).toBe(true);
      expect(claimResult.data?.userId).toBe(mockUserId);
      expect(claimResult.data?.isNewUser).toBe(true);

      // Verify the complete workflow was executed
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'journey@example.com',
        password: 'securepassword123'
      });
    });
  });

  describe('Admin Management Workflows', () => {
    it('should handle complete admin workflow from approval to monitoring', async () => {
      const mockInvitationId = 'invitation-admin-123';
      const mockAdminId = 'admin-456';

      // Step 1: Admin approves invitation
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: {
              id: mockInvitationId,
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              reviewer_id: mockAdminId
            },
            error: null
          })
        })
      } as any);

      const approvalResult = await updateInvitationRequestStatus(
        mockInvitationId,
        'approved',
        mockAdminId
      );
      expect(approvalResult.success).toBe(true);

      // Step 2: Admin monitors invitation status
      const mockEnhancedInvitation = {
        id: mockInvitationId,
        parent_name: 'Admin Test Parent',
        parent_email: 'admintest@example.com',
        child_name: 'Admin Test Child',
        child_age: 9,
        status: 'approved',
        created_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewer_id: mockAdminId,
        child_user_id: null,
        invitation_claimed_at: null,
        notification_sent_at: new Date().toISOString(),
        notification_status: 'sent',
        notifications: [
          {
            id: 'notification-admin-123',
            email_type: 'approval',
            delivery_status: 'sent',
            sent_at: new Date().toISOString()
          }
        ],
        token: {
          id: 'token-admin-123',
          token: 'admin-token-abc',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          used_at: null
        }
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockEnhancedInvitation,
              error: null
            })
          })
        })
      } as any);

      const enhancedInvitation = await InvitationWorkflowService.getEnhancedInvitationRequest(mockInvitationId);
      expect(enhancedInvitation).toBeDefined();
      expect(enhancedInvitation?.status).toBe('approved');
      expect(enhancedInvitation?.notification_status).toBe('sent');
      expect(enhancedInvitation?.notifications).toHaveLength(1);
    });
  });

  describe('Error Scenarios and Recovery Processes', () => {
    it('should handle expired token scenario', async () => {
      const mockExpiredToken = 'expired-token-123';

      // Mock expired token data
      const mockExpiredTokenData = {
        id: 'token-expired',
        token: mockExpiredToken,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        used_at: null,
        invitation_request: {
          id: 'invitation-expired',
          parent_email: 'expired@example.com',
          child_name: 'Expired Child',
          status: 'approved'
        }
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockExpiredTokenData,
              error: null
            })
          })
        })
      } as any);

      const expiredTokenValidation = await invitationTokenService.validateToken(mockExpiredToken);
      expect(expiredTokenValidation.data?.isValid).toBe(false);
      // Token is expired, so validation should fail
    });

    it('should handle email mismatch during claim process', async () => {
      const mockToken = 'mismatch-token-123';
      const mockInvitationId = 'invitation-mismatch';

      // Mock token validation
      const mockTokenData = {
        id: 'token-mismatch',
        token: mockToken,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        used_at: null,
        invitation_request: {
          id: mockInvitationId,
          parent_email: 'original@example.com',
          child_name: 'Mismatch Child',
          status: 'approved'
        }
      };

      const mockInvitationData = {
        id: mockInvitationId,
        parent_email: 'original@example.com',
        child_name: 'Mismatch Child',
        child_age: 11,
        status: 'approved'
      };

      // Mock token validation calls
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockTokenData,
              error: null
            })
          })
        })
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockInvitationData,
              error: null
            })
          })
        })
      } as any);

      const claimFormData = {
        email: 'different@example.com', // Different email
        displayName: 'Different User',
        username: 'differentuser',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const claimResult = await invitationClaimService.claimInvitation(mockToken, claimFormData);
      expect(claimResult.error).toBeDefined();
      expect(claimResult.error?.code).toBe('EMAIL_MISMATCH');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track performance metrics throughout workflow', async () => {
      const startTime = Date.now();
      const mockInvitationId = 'invitation-performance-123';
      const mockToken = 'performance-token-abc';

      // Token generation (should be fast)
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'token-performance-123',
                invitation_request_id: mockInvitationId,
                token: mockToken,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                used_at: null,
                created_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      } as any);

      const tokenGenStart = Date.now();
      const tokenResult = await invitationTokenService.generateToken(mockInvitationId);
      const tokenGenTime = Date.now() - tokenGenStart;

      expect(tokenResult.data).toBeDefined();
      expect(tokenGenTime).toBeLessThan(1000); // Should complete within 1 second

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(5000); // Should be fast overall
    });
  });
});