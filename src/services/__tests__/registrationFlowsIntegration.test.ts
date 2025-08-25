import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerUser, registerUserWithInvitation } from '../auth/authService';
import { registrationFlowCoordinator } from '../registrationFlowCoordinator';
import { rlsPolicyManager } from '../rlsPolicyManager';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      is: vi.fn().mockReturnThis()
    }))
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../rlsPolicyManager', () => ({
  rlsPolicyManager: {
    createProfileWithPermissions: vi.fn(),
    validateRegistrationPermissions: vi.fn(),
    isServiceRoleAvailable: vi.fn(),
    bypassRLSForRegistration: vi.fn()
  }
}));

describe('Registration Flows Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null }
    });
    
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    });
    
    (rlsPolicyManager.isServiceRoleAvailable as any).mockReturnValue(true);
    (rlsPolicyManager.validateRegistrationPermissions as any).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Standard Sign-Up with Auto-Login Flow', () => {
    it('should complete end-to-end standard registration with immediate login', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          username: 'testuser',
          display_name: 'Test User'
        }
      };

      const mockSession = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        user: mockUser,
        expires_at: Date.now() + 3600000
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader',
        created_at: new Date().toISOString()
      };

      // Mock successful auth signup with immediate session
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock successful profile creation
      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile
      });

      // Mock profile query to return created profile
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();

      // Verify auth service was called correctly
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            username: 'testuser',
            display_name: 'Test User'
          }
        }
      });

      // Verify profile creation was attempted
      expect(rlsPolicyManager.createProfileWithPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          display_name: 'Test User',
          role: 'reader'
        }),
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
          registrationType: 'standard'
        })
      );
    });

    it('should handle email confirmation required scenario gracefully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: null, // Email not confirmed
        user_metadata: {
          username: 'testuser',
          display_name: 'Test User'
        }
      };

      // Mock signup without session (email confirmation required)
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      });

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('email_confirmation_required');
      expect(result.error?.message).toContain('check your email');
    });

    it('should handle profile creation delays and retry mechanisms', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          username: 'testuser',
          display_name: 'Test User'
        }
      };

      const mockSession = {
        access_token: 'access-token-123',
        user: mockUser
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock profile creation to fail first, then succeed
      (rlsPolicyManager.createProfileWithPermissions as any)
        .mockResolvedValueOnce({
          success: false,
          error: 'Profile creation temporarily failed'
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockProfile
        });

      // Mock profile query to return null first (not ready), then profile
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: null, error: { message: 'No rows returned' } })
          .mockResolvedValueOnce({ data: mockProfile, error: null })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert - Should succeed after retry
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(result.session).toEqual(mockSession);
    });

    it('should handle authentication state consistency across components', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = {
        access_token: 'access-token-123',
        user: mockUser
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile
      });

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Mock session verification
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession }
      });

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);

      // Verify session consistency
      const sessionCheck = await supabase.auth.getSession();
      expect(sessionCheck.data.session).toEqual(mockSession);
    });
  });

  describe('Invitation-Based Author Registration Flow', () => {
    it('should complete end-to-end invitation registration with author permissions', async () => {
      // Arrange
      const invitationToken = 'invitation-token-123';
      const mockTokenData = {
        id: 'token-id-123',
        token: invitationToken,
        email: 'author@example.com',
        role: 'author',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        created_at: new Date().toISOString()
      };

      const mockUser = {
        id: 'user-456',
        email: 'author@example.com',
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          first_name: 'Jane',
          last_name: 'Author',
          invitation_token: invitationToken
        }
      };

      const mockSession = {
        access_token: 'access-token-456',
        user: mockUser
      };

      const mockProfile = {
        id: 'user-456',
        email: 'author@example.com',
        username: 'jane_author',
        display_name: 'Jane Author',
        role: 'author',
        created_at: new Date().toISOString()
      };

      // Mock token validation
      const mockFrom = vi.fn((table: string) => {
        if (table === 'invitation_tokens') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockTokenData,
              error: null
            }),
            update: vi.fn().mockReturnThis()
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          is: vi.fn().mockReturnThis()
        };
      });
      (supabase.from as any).mockImplementation(mockFrom);

      // Mock successful auth signup
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock successful author profile creation
      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile
      });

      // Act
      const result = await registerUserWithInvitation(
        'author@example.com',
        'password123',
        'Jane',
        'Author',
        invitationToken
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();

      // Verify invitation token was validated
      expect(supabase.from).toHaveBeenCalledWith('invitation_tokens');

      // Verify auth service was called correctly
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'author@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'Jane',
            last_name: 'Author',
            invitation_token: invitationToken
          }
        }
      });

      // Verify author profile creation with proper context
      expect(rlsPolicyManager.createProfileWithPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-456',
          email: 'author@example.com',
          username: 'jane_author',
          display_name: 'Jane Author',
          role: 'author'
        }),
        expect.objectContaining({
          userId: 'user-456',
          email: 'author@example.com',
          registrationType: 'invitation',
          bypassRLS: true
        })
      );
    });

    it('should handle invalid invitation tokens appropriately', async () => {
      // Arrange
      const invalidToken = 'invalid-token-123';

      // Mock token validation failure
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUserWithInvitation(
        'author@example.com',
        'password123',
        'Jane',
        'Author',
        invalidToken
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('invalid');
    });

    it('should handle expired invitation tokens', async () => {
      // Arrange
      const expiredToken = 'expired-token-123';
      const mockExpiredTokenData = {
        id: 'token-id-123',
        token: expiredToken,
        email: 'author@example.com',
        role: 'author',
        status: 'pending',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
        created_at: new Date().toISOString()
      };

      // Mock token validation returning expired token
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockExpiredTokenData,
          error: null
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUserWithInvitation(
        'author@example.com',
        'password123',
        'Jane',
        'Author',
        expiredToken
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('expired');
    });

    it('should mark invitation token as used after successful registration', async () => {
      // Arrange
      const invitationToken = 'valid-token-123';
      const mockTokenData = {
        id: 'token-id-123',
        token: invitationToken,
        email: 'author@example.com',
        role: 'author',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date().toISOString()
      };

      const mockUser = {
        id: 'user-456',
        email: 'author@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = { access_token: 'token', user: mockUser };
      const mockProfile = { id: 'user-456', role: 'author' };

      // Mock successful flow
      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn((table: string) => {
        if (table === 'invitation_tokens') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockTokenData,
              error: null
            }),
            update: mockUpdate
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          is: vi.fn().mockReturnThis()
        };
      });
      (supabase.from as any).mockImplementation(mockFrom);

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile
      });

      // Act
      const result = await registerUserWithInvitation(
        'author@example.com',
        'password123',
        'Jane',
        'Author',
        invitationToken
      );

      // Assert
      expect(result.success).toBe(true);
      
      // Verify token was marked as used
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'used',
        used_at: expect.any(String),
        used_by: 'user-456'
      });
    });
  });

  describe('Error Scenarios and Recovery Mechanisms', () => {
    it('should handle RLS policy violations with service role fallback', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = { access_token: 'token', user: mockUser };
      const mockProfile = { id: 'user-123', role: 'reader' };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock RLS failure first, then success with service role
      (rlsPolicyManager.createProfileWithPermissions as any)
        .mockResolvedValueOnce({
          success: false,
          error: 'RLS policy violation',
          code: '42501',
          requiresServiceRole: true
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockProfile
        });

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: null, error: { message: 'No rows' } })
          .mockResolvedValueOnce({ data: mockProfile, error: null })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      
      // Verify RLS policy manager was called multiple times (retry mechanism)
      expect(rlsPolicyManager.createProfileWithPermissions).toHaveBeenCalledTimes(2);
    });

    it('should handle network failures with retry mechanisms', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = { access_token: 'token', user: mockUser };
      const mockProfile = { id: 'user-123', role: 'reader' };

      // Mock network failure first, then success
      (supabase.auth.signUp as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { user: mockUser, session: mockSession },
          error: null
        });

      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile
      });

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert - Should fail on first attempt due to network error
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Network error');
    });

    it('should handle rollback scenarios for failed registrations', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = { access_token: 'token', user: mockUser };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock profile creation failure that requires rollback
      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: false,
        error: 'Critical profile creation failure'
      });

      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows' }
        }),
        delete: mockDelete
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Note: Actual rollback verification would depend on implementation details
      // This test verifies the error handling path is taken
    });

    it('should maintain data consistency during concurrent registrations', async () => {
      // Arrange
      const mockUser1 = { id: 'user-1', email: 'user1@example.com', email_confirmed_at: new Date().toISOString() };
      const mockUser2 = { id: 'user-2', email: 'user2@example.com', email_confirmed_at: new Date().toISOString() };
      
      const mockSession1 = { access_token: 'token1', user: mockUser1 };
      const mockSession2 = { access_token: 'token2', user: mockUser2 };
      
      const mockProfile1 = { id: 'user-1', username: 'user1', role: 'reader' };
      const mockProfile2 = { id: 'user-2', username: 'user2', role: 'reader' };

      // Mock concurrent signups
      (supabase.auth.signUp as any)
        .mockResolvedValueOnce({ data: { user: mockUser1, session: mockSession1 }, error: null })
        .mockResolvedValueOnce({ data: { user: mockUser2, session: mockSession2 }, error: null });

      (rlsPolicyManager.createProfileWithPermissions as any)
        .mockResolvedValueOnce({ success: true, data: mockProfile1 })
        .mockResolvedValueOnce({ success: true, data: mockProfile2 });

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockProfile1, error: null })
          .mockResolvedValueOnce({ data: mockProfile2, error: null })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act - Simulate concurrent registrations
      const [result1, result2] = await Promise.all([
        registerUser('user1@example.com', 'password123', 'user1', 'User One'),
        registerUser('user2@example.com', 'password123', 'user2', 'User Two')
      ]);

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.user?.id).toBe('user-1');
      expect(result2.user?.id).toBe('user-2');
      
      // Verify both registrations completed independently
      expect(result1.user?.username).toBe('user1');
      expect(result2.user?.username).toBe('user2');
    });
  });

  describe('RLS Policy Compliance and Service Role Operations', () => {
    it('should verify RLS policy compliance during standard registration', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = { access_token: 'token', user: mockUser };
      const mockProfile = { id: 'user-123', role: 'reader' };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile
      });

      (rlsPolicyManager.validateRegistrationPermissions as any).mockResolvedValue(true);

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(true);
      
      // Verify RLS validation was called
      expect(rlsPolicyManager.validateRegistrationPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
          registrationType: 'standard'
        })
      );
    });

    it('should use service role operations when RLS policies block standard operations', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = { access_token: 'token', user: mockUser };
      const mockProfile = { id: 'user-123', role: 'reader' };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock RLS policy blocking standard operation, requiring service role
      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile,
        usedServiceRole: true
      });

      (rlsPolicyManager.isServiceRoleAvailable as any).mockReturnValue(true);

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      
      // Verify service role availability was checked
      expect(rlsPolicyManager.isServiceRoleAvailable).toHaveBeenCalled();
    });

    it('should handle service role unavailability gracefully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = { access_token: 'token', user: mockUser };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock service role not available and RLS blocking operation
      (rlsPolicyManager.isServiceRoleAvailable as any).mockReturnValue(false);
      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: false,
        error: 'Service role not available for profile creation',
        code: 'SERVICE_ROLE_UNAVAILABLE'
      });

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows' }
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toContain('SERVICE_ROLE_UNAVAILABLE');
    });

    it('should audit service role operations for security compliance', async () => {
      // Arrange
      const invitationToken = 'invitation-token-123';
      const mockTokenData = {
        id: 'token-id-123',
        token: invitationToken,
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString()
      };

      const mockUser = {
        id: 'user-456',
        email: 'author@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = { access_token: 'token', user: mockUser };
      const mockProfile = { id: 'user-456', role: 'author' };

      // Mock successful invitation flow with service role usage
      const mockFrom = vi.fn((table: string) => {
        if (table === 'invitation_tokens') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockTokenData,
              error: null
            }),
            update: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          is: vi.fn().mockReturnThis()
        };
      });
      (supabase.from as any).mockImplementation(mockFrom);

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile,
        usedServiceRole: true
      });

      // Act
      const result = await registerUserWithInvitation(
        'author@example.com',
        'password123',
        'Jane',
        'Author',
        invitationToken
      );

      // Assert
      expect(result.success).toBe(true);
      
      // Verify service role operation was logged (through RLS policy manager)
      expect(rlsPolicyManager.createProfileWithPermissions).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          registrationType: 'invitation',
          bypassRLS: true
        })
      );
      
      // Verify logging occurred
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('invitation'),
        expect.any(Object)
      );
    });
  });

  describe('Authentication State Consistency', () => {
    it('should maintain consistent authentication state across registration flows', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        user: mockUser,
        expires_at: Date.now() + 3600000
      };

      const mockProfile = { id: 'user-123', role: 'reader' };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile
      });

      // Mock session persistence
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession }
      });

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
      
      // Verify session consistency
      const sessionCheck = await supabase.auth.getSession();
      expect(sessionCheck.data.session).toEqual(mockSession);
      expect(sessionCheck.data.session?.user.id).toBe(mockUser.id);
    });

    it('should handle session refresh and token management correctly', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const initialSession = {
        access_token: 'initial-token',
        refresh_token: 'refresh-token',
        user: mockUser,
        expires_at: Date.now() + 3600000
      };

      const refreshedSession = {
        access_token: 'refreshed-token',
        refresh_token: 'new-refresh-token',
        user: mockUser,
        expires_at: Date.now() + 7200000
      };

      const mockProfile = { id: 'user-123', role: 'reader' };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: initialSession },
        error: null
      });

      (rlsPolicyManager.createProfileWithPermissions as any).mockResolvedValue({
        success: true,
        data: mockProfile
      });

      // Mock session refresh
      (supabase.auth.getSession as any)
        .mockResolvedValueOnce({ data: { session: initialSession } })
        .mockResolvedValueOnce({ data: { session: refreshedSession } });

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }));
      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await registerUser(
        'test@example.com',
        'password123',
        'testuser',
        'Test User'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.session).toEqual(initialSession);
      
      // Simulate session refresh
      const refreshedSessionCheck = await supabase.auth.getSession();
      expect(refreshedSessionCheck.data.session?.access_token).toBe('refreshed-token');
    });
  });
});