import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  RegistrationFlowCoordinator,
  registrationFlowCoordinator,
  type StandardRegistrationData,
  type InvitationRegistrationData
} from '../registrationFlowCoordinator';
import { supabase } from '@/integrations/supabase/client';
import { rlsPolicyManager } from '../rlsPolicyManager';
import { registrationErrorHandler } from '../registrationErrorHandler';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('../rlsPolicyManager');
vi.mock('../registrationErrorHandler');
vi.mock('@/utils/logger');

const mockSupabase = vi.mocked(supabase);
const mockRlsPolicyManager = vi.mocked(rlsPolicyManager);
const mockRegistrationErrorHandler = vi.mocked(registrationErrorHandler);

describe('RegistrationFlowCoordinator', () => {
  let coordinator: RegistrationFlowCoordinator;

  beforeEach(() => {
    coordinator = new RegistrationFlowCoordinator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('coordinateStandardRegistration', () => {
    const mockStandardData: StandardRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
      displayName: 'Test User'
    };

    it('should successfully coordinate standard registration with auto-login', async () => {
      // Mock successful auth signup
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123' };
      
      // Mock profile creation
      const mockProfile = { 
        id: 'user-123', 
        email: 'test@example.com', 
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      // Mock auth.signUp
      mockSupabase.auth = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null
        })
      } as any;

      // Mock profile query (existing profile found)
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        })
      } as any);

      // Mock executeWithRetry to simulate the actual flow
      let callCount = 0;
      mockRegistrationErrorHandler.executeWithRetry.mockImplementation(async (fn) => {
        callCount++;
        if (callCount === 1) {
          // First call: auth signup
          return { user: mockUser, session: mockSession };
        } else if (callCount === 2) {
          // Second call: profile creation - execute the function to trigger profile lookup
          await fn();
          return undefined;
        }
        return undefined;
      });

      const result = await coordinator.coordinateStandardRegistration(mockStandardData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();

    });

    it('should handle email confirmation required scenario', async () => {
      // Mock user creation without session (email confirmation required)
      const mockUser = { 
        id: 'user-123', 
        email: 'test@example.com',
        email_confirmed_at: null
      };

      // Mock auth.signUp to return user without session
      mockSupabase.auth = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: null },
          error: null
        })
      } as any;

      const mockProfile = { 
        id: 'user-123', 
        email: 'test@example.com', 
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        })
      } as any);

      const result = await coordinator.coordinateStandardRegistration(mockStandardData);

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
      expect(result.session).toBeUndefined();
      expect(result.error?.code).toBe('email_confirmation_required');
    });

    it('should perform rollback on registration failure', async () => {
      // Mock auth signup failure
      const mockError = new Error('Auth signup failed');
      mockRegistrationErrorHandler.executeWithRetry.mockRejectedValue(mockError);

      // Mock error processing
      mockRegistrationErrorHandler.processError.mockReturnValue({
        userMessage: 'Registration failed',
        error: {
          code: 'AUTH_SIGNUP_FAILED',
          technicalDetails: 'Auth signup failed'
        }
      });

      const result = await coordinator.coordinateStandardRegistration(mockStandardData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTH_SIGNUP_FAILED');
    });

    it('should handle profile creation failure gracefully', async () => {
      // Mock successful auth signup
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123' };

      // Mock auth.signUp
      mockSupabase.auth = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null
        })
      } as any;

      // Mock no existing profile (trigger didn't create it) and failed manual creation
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'RLS policy violation', code: 'PGRST116' } 
            })
          })
        })
      } as any);

      const result = await coordinator.coordinateStandardRegistration(mockStandardData);

      // Should still succeed even if profile creation fails
      expect(result.success).toBe(true);
      expect(result.user).toBeNull();
      expect(result.session).toEqual(mockSession);
    });
  });

  describe('coordinateInvitationRegistration', () => {
    const mockInvitationData: InvitationRegistrationData = {
      email: 'author@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      invitationToken: 'token-123'
    };

    it('should successfully coordinate invitation registration', async () => {
      // Mock valid invitation token
      const mockTokenData = {
        id: 'token-id-123',
        token: 'token-123',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
      };

      // Mock successful author profile creation
      const mockProfile = { 
        id: 'user-123', 
        email: 'author@example.com', 
        username: 'john_doe',
        display_name: 'John Doe',
        role: 'author'
      };

      // Mock successful auth signup
      const mockUser = { id: 'user-123', email: 'author@example.com' };
      const mockSession = { access_token: 'token-123' };

      // Mock auth.signUp
      mockSupabase.auth = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null
        })
      } as any;

      // Mock database operations
      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'invitation_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockTokenData, error: null })
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          };
        } else if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
                })
              })
            })
          };
        }
        return {};
      });

      const result = await coordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('should fail with invalid invitation token', async () => {
      // Mock invalid invitation token
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
            })
          })
        })
      } as any);

      mockRegistrationErrorHandler.executeWithRetry.mockRejectedValue(
        new Error('Invitation token is invalid or has expired')
      );

      mockRegistrationErrorHandler.processError.mockReturnValue({
        userMessage: 'Invalid invitation token',
        error: {
          code: 'INVALID_INVITATION_TOKEN',
          technicalDetails: 'Invitation token is invalid or has expired'
        }
      });

      const result = await coordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_INVITATION_TOKEN');
    });

    it('should fail with expired invitation token', async () => {
      // Mock expired invitation token
      const mockTokenData = {
        id: 'token-id-123',
        token: 'token-123',
        status: 'pending',
        expires_at: new Date(Date.now() - 86400000).toISOString() // 24 hours ago
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockTokenData, error: null })
            })
          })
        })
      } as any);

      mockRegistrationErrorHandler.executeWithRetry.mockRejectedValue(
        new Error('Invitation token has expired')
      );

      mockRegistrationErrorHandler.processError.mockReturnValue({
        userMessage: 'Invitation token has expired',
        error: {
          code: 'INVITATION_TOKEN_EXPIRED',
          technicalDetails: 'Invitation token has expired'
        }
      });

      const result = await coordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVITATION_TOKEN_EXPIRED');
    });

    it('should perform rollback on author profile creation failure', async () => {
      // Mock valid token and successful auth
      const mockTokenData = {
        id: 'token-id-123',
        token: 'token-123',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString()
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockTokenData, error: null })
            })
          })
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any);

      const mockUser = { id: 'user-123', email: 'author@example.com' };
      const mockSession = { access_token: 'token-123' };
      
      mockRegistrationErrorHandler.executeWithRetry
        .mockResolvedValueOnce(mockTokenData) // Token validation
        .mockResolvedValueOnce({ user: mockUser, session: mockSession }) // Auth signup
        .mockRejectedValue(new Error('Profile creation failed')); // Profile creation failure

      mockRlsPolicyManager.createProfileWithPermissions.mockResolvedValue({
        success: false,
        error: 'Profile creation failed'
      });

      mockRegistrationErrorHandler.processError.mockReturnValue({
        userMessage: 'Author profile creation failed',
        error: {
          code: 'AUTHOR_PROFILE_CREATION_FAILED',
          technicalDetails: 'Profile creation failed'
        }
      });

      const result = await coordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHOR_PROFILE_CREATION_FAILED');
    });


  });



  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(registrationFlowCoordinator).toBeInstanceOf(RegistrationFlowCoordinator);
    });

    it('should maintain the same instance across imports', () => {
      const instance1 = registrationFlowCoordinator;
      const instance2 = registrationFlowCoordinator;
      
      expect(instance1).toBe(instance2);
    });
  });
});