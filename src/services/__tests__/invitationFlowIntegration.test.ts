import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invitationService } from '../invitationService';
import { roleService } from '../roleService';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getUser: vi.fn()
    },
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock role service
vi.mock('../roleService', () => ({
  roleService: {
    grantAuthorRole: vi.fn(),
    getUserRole: vi.fn()
  }
}));

describe('Invitation Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete invitation flow for new user', () => {
    it('should handle complete flow from request to account creation', async () => {
      // Step 1: Submit invitation request
      const mockInvitationRequest = {
        id: 'inv-123',
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'Please approve my child for author access',
        status: 'pending'
      };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockInvitationRequest,
              error: null
            })
          })
        })
      });

      // Mock confirmation email sending
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { success: true, messageId: 'conf-123' },
        error: null
      });

      const invitationResult = await invitationService.createInvitationRequest({
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'Please approve my child for author access'
      });

      expect(invitationResult.success).toBe(true);
      expect(invitationResult.data?.id).toBe('inv-123');

      // Step 2: Admin approves invitation
      const mockApprovedInvitation = {
        ...mockInvitationRequest,
        status: 'approved',
        approved_at: new Date().toISOString()
      };

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockApprovedInvitation,
                error: null
              })
            })
          })
        })
      });

      // Mock token generation and invitation email
      (supabase.functions.invoke as any)
        .mockResolvedValueOnce({
          data: { success: true, token: 'secure-token-123' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { success: true, messageId: 'inv-456' },
          error: null
        });

      const approvalResult = await invitationService.approveInvitation('inv-123');

      expect(approvalResult.success).toBe(true);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('invitation-tokens', {
        body: {
          action: 'generate',
          invitationId: 'inv-123',
          email: 'jane@example.com'
        }
      });

      // Step 3: User clicks invitation link and validates token
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          success: true,
          invitationData: {
            id: 'inv-123',
            parent_name: 'John Doe',
            child_name: 'Jane Doe',
            email: 'jane@example.com'
          }
        },
        error: null
      });

      const tokenValidation = await invitationService.validateInvitationToken('secure-token-123');

      expect(tokenValidation.success).toBe(true);
      expect(tokenValidation.data?.email).toBe('jane@example.com');

      // Step 4: User creates new account
      const mockUser = {
        id: 'user-123',
        email: 'jane@example.com'
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock profile creation
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                email: 'jane@example.com',
                display_name: 'Jane Doe',
                role: 'author'
              },
              error: null
            })
          })
        })
      });

      // Mock token marking as used
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { success: true },
        error: null
      });

      const completionResult = await invitationService.completeInvitation('secure-token-123', {
        password: 'securePassword123',
        display_name: 'Jane Doe'
      });

      expect(completionResult.success).toBe(true);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'securePassword123'
      });

      // Verify token was marked as used
      expect(supabase.functions.invoke).toHaveBeenCalledWith('invitation-tokens', {
        body: {
          action: 'markUsed',
          token: 'secure-token-123'
        }
      });
    });

    it('should handle errors during account creation gracefully', async () => {
      // Mock token validation success
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          success: true,
          invitationData: {
            id: 'inv-123',
            email: 'jane@example.com'
          }
        },
        error: null
      });

      // Mock account creation failure
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' }
      });

      const completionResult = await invitationService.completeInvitation('secure-token-123', {
        password: 'securePassword123',
        display_name: 'Jane Doe'
      });

      expect(completionResult.success).toBe(false);
      expect(completionResult.error).toContain('Email already registered');
    });
  });

  describe('Complete invitation flow for existing user', () => {
    it('should handle account activation for existing users', async () => {
      // Step 1: User clicks invitation link (existing account)
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          success: true,
          invitationData: {
            id: 'inv-456',
            email: 'existing@example.com'
          }
        },
        error: null
      });

      const tokenValidation = await invitationService.validateInvitationToken('token-456');
      expect(tokenValidation.success).toBe(true);

      // Step 2: User is already logged in, activate author role
      const mockUser = {
        id: 'existing-user-123',
        email: 'existing@example.com'
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // Mock role service
      (roleService.grantAuthorRole as any).mockResolvedValue({
        success: true,
        data: { role: 'author' }
      });

      // Mock token marking as used
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { success: true },
        error: null
      });

      const activationResult = await invitationService.activateAuthorAccount('token-456');

      expect(activationResult.success).toBe(true);
      expect(roleService.grantAuthorRole).toHaveBeenCalledWith('existing-user-123');
    });

    it('should handle role granting errors', async () => {
      // Mock token validation success
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          success: true,
          invitationData: { id: 'inv-456', email: 'existing@example.com' }
        },
        error: null
      });

      // Mock user authentication
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'existing@example.com' } },
        error: null
      });

      // Mock role service failure
      (roleService.grantAuthorRole as any).mockResolvedValue({
        success: false,
        error: 'Role assignment failed'
      });

      const activationResult = await invitationService.activateAuthorAccount('token-456');

      expect(activationResult.success).toBe(false);
      expect(activationResult.error).toContain('Role assignment failed');
    });
  });

  describe('Error scenarios', () => {
    it('should handle expired tokens gracefully', async () => {
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Token has expired'
        },
        error: null
      });

      const tokenValidation = await invitationService.validateInvitationToken('expired-token');

      expect(tokenValidation.success).toBe(false);
      expect(tokenValidation.error).toContain('Token has expired');
    });

    it('should handle invalid tokens gracefully', async () => {
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Invalid or expired token'
        },
        error: null
      });

      const tokenValidation = await invitationService.validateInvitationToken('invalid-token');

      expect(tokenValidation.success).toBe(false);
      expect(tokenValidation.error).toContain('Invalid or expired token');
    });

    it('should handle email service failures during confirmation', async () => {
      const mockInvitationRequest = {
        id: 'inv-789',
        email: 'test@example.com'
      };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockInvitationRequest,
              error: null
            })
          })
        })
      });

      // Mock email service failure
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Email service unavailable'
        },
        error: null
      });

      const invitationResult = await invitationService.createInvitationRequest({
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        email: 'test@example.com'
      });

      // Should still create invitation even if email fails
      expect(invitationResult.success).toBe(true);
      expect(invitationResult.data?.id).toBe('inv-789');
    });

    it('should handle database connection failures', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          })
        })
      });

      const invitationResult = await invitationService.createInvitationRequest({
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        email: 'test@example.com'
      });

      expect(invitationResult.success).toBe(false);
      expect(invitationResult.error).toContain('Database connection failed');
    });
  });

  describe('Rate limiting and security', () => {
    it('should prevent duplicate invitation requests', async () => {
      // Mock existing invitation check
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'existing-inv', status: 'pending' },
                error: null
              })
            })
          })
        })
      });

      const invitationResult = await invitationService.createInvitationRequest({
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        email: 'duplicate@example.com'
      });

      expect(invitationResult.success).toBe(false);
      expect(invitationResult.error).toContain('pending invitation already exists');
    });

    it('should validate email addresses before processing', async () => {
      const invitationResult = await invitationService.createInvitationRequest({
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        email: 'invalid-email-format'
      });

      expect(invitationResult.success).toBe(false);
      expect(invitationResult.error).toContain('Invalid email address');
    });
  });
});