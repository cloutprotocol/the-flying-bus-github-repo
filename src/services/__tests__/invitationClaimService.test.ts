import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitationClaimService } from '../invitationClaimService';
import { invitationTokenService } from '../invitationTokenService';
import { EmailNotificationService } from '../emailNotificationService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('../invitationTokenService');
vi.mock('../emailNotificationService');
vi.mock('../invitationSecurityService', () => ({
  invitationSecurityService: {
    checkTokenValidationRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkReplayAttack: vi.fn().mockResolvedValue({ isReplay: false }),
    checkSuspiciousActivity: vi.fn().mockResolvedValue({ isSuspicious: false }),
    logSecurityEvent: vi.fn().mockResolvedValue(true),
    validateTokenIntegrity: vi.fn().mockResolvedValue({ valid: true }),
    checkClaimRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
    verifyEmailOwnership: vi.fn().mockResolvedValue({ requiresVerification: false, verified: true })
  }
}));
vi.mock('../invitationErrorHandler', () => ({
  invitationErrorHandler: {
    handleError: vi.fn().mockResolvedValue({ code: 'HANDLED_ERROR', message: 'Error handled' })
  }
}));
vi.mock('../adminNotificationService', () => ({
  AdminNotificationService: {
    notifyNewAuthorRegistration: vi.fn().mockResolvedValue(true)
  }
}));
vi.mock('@/utils/logger/logger');

const mockSupabase = vi.mocked(supabase);
const mockTokenService = vi.mocked(invitationTokenService);

describe('InvitationClaimService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateTokenForClaim', () => {
    it('should validate token and return invitation data', async () => {
      const mockToken = 'valid-token-123';
      const mockInvitationId = 'invitation-123';
      
      // Mock token validation
      mockTokenService.validateToken.mockResolvedValue({
        data: {
          isValid: true,
          invitationId: mockInvitationId,
          parentEmail: 'parent@example.com',
          childName: 'Test Child'
        }
      });

      // Mock invitation data fetch
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockInvitationId,
                parent_email: 'parent@example.com',
                child_name: 'Test Child',
                child_age: 10,
                status: 'approved'
              },
              error: null
            })
          })
        })
      } as any);

      const result = await invitationClaimService.validateTokenForClaim(mockToken);

      expect(result.data).toEqual({
        valid: true,
        invitation: {
          id: mockInvitationId,
          parentEmail: 'parent@example.com',
          childName: 'Test Child',
          childAge: 10
        }
      });
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for expired token', async () => {
      const mockToken = 'expired-token-123';
      
      mockTokenService.validateToken.mockResolvedValue({
        data: {
          isValid: false
        }
      });

      const result = await invitationClaimService.validateTokenForClaim(mockToken);

      expect(result.data).toEqual({
        valid: false,
        error: 'Invalid or expired invitation token'
      });
    });

    it('should handle token service errors', async () => {
      const mockToken = 'error-token-123';
      
      mockTokenService.validateToken.mockResolvedValue({
        error: {
          code: 'TOKEN_VALIDATION_FAILED',
          message: 'Token validation failed'
        }
      });

      const result = await invitationClaimService.validateTokenForClaim(mockToken);

      expect(result.error).toEqual({
        code: 'TOKEN_VALIDATION_FAILED',
        message: 'Token validation failed'
      });
    });
  });

  describe('claimInvitation', () => {
    const mockFormData = {
      email: 'parent@example.com',
      displayName: 'Parent Name',
      username: 'parentuser',
      password: 'securepassword123',
      confirmPassword: 'securepassword123'
    };

    it('should successfully claim invitation for new user', async () => {
      const mockToken = 'valid-token-123';
      const mockInvitationId = 'invitation-123';
      const mockUserId = 'user-123';

      // Mock token validation
      vi.spyOn(invitationClaimService, 'validateTokenForClaim').mockResolvedValue({
        data: {
          valid: true,
          invitation: {
            id: mockInvitationId,
            parentEmail: 'parent@example.com',
            childName: 'Test Child',
            childAge: 10
          }
        }
      });

      // Mock existing user check (no existing user)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // No rows returned
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
      mockTokenService.markTokenAsUsed.mockResolvedValue({
        success: true
      });

      // Mock invitation linking
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      } as any);

      // Mock welcome email
      const { EmailNotificationService } = await import('../emailNotificationService');
      vi.mocked(EmailNotificationService.sendWelcomeEmail).mockResolvedValue({
        success: true
      });

      const result = await invitationClaimService.claimInvitation(mockToken, mockFormData);

      expect(result.data).toEqual({
        success: true,
        userId: mockUserId,
        isNewUser: true
      });
      expect(result.error).toBeUndefined();
    });

    it('should reject claim with mismatched email', async () => {
      const mockToken = 'valid-token-123';
      const mockInvitationId = 'invitation-123';

      // Mock token validation with different email
      vi.spyOn(invitationClaimService, 'validateTokenForClaim').mockResolvedValue({
        data: {
          valid: true,
          invitation: {
            id: mockInvitationId,
            parentEmail: 'different@example.com',
            childName: 'Test Child',
            childAge: 10
          }
        }
      });

      const result = await invitationClaimService.claimInvitation(mockToken, mockFormData);

      expect(result.error).toEqual({
        code: 'EMAIL_MISMATCH',
        message: 'Email address does not match the invitation'
      });
    });

    it('should handle invalid token', async () => {
      const mockToken = 'invalid-token-123';

      // Mock token validation failure
      vi.spyOn(invitationClaimService, 'validateTokenForClaim').mockResolvedValue({
        data: {
          valid: false,
          error: 'Invalid token'
        }
      });

      const result = await invitationClaimService.claimInvitation(mockToken, mockFormData);

      expect(result.error).toEqual({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired invitation token'
      });
    });
  });

  describe('upgradeExistingUser', () => {
    it('should successfully upgrade user role to author', async () => {
      const mockUserId = 'user-123';
      const mockInvitationId = 'invitation-123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      } as any);

      const result = await invitationClaimService.upgradeExistingUser(mockUserId, mockInvitationId);

      expect(result).toEqual({
        success: true,
        userId: mockUserId,
        isNewUser: false
      });
    });

    it('should handle upgrade errors', async () => {
      const mockUserId = 'user-123';
      const mockInvitationId = 'invitation-123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Database error' }
          })
        })
      } as any);

      const result = await invitationClaimService.upgradeExistingUser(mockUserId, mockInvitationId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to upgrade user account to author role');
    });
  });

  describe('linkInvitationToUser', () => {
    it('should successfully link invitation to user', async () => {
      const mockInvitationId = 'invitation-123';
      const mockUserId = 'user-123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        })
      } as any);

      const result = await invitationClaimService.linkInvitationToUser(mockInvitationId, mockUserId);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle linking errors', async () => {
      const mockInvitationId = 'invitation-123';
      const mockUserId = 'user-123';

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Database error' }
          })
        })
      } as any);

      const result = await invitationClaimService.linkInvitationToUser(mockInvitationId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVITATION_LINK_FAILED');
    });
  });

  describe('getClaimStatistics', () => {
    it('should return claim statistics', async () => {
      const mockClaimData = [
        {
          invitation_claimed_at: new Date().toISOString(),
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        },
        {
          invitation_claimed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({
            data: mockClaimData,
            error: null
          })
        })
      } as any);

      const result = await invitationClaimService.getClaimStatistics();

      expect(result.data).toBeDefined();
      expect(result.data?.totalClaimed).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should handle statistics fetch errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any);

      const result = await invitationClaimService.getClaimStatistics();

      expect(result.error?.code).toBe('CLAIM_STATS_FETCH_FAILED');
    });
  });

  describe('createNewAuthorAccount', () => {
    it('should create new author account with auth user', async () => {
      const mockInvitationData = {
        invitationId: 'invitation-123',
        parentEmail: 'parent@example.com',
        childName: 'Test Child',
        childAge: 10
      };

      const mockFormData = {
        email: 'parent@example.com',
        displayName: 'Parent Name',
        username: 'parentuser',
        password: 'securepassword123',
        confirmPassword: 'securepassword123'
      };

      const mockUserId = 'user-123';

      // Mock auth user creation
      (mockSupabase as any).auth = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null
        })
      };

      // Mock profile creation
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: mockUserId },
              error: null
            })
          })
        })
      } as any);

      const result = await invitationClaimService.createNewAuthorAccount(mockInvitationData, mockFormData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUserId);
      expect(result.isNewUser).toBe(true);
    });

    it('should handle auth user creation failure', async () => {
      const mockInvitationData = {
        invitationId: 'invitation-123',
        parentEmail: 'parent@example.com',
        childName: 'Test Child',
        childAge: 10
      };

      const mockFormData = {
        email: 'parent@example.com',
        displayName: 'Parent Name',
        username: 'parentuser',
        password: 'securepassword123',
        confirmPassword: 'securepassword123'
      };

      // Mock auth user creation failure
      (mockSupabase as any).auth = {
        signUp: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Email already registered' }
        })
      };

      const result = await invitationClaimService.createNewAuthorAccount(mockInvitationData, mockFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create user account');
    });

    it('should handle profile creation failure', async () => {
      const mockInvitationData = {
        invitationId: 'invitation-123',
        parentEmail: 'parent@example.com',
        childName: 'Test Child',
        childAge: 10
      };

      const mockFormData = {
        email: 'parent@example.com',
        displayName: 'Parent Name',
        username: 'parentuser',
        password: 'securepassword123',
        confirmPassword: 'securepassword123'
      };

      const mockUserId = 'user-123';

      // Mock auth user creation success
      (mockSupabase as any).auth = {
        signUp: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null
        })
      };

      // Mock profile creation failure
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Username already exists' }
            })
          })
        })
      } as any);

      const result = await invitationClaimService.createNewAuthorAccount(mockInvitationData, mockFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create user profile');
    });
  });

  describe('getClaimedInvitationDetails', () => {
    it('should return claimed invitation details', async () => {
      const mockInvitationId = 'invitation-123';
      const mockData = {
        id: mockInvitationId,
        parent_email: 'parent@example.com',
        child_name: 'Test Child',
        child_user_id: 'user-123',
        invitation_claimed_at: new Date().toISOString(),
        user: {
          id: 'user-123',
          display_name: 'Parent Name',
          username: 'parentuser',
          email: 'parent@example.com',
          role: 'author',
          created_at: new Date().toISOString()
        }
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockData,
                error: null
              })
            })
          })
        })
      } as any);

      const result = await invitationClaimService.getClaimedInvitationDetails(mockInvitationId);

      expect(result.data).toBeDefined();
      expect(result.data?.invitation).toEqual(mockData);
      expect(result.data?.user).toEqual(mockData.user);
      expect(result.error).toBeUndefined();
    });

    it('should handle fetch errors', async () => {
      const mockInvitationId = 'invitation-123';

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      } as any);

      const result = await invitationClaimService.getClaimedInvitationDetails(mockInvitationId);

      expect(result.error?.code).toBe('CLAIMED_INVITATION_FETCH_FAILED');
    });
  });

  describe('security features', () => {
    it('should handle rate limiting during token validation', async () => {
      const mockToken = 'rate-limited-token';
      const mockIpAddress = '192.168.1.1';

      // Mock rate limit exceeded
      const { invitationSecurityService } = await import('../invitationSecurityService');
      vi.mocked(invitationSecurityService.checkTokenValidationRateLimit).mockResolvedValue({
        allowed: false,
        reason: 'Too many validation attempts',
        remainingAttempts: 0,
        resetTime: new Date(Date.now() + 60000).toISOString()
      });

      const result = await invitationClaimService.validateTokenForClaim(mockToken, mockIpAddress);

      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.error?.message).toBe('Too many validation attempts');
    });

    it('should detect replay attacks', async () => {
      const mockToken = 'replay-attack-token';
      const mockIpAddress = '192.168.1.1';

      // Mock replay attack detection
      const { invitationSecurityService } = await import('../invitationSecurityService');
      vi.mocked(invitationSecurityService.checkReplayAttack).mockResolvedValue({
        isReplay: true,
        reason: 'Suspicious request pattern detected'
      });

      const result = await invitationClaimService.validateTokenForClaim(mockToken, mockIpAddress);

      expect(result.error?.code).toBe('REPLAY_ATTACK_DETECTED');
    });

    it('should validate token integrity', async () => {
      const mockToken = 'tampered-token';
      const mockIpAddress = '192.168.1.1';

      // Mock token integrity failure
      const { invitationSecurityService } = await import('../invitationSecurityService');
      vi.mocked(invitationSecurityService.validateTokenIntegrity).mockResolvedValue({
        valid: false,
        reason: 'Token format is invalid'
      });

      const result = await invitationClaimService.validateTokenForClaim(mockToken, mockIpAddress);

      expect(result.error?.code).toBe('INVALID_TOKEN_FORMAT');
    });

    it('should handle claim rate limiting', async () => {
      const mockToken = 'valid-token-123';
      const mockFormData = {
        email: 'parent@example.com',
        displayName: 'Parent Name',
        username: 'parentuser',
        password: 'securepassword123',
        confirmPassword: 'securepassword123'
      };
      const mockIpAddress = '192.168.1.1';

      // Mock claim rate limit exceeded
      const { invitationSecurityService } = await import('../invitationSecurityService');
      vi.mocked(invitationSecurityService.checkClaimRateLimit).mockResolvedValue({
        allowed: false,
        reason: 'Too many claim attempts',
        remainingAttempts: 0,
        resetTime: new Date(Date.now() + 60000).toISOString()
      });

      const result = await invitationClaimService.claimInvitation(mockToken, mockFormData, mockIpAddress);

      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('error handling', () => {
    it('should handle exceptions in validateTokenForClaim', async () => {
      const mockToken = 'exception-token';

      // Mock token service to throw exception
      mockTokenService.validateToken.mockRejectedValue(new Error('Database connection failed'));

      const result = await invitationClaimService.validateTokenForClaim(mockToken);

      expect(result.error?.code).toBe('HANDLED_ERROR');
    });

    it('should handle exceptions in claimInvitation', async () => {
      const mockToken = 'exception-token';
      const mockFormData = {
        email: 'parent@example.com',
        displayName: 'Parent Name',
        username: 'parentuser',
        password: 'securepassword123',
        confirmPassword: 'securepassword123'
      };

      // Mock validateTokenForClaim to throw exception
      vi.spyOn(invitationClaimService, 'validateTokenForClaim').mockRejectedValue(new Error('Unexpected error'));

      const result = await invitationClaimService.claimInvitation(mockToken, mockFormData);

      expect(result.error?.code).toBe('CLAIM_PROCESSING_EXCEPTION');
    });
  });
});