import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createInvitationRequest, 
  sendInvitationConfirmation, 
  sendInvitationEmail,
  validateInvitationToken,
  completeInvitation,
  updateInvitationRequestStatus
} from '../invitationService';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    })),
    auth: {
      signUp: vi.fn()
    }
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('Invitation Service Email Extensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendInvitationConfirmation', () => {
    it('should send confirmation email successfully', async () => {
      const mockInvitation = {
        id: 'test-id',
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        parent_email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z'
      };

      // Mock supabase response
      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      // Mock fetch response
      (global.fetch as any).mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' })
      });

      const result = await sendInvitationConfirmation('test-id');

      expect(result.error).toBeUndefined();
      expect(result.data?.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/send-email'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('invitation_confirmation')
        })
      );
    });

    it('should handle email service errors', async () => {
      const mockInvitation = {
        id: 'test-id',
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        parent_email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z'
      };

      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
          })
        })
      });

      // Mock fetch error response
      (global.fetch as any).mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: false, error: 'Email service error' })
      });

      const result = await sendInvitationConfirmation('test-id');

      expect(result.error).toBe('Email service error');
    });
  });

  describe('sendInvitationEmail', () => {
    it('should send invitation email with token successfully', async () => {
      const mockInvitation = {
        id: 'test-id',
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        parent_email: 'john@example.com'
      };

      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      // Mock token generation and email sending
      (global.fetch as any)
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ success: true, token: 'test-token' })
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' })
        });

      const result = await sendInvitationEmail('test-id');

      expect(result.error).toBeUndefined();
      expect(result.data?.success).toBe(true);
      expect(result.data?.token).toBe('test-token');
    });
  });

  describe('validateInvitationToken', () => {
    it('should validate token successfully', async () => {
      const mockTokenData = {
        id: 'token-id',
        invitation_id: 'invitation-id',
        email: 'john@example.com',
        expires_at: '2024-12-31T23:59:59Z',
        invitation: {
          id: 'invitation-id',
          parent_name: 'John Doe',
          child_name: 'Jane Doe'
        }
      };

      (global.fetch as any).mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: true, invitationData: mockTokenData })
      });

      const result = await validateInvitationToken('test-token', 'john@example.com');

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(mockTokenData);
    });

    it('should handle invalid token', async () => {
      (global.fetch as any).mockResolvedValue({
        json: vi.fn().mockResolvedValue({ success: false, error: 'Invalid token' })
      });

      const result = await validateInvitationToken('invalid-token');

      expect(result.error).toBe('Invalid token');
    });
  });

  describe('completeInvitation', () => {
    it('should complete invitation for existing user', async () => {
      const mockTokenData = {
        invitation: {
          id: 'invitation-id',
          parent_email: 'john@example.com'
        }
      };

      const mockExistingUser = {
        id: 'user-id',
        email: 'john@example.com',
        role: 'reader'
      };

      // Mock token validation
      (global.fetch as any)
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ success: true, invitationData: mockTokenData })
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ success: true })
        });

      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockExistingUser, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { ...mockExistingUser, role: 'author' }, error: null })
            })
          })
        })
      });

      const result = await completeInvitation('test-token');

      expect(result.error).toBeUndefined();
      expect(result.data?.type).toBe('existing_user');
      expect(result.data?.redirectTo).toBe('/admin/dashboard');
    });

    it('should complete invitation for new user', async () => {
      const mockTokenData = {
        invitation: {
          id: 'invitation-id',
          parent_email: 'newuser@example.com',
          parent_name: 'New User'
        }
      };

      const mockNewUser = {
        id: 'new-user-id',
        email: 'newuser@example.com'
      };

      // Mock token validation
      (global.fetch as any)
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ success: true, invitationData: mockTokenData })
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ success: true })
        });

      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockNewUser },
        error: null
      });

      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        display_name: 'New User'
      };

      const result = await completeInvitation('test-token', userData);

      expect(result.error).toBeUndefined();
      expect(result.data?.type).toBe('new_user');
      expect(result.data?.redirectTo).toBe('/admin/dashboard');
    });
  });

  describe('updateInvitationRequestStatus', () => {
    it('should send invitation email when status is approved', async () => {
      const mockInvitation = {
        id: 'test-id',
        status: 'approved',
        parent_name: 'John Doe',
        child_name: 'Jane Doe',
        parent_email: 'john@example.com'
      };

      const { supabase } = await import('@/integrations/supabase/client');
      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
            })
          })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null })
          })
        })
      });

      // Mock token generation and email sending
      (global.fetch as any)
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ success: true, token: 'test-token' })
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ success: true, messageId: 'test-message-id' })
        });

      const result = await updateInvitationRequestStatus('test-id', 'approved', 'reviewer-id');

      expect(result.error).toBeUndefined();
      expect(result.data?.status).toBe('approved');
      
      // Verify that email service was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/invitation-tokens'),
        expect.any(Object)
      );
    });

    it('should not send email when status is denied', async () => {
      const mockInvitation = {
        id: 'test-id',
        status: 'denied'
      };

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

      const result = await updateInvitationRequestStatus('test-id', 'denied', 'reviewer-id');

      expect(result.error).toBeUndefined();
      expect(result.data?.status).toBe('denied');
      
      // Verify that email service was not called
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});