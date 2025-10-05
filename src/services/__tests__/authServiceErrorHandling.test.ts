import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUser, registerUserWithInvitation } from '../auth/authService';
import { supabase } from '@/integrations/supabase/client';
import { AuthError } from '@supabase/supabase-js';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

vi.mock('../rlsPolicyManager', () => ({
  rlsPolicyManager: {
    createProfileWithServiceRole: vi.fn()
  }
}));

vi.mock('../auth/profileService', () => ({
  fetchUserProfile: vi.fn()
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Auth Service Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should handle successful registration', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123' };
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const { fetchUserProfile } = await import('../auth/profileService');
      vi.mocked(fetchUserProfile).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User'
      });

      const result = await registerUser('test@example.com', 'Password123', 'testuser', 'Test User');

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.session).toBeTruthy();
    });

    it('should handle auth signup errors', async () => {
      const authError = new AuthError('Email already registered', 'email_already_exists');
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: authError
      });

      const result = await registerUser('test@example.com', 'Password123', 'testuser', 'Test User');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Email already registered');
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network connection failed');
      
      vi.mocked(supabase.auth.signUp)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({
          data: { 
            user: { id: 'user-123', email: 'test@example.com' }, 
            session: { access_token: 'token-123' } 
          },
          error: null
        });

      const { fetchUserProfile } = await import('../auth/profileService');
      vi.mocked(fetchUserProfile).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User'
      });

      const result = await registerUser('test@example.com', 'Password123', 'testuser', 'Test User');

      expect(result.success).toBe(true);
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(2);
    });

    it('should handle RLS policy errors during profile creation', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123' };
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const { fetchUserProfile } = await import('../auth/profileService');
      const { rlsPolicyManager } = await import('../rlsPolicyManager');
      
      // First call fails (trigger didn't create profile)
      vi.mocked(fetchUserProfile)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          display_name: 'Test User'
        });

      vi.mocked(rlsPolicyManager.createProfileWithServiceRole).mockResolvedValue({
        id: 'user-123',
        user_id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User'
      });

      const result = await registerUser('test@example.com', 'Password123', 'testuser', 'Test User');

      expect(result.success).toBe(true);
      expect(rlsPolicyManager.createProfileWithServiceRole).toHaveBeenCalled();
    });

    it('should handle email confirmation requirement', async () => {
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        email_confirmed_at: null
      };
      
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      });

      const result = await registerUser('test@example.com', 'Password123', 'testuser', 'Test User');

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
      expect(result.error?.code).toBe('email_confirmation_required');
    });

    it('should handle missing user data', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null
      });

      const result = await registerUser('test@example.com', 'Password123', 'testuser', 'Test User');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('registerUserWithInvitation', () => {
    it('should handle successful invitation registration', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123' };
      const mockTokenData = {
        id: 'token-123',
        token: 'invitation-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending'
      };

      // Mock invitation token validation
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockTokenData,
                error: null
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: mockTokenData,
            error: null
          })
        }))
      }));
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const { rlsPolicyManager } = await import('../rlsPolicyManager');
      const { fetchUserProfile } = await import('../auth/profileService');
      
      vi.mocked(rlsPolicyManager.createProfileWithServiceRole).mockResolvedValue({
        id: 'user-123',
        user_id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      });

      vi.mocked(fetchUserProfile).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      });

      const result = await registerUserWithInvitation(
        'test@example.com',
        'Password123',
        'John',
        'Doe',
        'invitation-token'
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.session).toBeTruthy();
    });

    it('should handle invalid invitation token', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'No rows returned' }
              })
            }))
          }))
        }))
      }));
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await registerUserWithInvitation(
        'test@example.com',
        'Password123',
        'John',
        'Doe',
        'invalid-token'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVITATION_INVALID');
    });

    it('should handle expired invitation token', async () => {
      const expiredTokenData = {
        id: 'token-123',
        token: 'expired-token',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
        status: 'pending'
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: expiredTokenData,
                error: null
              })
            }))
          }))
        }))
      }));
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await registerUserWithInvitation(
        'test@example.com',
        'Password123',
        'John',
        'Doe',
        'expired-token'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVITATION_EXPIRED');
    });

    it('should handle auth signup errors during invitation registration', async () => {
      const mockTokenData = {
        id: 'token-123',
        token: 'invitation-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending'
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockTokenData,
                error: null
              })
            }))
          }))
        }))
      }));
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const authError = new AuthError('Email already registered', 'email_already_exists');
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: authError
      });

      const result = await registerUserWithInvitation(
        'test@example.com',
        'Password123',
        'John',
        'Doe',
        'invitation-token'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle RLS policy errors during author profile creation', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123' };
      const mockTokenData = {
        id: 'token-123',
        token: 'invitation-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending'
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockTokenData,
                error: null
              })
            }))
          }))
        }))
      }));
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const { rlsPolicyManager } = await import('../rlsPolicyManager');
      const rlsError = new Error('RLS policy violation');
      
      vi.mocked(rlsPolicyManager.createProfileWithServiceRole)
        .mockRejectedValueOnce(rlsError)
        .mockResolvedValue({
          id: 'user-123',
          user_id: 'user-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'author'
        });

      const { fetchUserProfile } = await import('../auth/profileService');
      vi.mocked(fetchUserProfile).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      });

      const result = await registerUserWithInvitation(
        'test@example.com',
        'Password123',
        'John',
        'Doe',
        'invitation-token'
      );

      expect(result.success).toBe(true);
      expect(rlsPolicyManager.createProfileWithServiceRole).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should mark invitation as used after successful registration', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123' };
      const mockTokenData = {
        id: 'token-123',
        token: 'invitation-token',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending'
      };

      const mockUpdate = vi.fn().mockResolvedValue({
        data: { ...mockTokenData, status: 'used' },
        error: null
      });

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockTokenData,
                error: null
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: mockUpdate
        }))
      }));
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const { rlsPolicyManager } = await import('../rlsPolicyManager');
      const { fetchUserProfile } = await import('../auth/profileService');
      
      vi.mocked(rlsPolicyManager.createProfileWithServiceRole).mockResolvedValue({
        id: 'user-123',
        user_id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      });

      vi.mocked(fetchUserProfile).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'author'
      });

      await registerUserWithInvitation(
        'test@example.com',
        'Password123',
        'John',
        'Doe',
        'invitation-token'
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'used',
        used_at: expect.any(String),
        used_by: 'user-123'
      });
    });
  });
});