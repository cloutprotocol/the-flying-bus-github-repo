import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rlsPolicyManager } from '../rlsPolicyManager';
import { registrationFlowCoordinator } from '../registrationFlowCoordinator';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
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

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      is: vi.fn().mockReturnThis()
    }))
  }))
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('RLS Policy Compliance Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Standard Registration RLS Compliance', () => {
    it('should create profile with standard permissions when RLS allows', async () => {
      // Arrange
      const profileData = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      const authContext = {
        userId: 'user-123',
        email: 'test@example.com',
        registrationType: 'standard' as const
      };

      // Mock successful standard profile creation
      const mockInsert = vi.fn().mockResolvedValue({
        data: profileData,
        error: null
      });

      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      // Act
      const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(profileData);
      expect(mockInsert).toHaveBeenCalledWith(profileData);
      
      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Creating profile with permissions'),
        expect.objectContaining({
          userId: 'user-123',
          registrationType: 'standard'
        })
      );
    });

    it('should fallback to service role when RLS blocks standard creation', async () => {
      // Arrange
      const profileData = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      const authContext = {
        userId: 'user-123',
        email: 'test@example.com',
        registrationType: 'standard' as const
      };

      // Mock RLS policy violation on standard client
      const mockStandardInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'new row violates row-level security policy',
          code: '42501'
        }
      });

      // Mock successful service role creation
      const mockServiceRoleInsert = vi.fn().mockResolvedValue({
        data: profileData,
        error: null
      });

      const mockFrom = vi.fn(() => ({
        insert: mockStandardInsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      // Mock service role client
      const { createClient } = await import('@supabase/supabase-js');
      (createClient as any).mockReturnValue({
        from: vi.fn(() => ({
          insert: mockServiceRoleInsert,
          select: vi.fn().mockReturnThis(),
          single: vi.fn()
        }))
      });

      // Mock system configuration to provide service role key
      const mockConfigFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { value: 'mock-service-role-key' },
          error: null
        })
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'system_configuration') {
          return mockConfigFrom();
        }
        return mockFrom();
      });

      // Reinitialize RLS policy manager to pick up service role
      await rlsPolicyManager.refreshServiceRoleClient();

      // Act
      const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(profileData);
      
      // Verify standard creation was attempted first
      expect(mockStandardInsert).toHaveBeenCalledWith(profileData);
      
      // Verify service role creation was used as fallback
      expect(mockServiceRoleInsert).toHaveBeenCalledWith(profileData);
      
      // Verify appropriate logging
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Standard profile creation failed'),
        expect.any(Object)
      );
      
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Profile created successfully with service role')
      );
    });

    it('should handle service role unavailability gracefully', async () => {
      // Arrange
      const profileData = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      const authContext = {
        userId: 'user-123',
        email: 'test@example.com',
        registrationType: 'standard' as const
      };

      // Mock RLS policy violation
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'new row violates row-level security policy',
          code: '42501'
        }
      });

      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      // Mock no service role key available
      const mockConfigFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'system_configuration') {
          return mockConfigFrom();
        }
        return mockFrom();
      });

      // Reinitialize without service role
      await rlsPolicyManager.refreshServiceRoleClient();

      // Act
      const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Service role not available');
      expect(result.code).toBe('SERVICE_ROLE_UNAVAILABLE');
      
      // Verify appropriate logging
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Service role client not available')
      );
    });
  });

  describe('Invitation Registration RLS Compliance', () => {
    it('should create author profile with service role permissions for invitation registration', async () => {
      // Arrange
      const profileData = {
        id: 'user-456',
        email: 'author@example.com',
        username: 'jane_author',
        display_name: 'Jane Author',
        role: 'author'
      };

      const authContext = {
        userId: 'user-456',
        email: 'author@example.com',
        registrationType: 'invitation' as const,
        bypassRLS: true
      };

      // Mock service role creation (bypassing standard RLS)
      const mockServiceRoleInsert = vi.fn().mockResolvedValue({
        data: profileData,
        error: null
      });

      // Mock service role client
      const { createClient } = await import('@supabase/supabase-js');
      (createClient as any).mockReturnValue({
        from: vi.fn(() => ({
          insert: mockServiceRoleInsert,
          select: vi.fn().mockReturnThis(),
          single: vi.fn()
        }))
      });

      // Mock system configuration
      const mockConfigFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { value: 'mock-service-role-key' },
          error: null
        })
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'system_configuration') {
          return mockConfigFrom();
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

      await rlsPolicyManager.refreshServiceRoleClient();

      // Act
      const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(profileData);
      
      // Verify service role was used directly (bypassing standard RLS)
      expect(mockServiceRoleInsert).toHaveBeenCalledWith(profileData);
      
      // Verify appropriate logging
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Creating profile with service role'),
        expect.objectContaining({
          userId: 'user-456',
          registrationType: 'invitation'
        })
      );
    });

    it('should validate invitation permissions before profile creation', async () => {
      // Arrange
      const authContext = {
        userId: 'user-456',
        email: 'author@example.com',
        registrationType: 'invitation' as const
      };

      // Act
      const isValid = await rlsPolicyManager.validateRegistrationPermissions(authContext);

      // Assert
      expect(isValid).toBe(true);
      
      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Validating invitation-based registration permissions'),
        expect.objectContaining({
          userId: 'user-456',
          email: 'author@example.com'
        })
      );
    });

    it('should create registration context for audit trail', async () => {
      // Arrange
      const profileData = {
        id: 'user-456',
        email: 'author@example.com',
        username: 'jane_author',
        display_name: 'Jane Author',
        role: 'author'
      };

      const authContext = {
        userId: 'user-456',
        email: 'author@example.com',
        registrationType: 'invitation' as const,
        bypassRLS: true
      };

      const mockInsert = vi.fn().mockResolvedValue({
        data: profileData,
        error: null
      });

      const mockRegistrationInsert = vi.fn().mockResolvedValue({
        data: { id: 'context-123' },
        error: null
      });

      const mockFrom = vi.fn((table: string) => {
        if (table === 'registration_contexts') {
          return {
            insert: mockRegistrationInsert,
            update: vi.fn().mockResolvedValue({ error: null }),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis()
          };
        }
        return {
          insert: mockInsert,
          select: vi.fn().mockReturnThis(),
          single: vi.fn()
        };
      });

      // Mock service role client
      const { createClient } = await import('@supabase/supabase-js');
      (createClient as any).mockReturnValue({
        from: mockFrom
      });

      (supabase.from as any).mockImplementation(mockFrom);

      // Mock system configuration
      const mockConfigFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { value: 'mock-service-role-key' },
          error: null
        })
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'system_configuration') {
          return mockConfigFrom();
        }
        return mockFrom(table);
      });

      await rlsPolicyManager.refreshServiceRoleClient();

      // Act
      const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);

      // Assert
      expect(result.success).toBe(true);
      
      // Verify registration context was created
      expect(mockRegistrationInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          registration_type: 'invitation',
          metadata: expect.objectContaining({
            email: 'author@example.com',
            bypassRLS: true
          })
        })
      );
      
      // Verify context completion logging
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Registration context created'),
        expect.any(Object)
      );
    });
  });

  describe('RLS Policy Error Detection and Handling', () => {
    it('should correctly identify RLS policy violations', async () => {
      // Arrange
      const rlsErrors = [
        { code: '42501', message: 'insufficient privilege' },
        { code: 'PGRST301', message: 'RLS policy violation' },
        { code: '42P01', message: 'relation does not exist' },
        { message: 'new row violates row-level security policy for table "profiles"' },
        { message: 'permission denied for table profiles' }
      ];

      const profileData = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      const authContext = {
        userId: 'user-123',
        email: 'test@example.com',
        registrationType: 'standard' as const
      };

      for (const error of rlsErrors) {
        // Mock RLS error
        const mockInsert = vi.fn().mockResolvedValue({
          data: null,
          error
        });

        const mockFrom = vi.fn(() => ({
          insert: mockInsert,
          select: vi.fn().mockReturnThis(),
          single: vi.fn()
        }));

        (supabase.from as any).mockImplementation(mockFrom);

        // Act
        const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);

        // Assert
        expect(result.success).toBe(false);
        expect(result.requiresServiceRole).toBe(true);
        
        // Verify error was logged appropriately
        expect(logger.warn).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('Standard profile creation failed'),
          expect.objectContaining({
            error: error.message,
            code: error.code
          })
        );

        vi.clearAllMocks();
      }
    });

    it('should handle non-RLS errors appropriately', async () => {
      // Arrange
      const nonRlsErrors = [
        { code: '23505', message: 'duplicate key value violates unique constraint' },
        { code: '23502', message: 'null value in column violates not-null constraint' },
        { message: 'connection timeout' }
      ];

      const profileData = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      const authContext = {
        userId: 'user-123',
        email: 'test@example.com',
        registrationType: 'standard' as const
      };

      for (const error of nonRlsErrors) {
        // Mock non-RLS error
        const mockInsert = vi.fn().mockResolvedValue({
          data: null,
          error
        });

        const mockFrom = vi.fn(() => ({
          insert: mockInsert,
          select: vi.fn().mockReturnThis(),
          single: vi.fn()
        }));

        (supabase.from as any).mockImplementation(mockFrom);

        // Act
        const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);

        // Assert
        expect(result.success).toBe(false);
        expect(result.requiresServiceRole).toBe(false);
        expect(result.error).toBe(error.message);
        
        vi.clearAllMocks();
      }
    });
  });

  describe('Service Role Operations Audit and Security', () => {
    it('should log all service role operations for security audit', async () => {
      // Arrange
      const profileData = {
        id: 'user-456',
        email: 'author@example.com',
        username: 'jane_author',
        display_name: 'Jane Author',
        role: 'author'
      };

      const authContext = {
        userId: 'user-456',
        email: 'author@example.com',
        registrationType: 'invitation' as const,
        bypassRLS: true
      };

      // Mock service role operation
      const mockServiceRoleInsert = vi.fn().mockResolvedValue({
        data: profileData,
        error: null
      });

      const { createClient } = await import('@supabase/supabase-js');
      (createClient as any).mockReturnValue({
        from: vi.fn(() => ({
          insert: mockServiceRoleInsert,
          select: vi.fn().mockReturnThis(),
          single: vi.fn()
        }))
      });

      // Mock system configuration
      const mockConfigFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { value: 'mock-service-role-key' },
          error: null
        })
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'system_configuration') {
          return mockConfigFrom();
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

      await rlsPolicyManager.refreshServiceRoleClient();

      // Act
      const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);

      // Assert
      expect(result.success).toBe(true);
      
      // Verify comprehensive audit logging
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Creating profile with service role'),
        expect.objectContaining({
          userId: 'user-456',
          registrationType: 'invitation'
        })
      );
      
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Profile created successfully with service role')
      );
      
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Registration context completed'),
        expect.objectContaining({
          userId: 'user-456'
        })
      );
    });

    it('should validate service role availability before operations', async () => {
      // Act
      const isAvailable = rlsPolicyManager.isServiceRoleAvailable();

      // Assert - Should check availability
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should handle service role client initialization failures', async () => {
      // Arrange - Mock configuration error
      const mockConfigFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'system_configuration') {
          return mockConfigFrom();
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

      // Act
      await rlsPolicyManager.refreshServiceRoleClient();

      // Assert
      expect(rlsPolicyManager.isServiceRoleAvailable()).toBe(false);
      
      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Failed to initialize service role client'),
        expect.any(Error)
      );
    });
  });

  describe('Registration Flow Coordinator RLS Integration', () => {
    it('should coordinate RLS policy management during standard registration', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      };

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

      // Mock auth signup
      vi.doMock('@/integrations/supabase/client', () => ({
        supabase: {
          auth: {
            signUp: vi.fn().mockResolvedValue({
              data: { user: mockUser, session: mockSession },
              error: null
            })
          },
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            }),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis()
          }))
        }
      }));

      // Mock RLS policy manager
      vi.doMock('../rlsPolicyManager', () => ({
        rlsPolicyManager: {
          createProfileWithPermissions: vi.fn().mockResolvedValue({
            success: true,
            data: mockProfile
          })
        }
      }));

      // Act
      const result = await registrationFlowCoordinator.coordinateStandardRegistration(registrationData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockProfile);
      expect(result.session).toEqual(mockSession);
    });

    it('should handle RLS policy failures with proper rollback', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User'
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = {
        access_token: 'access-token-123',
        user: mockUser
      };

      // Mock auth signup success
      vi.doMock('@/integrations/supabase/client', () => ({
        supabase: {
          auth: {
            signUp: vi.fn().mockResolvedValue({
              data: { user: mockUser, session: mockSession },
              error: null
            })
          },
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows' }
            }),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis()
          }))
        }
      }));

      // Mock RLS policy failure
      vi.doMock('../rlsPolicyManager', () => ({
        rlsPolicyManager: {
          createProfileWithPermissions: vi.fn().mockResolvedValue({
            success: false,
            error: 'RLS policy violation - insufficient privileges',
            code: '42501'
          })
        }
      }));

      // Act
      const result = await registrationFlowCoordinator.coordinateStandardRegistration(registrationData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('RLS policy violation');
      expect(result.rollbackPerformed).toBe(true);
    });
  });
});