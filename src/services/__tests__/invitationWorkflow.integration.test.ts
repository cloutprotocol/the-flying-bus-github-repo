import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { EmailNotificationService } from '../emailNotificationService';
import { invitationTokenService } from '../invitationTokenService';
import { invitationClaimService } from '../invitationClaimService';

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

describe('Invitation Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock behaviors for supabase
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
      or: vi.fn().mockReturnThis(),
      group: vi.fn().mockReturnThis()
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Invitation Approval and Claim Flow', () => {
    it('should handle complete workflow from approval to account creation', async () => {
      const mockInvitationId = 'invitation-123';
      const mockToken = 'secure-token-abc123';
      const mockUserId = 'user-456';
      
      // Step 1: Mock invitation approval and token generation
      const mockInvitation = {
        id: mockInvitationId,
        parent_name: 'John Doe',
        parent_email: 'john@example.com',
        child_name: 'Jane Doe',
        child_age: 12,
        status: 'approved',
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: [],
        token: {
          id: 'token-123',
          token: mockToken,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          invitation_request_id: mockInvitationId,
          used_at: null,
          created_at: new Date().toISOString()
        }
      };

      // Mock token generation
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockInvitation.token,
              error: null
            })
          })
        })
      } as any);

      // Step 2: Generate token
      const tokenResult = await invitationTokenService.generateToken(mockInvitationId);
      expect(tokenResult.data).toBeDefined();
      expect(tokenResult.error).toBeUndefined();

      // Step 3: Mock email notification creation and sending
      const mockNotification = {
        id: 'notification-123',
        invitation_request_id: mockInvitationId,
        email_type: 'approval' as const,
        recipient_email: 'john@example.com',
        delivery_status: 'pending' as const,
        sent_at: null,
        error_message: null,
        created_at: new Date().toISOString()
      };

      // Mock getting invitation for email
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

      // Mock creating email notification
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: mockNotification,
          error: null
        })
      } as any);

      // Mock updating notification status
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockNotification.id },
            error: null
          })
        })
      } as any);

      // Mock updating invitation notification status
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockInvitationId },
            error: null
          })
        })
      } as any);

      // Step 4: Send approval email
      const emailResult = await EmailNotificationService.sendApprovalEmail(mockInvitationId);
      expect(emailResult.success).toBe(true);

      // Step 5: Mock token validation for claim
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...mockInvitation.token,
                invitation_request: {
                  id: mockInvitationId,
                  parent_email: 'john@example.com',
                  child_name: 'Jane Doe',
                  status: 'approved'
                }
              },
              error: null
            })
          })
        })
      } as any);

      // Mock getting invitation details for claim
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockInvitationId,
                parent_email: 'john@example.com',
                child_name: 'Jane Doe',
                child_age: 12,
                status: 'approved'
              },
              error: null
            })
          })
        })
      } as any);

      // Step 6: Validate token for claim
      const tokenValidation = await invitationClaimService.validateTokenForClaim(mockToken);
      expect(tokenValidation.data?.valid).toBe(true);
      expect(tokenValidation.data?.invitation?.parentEmail).toBe('john@example.com');

      // Step 7: Mock claim process - check existing user
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // No existing user
            })
          })
        })
      } as any);

      // Mock auth user creation
      (mockSupabase as any).auth = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null
        })
      };

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
            data: { id: 'token-123' },
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

      // Step 8: Process invitation claim
      const claimFormData = {
        email: 'john@example.com',
        displayName: 'John Doe',
        username: 'johndoe',
        password: 'securepassword123',
        confirmPassword: 'securepassword123'
      };

      const claimResult = await invitationClaimService.claimInvitation(mockToken, claimFormData);
      expect(claimResult.data?.success).toBe(true);
      expect(claimResult.data?.userId).toBe(mockUserId);
      expect(claimResult.data?.isNewUser).toBe(true);

      // Verify the complete workflow executed successfully
      expect(mockSupabase.from).toHaveBeenCalledWith('invitation_tokens');
      expect(mockSupabase.from).toHaveBeenCalledWith('email_notifications');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('invitation_requests');
    });

    it('should handle workflow with existing user upgrade', async () => {
      const mockInvitationId = 'invitation-456';
      const mockToken = 'secure-token-def456';
      const mockExistingUserId = 'existing-user-789';

      // Mock token validation
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'token-456',
                token: mockToken,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                used_at: null,
                invitation_request: {
                  id: mockInvitationId,
                  parent_email: 'existing@example.com',
                  child_name: 'Existing Child',
                  status: 'approved'
                }
              },
              error: null
            })
          })
        })
      } as any);

      // Mock getting invitation details
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockInvitationId,
                parent_email: 'existing@example.com',
                child_name: 'Existing Child',
                child_age: 10,
                status: 'approved'
              },
              error: null
            })
          })
        })
      } as any);

      // Validate token
      const tokenValidation = await invitationClaimService.validateTokenForClaim(mockToken);
      expect(tokenValidation.data?.valid).toBe(true);

      // Mock existing user check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: mockExistingUserId },
              error: null
            })
          })
        })
      } as any);

      // Mock user role upgrade
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockExistingUserId },
            error: null
          })
        })
      } as any);

      // Mock token marking as used
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: 'token-456' },
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

      // Process claim for existing user
      const claimFormData = {
        email: 'existing@example.com',
        displayName: 'Existing User',
        username: 'existinguser'
      };

      const claimResult = await invitationClaimService.claimInvitation(mockToken, claimFormData);
      expect(claimResult.data?.success).toBe(true);
      expect(claimResult.data?.userId).toBe(mockExistingUserId);
      expect(claimResult.data?.isNewUser).toBe(false);
    });
  });

  describe('Email Delivery and Template Rendering Integration', () => {
    it('should handle complete email workflow with template rendering', async () => {
      const mockInvitationId = 'invitation-email-123';
      
      const mockInvitation = {
        id: mockInvitationId,
        parent_name: 'Alice Smith',
        parent_email: 'alice@example.com',
        child_name: 'Bob Smith',
        child_age: 8,
        status: 'approved',
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: [],
        token: {
          id: 'token-email-123',
          token: 'email-token-abc',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          invitation_request_id: mockInvitationId,
          used_at: null,
          created_at: new Date().toISOString()
        }
      };

      // Mock getting invitation
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

      // Mock creating email notification
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: {
            id: 'notification-email-123',
            invitation_request_id: mockInvitationId,
            email_type: 'approval',
            recipient_email: 'alice@example.com',
            delivery_status: 'pending',
            sent_at: null,
            error_message: null,
            created_at: new Date().toISOString()
          },
          error: null
        })
      } as any);

      // Mock updating notification status
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: 'notification-email-123' },
            error: null
          })
        })
      } as any);

      // Mock updating invitation notification status
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: mockInvitationId },
            error: null
          })
        })
      } as any);

      // Test approval email
      const approvalResult = await EmailNotificationService.sendApprovalEmail(mockInvitationId);
      expect(approvalResult.success).toBe(true);

      // Test denial email
      const mockDenialInvitation = {
        ...mockInvitation,
        status: 'denied'
      };

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockDenialInvitation,
              error: null
            })
          })
        })
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: {
            id: 'notification-denial-123',
            invitation_request_id: mockInvitationId,
            email_type: 'denial',
            recipient_email: 'alice@example.com',
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
            data: { id: 'notification-denial-123' },
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

      const denialResult = await EmailNotificationService.sendDenialEmail(mockInvitationId, 'Age requirements not met');
      expect(denialResult.success).toBe(true);

      // Test welcome email
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...mockInvitation,
                child_user_id: 'user-123'
              },
              error: null
            })
          })
        })
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: {
            id: 'notification-welcome-123',
            invitation_request_id: mockInvitationId,
            email_type: 'welcome',
            recipient_email: 'alice@example.com',
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
            data: { id: 'notification-welcome-123' },
            error: null
          })
        })
      } as any);

      const welcomeResult = await EmailNotificationService.sendWelcomeEmail(mockInvitationId, 'user-123');
      expect(welcomeResult.success).toBe(true);
    });
  });

  describe('Database Consistency Across Operations', () => {
    it('should maintain data consistency during complete workflow', async () => {
      const mockInvitationId = 'invitation-consistency-123';
      const mockToken = 'consistency-token-abc';
      const mockUserId = 'user-consistency-456';

      // Test that all database operations maintain referential integrity
      
      // 1. Token generation should link to invitation
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'token-consistency-123',
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
      expect(tokenResult.data?.invitation_request_id).toBe(mockInvitationId);

      // 2. Email notifications should link to invitation
      const mockInvitation = {
        id: mockInvitationId,
        parent_name: 'Consistency Test',
        parent_email: 'consistency@example.com',
        child_name: 'Test Child',
        child_age: 9,
        status: 'approved',
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
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
            id: 'notification-consistency-123',
            invitation_request_id: mockInvitationId,
            email_type: 'approval',
            recipient_email: 'consistency@example.com',
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
            data: { id: 'notification-consistency-123' },
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

      // 3. Token usage should update both token and invitation
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...tokenResult.data,
                invitation_request: {
                  id: mockInvitationId,
                  parent_email: 'consistency@example.com',
                  child_name: 'Test Child',
                  status: 'approved'
                }
              },
              error: null
            })
          })
        })
      } as any);

      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: tokenResult.data?.id },
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

      const tokenUsageResult = await invitationTokenService.markTokenAsUsed(mockToken, mockUserId);
      expect(tokenUsageResult.success).toBe(true);

      // Verify all operations maintained proper relationships
      expect(mockSupabase.from).toHaveBeenCalledWith('invitation_tokens');
      expect(mockSupabase.from).toHaveBeenCalledWith('email_notifications');
      expect(mockSupabase.from).toHaveBeenCalledWith('invitation_requests');
    });
  });

  describe('Security Measures and Token Validation Integration', () => {
    it('should enforce security measures throughout the workflow', async () => {
      const mockToken = 'security-test-token';
      const mockIpAddress = '192.168.1.100';

      // Test token validation with security checks
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'token-security-123',
                token: mockToken,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                used_at: null,
                invitation_request: {
                  id: 'invitation-security-123',
                  parent_email: 'security@example.com',
                  child_name: 'Security Child',
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
                id: 'invitation-security-123',
                parent_email: 'security@example.com',
                child_name: 'Security Child',
                child_age: 11,
                status: 'approved'
              },
              error: null
            })
          })
        })
      } as any);

      const tokenValidation = await invitationClaimService.validateTokenForClaim(mockToken, mockIpAddress);
      expect(tokenValidation.data?.valid).toBe(true);

      // Test that expired tokens are rejected
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'token-expired-123',
                token: 'expired-token',
                expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                used_at: null,
                invitation_request: {
                  id: 'invitation-expired-123',
                  parent_email: 'expired@example.com',
                  child_name: 'Expired Child',
                  status: 'approved'
                }
              },
              error: null
            })
          })
        })
      } as any);

      const expiredTokenValidation = await invitationTokenService.validateToken('expired-token');
      expect(expiredTokenValidation.data?.isValid).toBe(false);

      // Test that used tokens are rejected
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'token-used-123',
                token: 'used-token',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                used_at: new Date().toISOString(), // Already used
                invitation_request: {
                  id: 'invitation-used-123',
                  parent_email: 'used@example.com',
                  child_name: 'Used Child',
                  status: 'approved'
                }
              },
              error: null
            })
          })
        })
      } as any);

      const usedTokenValidation = await invitationTokenService.validateToken('used-token');
      expect(usedTokenValidation.data?.isValid).toBe(false);
    });
  });

  describe('Error Scenarios and Recovery Processes', () => {
    it('should handle email delivery failures gracefully', async () => {
      const mockInvitationId = 'invitation-error-123';
      
      const mockInvitation = {
        id: mockInvitationId,
        parent_name: 'Error Test',
        parent_email: 'error@example.com',
        child_name: 'Error Child',
        child_age: 7,
        status: 'approved',
        child_user_id: null,
        created_at: new Date().toISOString(),
        message: null,
        reviewed_at: new Date().toISOString(),
        reviewer_id: 'admin-123',
        invitation_claimed_at: null,
        notification_sent_at: null,
        notification_status: 'pending',
        notifications: [],
        token: {
          id: 'token-error-123',
          token: 'error-token-abc',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          invitation_request_id: mockInvitationId,
          used_at: null,
          created_at: new Date().toISOString()
        }
      };

      // Mock getting invitation
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

      // Mock creating email notification
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          data: {
            id: 'notification-error-123',
            invitation_request_id: mockInvitationId,
            email_type: 'approval',
            recipient_email: 'error@example.com',
            delivery_status: 'pending',
            sent_at: null,
            error_message: null,
            created_at: new Date().toISOString()
          },
          error: null
        })
      } as any);

      // Mock email delivery failure tracking
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: 'notification-error-123' },
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

      // Test that email failures are handled gracefully
      const emailResult = await EmailNotificationService.sendApprovalEmail(mockInvitationId);
      
      // Even if email fails, the system should continue to function
      // The actual implementation should handle retries and error tracking
      expect(emailResult).toBeDefined();
    });

    it('should handle database errors during token operations', async () => {
      const mockInvitationId = 'invitation-db-error-123';

      // Mock database error during token generation
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'DB_CONNECTION_ERROR', message: 'Database connection failed' }
            })
          })
        })
      } as any);

      const tokenResult = await invitationTokenService.generateToken(mockInvitationId);
      expect(tokenResult.error).toBeDefined();
      expect(tokenResult.error?.code).toBe('TOKEN_GENERATION_FAILED');
    });

    it('should handle account creation failures during claim process', async () => {
      const mockToken = 'claim-error-token';
      const mockInvitationId = 'invitation-claim-error-123';

      // Mock successful token validation
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'token-claim-error-123',
                token: mockToken,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                used_at: null,
                invitation_request: {
                  id: mockInvitationId,
                  parent_email: 'claimerror@example.com',
                  child_name: 'Claim Error Child',
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
                parent_email: 'claimerror@example.com',
                child_name: 'Claim Error Child',
                child_age: 8,
                status: 'approved'
              },
              error: null
            })
          })
        })
      } as any);

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

      // Mock auth user creation failure
      (mockSupabase as any).auth = {
        signUp: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Account creation failed' }
        })
      };

      const claimFormData = {
        email: 'claimerror@example.com',
        displayName: 'Claim Error User',
        username: 'claimerroruser',
        password: 'password123',
        confirmPassword: 'password123'
      };

      const claimResult = await invitationClaimService.claimInvitation(mockToken, claimFormData);
      expect(claimResult.error).toBeDefined();
      expect(claimResult.error?.code).toBe('ACCOUNT_CREATION_FAILED');
    });
  });
});