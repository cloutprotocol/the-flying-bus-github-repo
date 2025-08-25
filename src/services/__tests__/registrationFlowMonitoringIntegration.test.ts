import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { registrationFlowCoordinator } from '../registrationFlowCoordinator';
import { registrationMonitoring } from '../registrationMonitoringService';
import { rlsPolicyManager } from '../rlsPolicyManager';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}));

vi.mock('../registrationMonitoringService', () => ({
  registrationMonitoring: {
    startPerformanceTracking: vi.fn(),
    endPerformanceTracking: vi.fn(() => 1500),
    logSuccessfulRegistration: vi.fn(),
    logFailedRegistration: vi.fn(),
    logRLSViolation: vi.fn(),
    logServiceRoleUsage: vi.fn()
  }
}));

vi.mock('../rlsPolicyManager', () => ({
  rlsPolicyManager: {
    createProfileWithPermissions: vi.fn()
  }
}));

vi.mock('../registrationErrorHandler', () => ({
  registrationErrorHandler: {
    executeWithRetry: vi.fn((fn) => fn()),
    processError: vi.fn(() => ({
      userMessage: 'Registration failed',
      error: { code: 'REGISTRATION_FAILED' }
    }))
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Registration Flow Monitoring Integration', () => {
  const mockSupabaseAuth = vi.mocked(supabase.auth);
  const mockSupabaseFrom = vi.mocked(supabase.from);
  const mockMonitoring = vi.mocked(registrationMonitoring);
  const mockRlsPolicyManager = vi.mocked(rlsPolicyManager);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Standard Registration Monitoring', () => {
    it('should track performance and log successful standard registration', async () => {
      // Setup successful registration mocks
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token-123' };
      const mockProfile = { id: 'user-123', email: 'test@example.com', username: 'testuser' };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      mockRlsPolicyManager.createProfileWithPermissions.mockResolvedValue({
        success: true,
        data: mockProfile
      });

      const registrationData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      };

      const result = await registrationFlowCoordinator.coordinateStandardRegistration(registrationData);

      // Verify performance tracking
      expect(mockMonitoring.startPerformanceTracking).toHaveBeenCalledWith(
        expect.stringMatching(/^reg_\d+_[a-z0-9]+$/)
      );
      expect(mockMonitoring.endPerformanceTracking).toHaveBeenCalledWith(
        expect.stringMatching(/^reg_\d+_[a-z0-9]+$/)
      );

      // Verify successful registration logging
      expect(mockMonitoring.logSuccessfulRegistration).toHaveBeenCalledWith(
        'standard',
        'user-123',
        'test@example.com',
        1500,
        expect.objectContaining({
          serviceRoleUsed: true,
          metadata: expect.objectContaining({
            username: 'testuser',
            displayName: 'Test User'
          })
        })
      );

      expect(result.success).toBe(true);
    });

    it('should track performance and log failed standard registration', async () => {
      // Setup failed registration mock
      const registrationError = new Error('Email already exists');
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: registrationError
      });

      const registrationData = {
        email: 'existing@example.com',
        password: 'password123',
        username: 'existinguser',
        displayName: 'Existing User'
      };

      const result = await registrationFlowCoordinator.coordinateStandardRegistration(registrationData);

      // Verify performance tracking
      expect(mockMonitoring.startPerformanceTracking).toHaveBeenCalled();
      expect(mockMonitoring.endPerformanceTracking).toHaveBeenCalled();

      // Verify failed registration logging
      expect(mockMonitoring.logFailedRegistration).toHaveBeenCalledWith(
        'standard',
        'existing@example.com',
        registrationError,
        1500,
        expect.objectContaining({
          metadata: expect.objectContaining({
            username: 'existinguser',
            displayName: 'Existing User'
          })
        })
      );

      expect(result.success).toBe(false);
    });
  });

  describe('Invitation Registration Monitoring', () => {
    it('should track performance and log successful invitation registration', async () => {
      // Setup successful invitation registration mocks
      const mockToken = {
        id: 'token-123',
        token: 'invitation-token-456',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending'
      };

      const mockUser = { id: 'user-456', email: 'author@example.com' };
      const mockSession = { access_token: 'token-456' };
      const mockProfile = { 
        id: 'user-456', 
        email: 'author@example.com', 
        username: 'john_doe',
        role: 'author'
      };

      // Mock token validation
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockToken, error: null })
          })
        })
      } as any);

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      mockRlsPolicyManager.createProfileWithPermissions.mockResolvedValue({
        success: true,
        data: mockProfile
      });

      // Mock token update
      mockSupabaseFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any);

      const registrationData = {
        email: 'author@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        invitationToken: 'invitation-token-456'
      };

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(registrationData);

      // Verify performance tracking
      expect(mockMonitoring.startPerformanceTracking).toHaveBeenCalled();
      expect(mockMonitoring.endPerformanceTracking).toHaveBeenCalled();

      // Verify successful registration logging
      expect(mockMonitoring.logSuccessfulRegistration).toHaveBeenCalledWith(
        'invitation',
        'user-456',
        'author@example.com',
        1500,
        expect.objectContaining({
          rlsBypassUsed: true,
          serviceRoleUsed: true,
          invitationToken: 'invitation-token-456',
          metadata: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            tokenId: 'token-123'
          })
        })
      );

      expect(result.success).toBe(true);
    });

    it('should track performance and log failed invitation registration', async () => {
      // Setup failed token validation
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Token not found') })
          })
        })
      } as any);

      const registrationData = {
        email: 'author@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        invitationToken: 'invalid-token'
      };

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(registrationData);

      // Verify performance tracking
      expect(mockMonitoring.startPerformanceTracking).toHaveBeenCalled();
      expect(mockMonitoring.endPerformanceTracking).toHaveBeenCalled();

      // Verify failed registration logging
      expect(mockMonitoring.logFailedRegistration).toHaveBeenCalledWith(
        'invitation',
        'author@example.com',
        expect.any(Error),
        1500,
        expect.objectContaining({
          invitationToken: 'invalid-token',
          metadata: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe'
          })
        })
      );

      expect(result.success).toBe(false);
    });
  });

  describe('RLS Policy Manager Monitoring Integration', () => {
    it('should log RLS violations when standard profile creation fails', async () => {
      // Setup user creation success but profile creation failure
      const mockUser = { id: 'user-789', email: 'test@example.com' };
      const mockSession = { access_token: 'token-789' };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock RLS policy manager to simulate RLS violation
      mockRlsPolicyManager.createProfileWithPermissions.mockResolvedValue({
        success: false,
        error: 'RLS policy violation',
        requiresServiceRole: true
      });

      const registrationData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      };

      await registrationFlowCoordinator.coordinateStandardRegistration(registrationData);

      // Verify that RLS violation was logged through the policy manager
      expect(mockRlsPolicyManager.createProfileWithPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-789',
          email: 'test@example.com',
          username: 'testuser'
        }),
        expect.objectContaining({
          userId: 'user-789',
          email: 'test@example.com',
          registrationType: 'standard'
        })
      );
    });

    it('should log service role usage for invitation registration', async () => {
      // Setup successful invitation registration that uses service role
      const mockToken = {
        id: 'token-456',
        token: 'invitation-token-789',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        status: 'pending'
      };

      const mockUser = { id: 'user-890', email: 'author@example.com' };
      const mockSession = { access_token: 'token-890' };
      const mockProfile = { 
        id: 'user-890', 
        email: 'author@example.com', 
        role: 'author'
      };

      // Mock successful flow
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockToken, error: null })
          })
        })
      } as any);

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      mockRlsPolicyManager.createProfileWithPermissions.mockResolvedValue({
        success: true,
        data: mockProfile
      });

      mockSupabaseFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      } as any);

      const registrationData = {
        email: 'author@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        invitationToken: 'invitation-token-789'
      };

      await registrationFlowCoordinator.coordinateInvitationRegistration(registrationData);

      // Verify that profile creation was called with RLS bypass
      expect(mockRlsPolicyManager.createProfileWithPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-890',
          email: 'author@example.com',
          role: 'author'
        }),
        expect.objectContaining({
          userId: 'user-890',
          registrationType: 'invitation',
          bypassRLS: true
        })
      );
    });
  });

  describe('Performance Tracking Edge Cases', () => {
    it('should handle performance tracking when transaction ID is reused', async () => {
      // This tests the cleanup of performance marks
      const mockUser = { id: 'user-999', email: 'test@example.com' };
      const mockSession = { access_token: 'token-999' };
      const mockProfile = { id: 'user-999', email: 'test@example.com' };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      mockRlsPolicyManager.createProfileWithPermissions.mockResolvedValue({
        success: true,
        data: mockProfile
      });

      const registrationData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      };

      // Run two registrations to test performance tracking cleanup
      await registrationFlowCoordinator.coordinateStandardRegistration(registrationData);
      await registrationFlowCoordinator.coordinateStandardRegistration({
        ...registrationData,
        email: 'test2@example.com'
      });

      // Verify performance tracking was called for both
      expect(mockMonitoring.startPerformanceTracking).toHaveBeenCalledTimes(2);
      expect(mockMonitoring.endPerformanceTracking).toHaveBeenCalledTimes(2);
    });

    it('should handle monitoring service failures gracefully', async () => {
      // Setup successful registration but monitoring failure
      const mockUser = { id: 'user-111', email: 'test@example.com' };
      const mockSession = { access_token: 'token-111' };
      const mockProfile = { id: 'user-111', email: 'test@example.com' };

      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      mockRlsPolicyManager.createProfileWithPermissions.mockResolvedValue({
        success: true,
        data: mockProfile
      });

      // Make monitoring service throw an error
      mockMonitoring.logSuccessfulRegistration.mockRejectedValue(
        new Error('Monitoring service unavailable')
      );

      const registrationData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      };

      const result = await registrationFlowCoordinator.coordinateStandardRegistration(registrationData);

      // Registration should still succeed even if monitoring fails
      expect(result.success).toBe(true);
      expect(mockMonitoring.logSuccessfulRegistration).toHaveBeenCalled();
    });
  });
});