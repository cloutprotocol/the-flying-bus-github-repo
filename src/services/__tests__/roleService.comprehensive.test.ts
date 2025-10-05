import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  assignAuthorRoleFromInvitation,
  validateRoleAssignment,
  detectAndFixIncorrectRoles,
  manuallyAssignRole,
  grantAuthorRole,
  hasAuthorPrivileges,
  hasAdminPrivileges,
  hasModeratorPrivileges,
  canUpgradeRole,
  RoleValidationContext
} from '../roleService';
import { RoleAuditService } from '../roleAuditService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signUp: vi.fn()
    }
  }
}));

// Mock RoleAuditService
vi.mock('../roleAuditService', () => ({
  RoleAuditService: {
    logRoleChange: vi.fn()
  }
}));

describe('Role Service - Comprehensive Unit Tests', () => {
  const mockSupabaseFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockInsert = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockNot = vi.fn();
  const mockIs = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Supabase mock chain
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert
    });
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      not: mockNot,
      is: mockIs
    });
    
    mockUpdate.mockReturnValue({
      eq: mockEq
    });
    
    mockInsert.mockReturnValue({
      select: mockSelect
    });
    
    mockEq.mockReturnValue({
      select: mockSelect,
      single: mockSingle,
      not: mockNot
    });
    
    mockNot.mockReturnValue({
      single: mockSingle
    });
    
    mockIs.mockReturnValue({});
    
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('assignAuthorRoleFromInvitation', () => {
    const mockContext: RoleValidationContext = {
      registrationType: 'invitation',
      userId: 'user-123',
      email: 'test@example.com',
      invitationToken: 'token-123'
    };

    it('should successfully assign author role to user with reader role', async () => {
      // Mock current profile fetch
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader',
            username: 'testuser',
            display_name: 'Test User'
          },
          error: null
        })
        // Mock updated profile fetch
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'author',
            username: 'testuser',
            display_name: 'Test User'
          },
          error: null
        });

      // Mock audit service
      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(result.auditLog).toBe('logged');
      expect(RoleAuditService.logRoleChange).toHaveBeenCalledWith({
        userId: 'user-123',
        userEmail: 'test@example.com',
        oldRole: 'reader',
        newRole: 'author',
        changedBy: undefined,
        reason: 'Role assignment',
        context: expect.objectContaining({
          assignment_method: 'service_level',
          invitation_based: true
        })
      });
    });

    it('should handle user who already has author privileges', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'author',
          username: 'testuser',
          display_name: 'Test User'
        },
        error: null
      });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(RoleAuditService.logRoleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          oldRole: 'author',
          newRole: 'author',
          context: expect.objectContaining({
            already_had_privileges: true
          })
        })
      );
    });

    it('should reject non-invitation registration types', async () => {
      const standardContext: RoleValidationContext = {
        ...mockContext,
        registrationType: 'standard'
      };

      const result = await assignAuthorRoleFromInvitation('user-123', standardContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Role assignment only allowed for invitation-based registrations');
    });

    it('should handle database errors with retry mechanism', async () => {
      // First two attempts fail, third succeeds
      mockSingle
        .mockRejectedValueOnce(new Error('Database connection error'))
        .mockRejectedValueOnce(new Error('Database connection error'))
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader',
            username: 'testuser',
            display_name: 'Test User'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'author',
            username: 'testuser',
            display_name: 'Test User'
          },
          error: null
        });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
    });

    it('should fail after maximum retries', async () => {
      mockSingle.mockRejectedValue(new Error('Persistent database error'));
      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Persistent database error');
      expect(RoleAuditService.logRoleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            assignment_method: 'service_level_failed',
            final_attempt: true
          })
        })
      );
    });

    it('should handle user not found error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User profile not found');
    });
  });

  describe('validateRoleAssignment', () => {
    it('should validate user with invitation token has author role', async () => {
      // Mock invitation token check
      mockSingle
        .mockResolvedValueOnce({
          data: { id: 'token-123', used_by: 'user-123', used_at: '2024-01-01' },
          error: null
        })
        // Mock profile check
        .mockResolvedValueOnce({
          data: { role: 'author' },
          error: null
        });

      const result = await validateRoleAssignment('user-123');

      expect(result).toBe(true);
    });

    it('should fail validation when user has invitation token but reader role', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { id: 'token-123', used_by: 'user-123', used_at: '2024-01-01' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { role: 'reader' },
          error: null
        });

      const result = await validateRoleAssignment('user-123');

      expect(result).toBe(false);
    });

    it('should handle user without invitation token', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' } // No rows returned
        })
        .mockResolvedValueOnce({
          data: { role: 'reader' },
          error: null
        });

      const result = await validateRoleAssignment('user-123');

      expect(result).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockSingle.mockRejectedValue(new Error('Database error'));

      const result = await validateRoleAssignment('user-123');

      expect(result).toBe(false);
    });
  });

  describe('detectAndFixIncorrectRoles', () => {
    it('should detect and fix users with incorrect roles', async () => {
      // Mock query for users to fix
      mockEq.mockResolvedValueOnce({
        data: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            role: 'reader',
            invitation_tokens: [{ id: 'token-1', used_at: '2024-01-01' }]
          },
          {
            id: 'user-2',
            email: 'user2@example.com',
            role: 'reader',
            invitation_tokens: [{ id: 'token-2', used_at: '2024-01-01' }]
          }
        ],
        error: null
      });

      // Mock successful role assignments
      mockSingle
        .mockResolvedValue({
          data: {
            id: 'user-1',
            email: 'user1@example.com',
            role: 'reader',
            username: 'user1',
            display_name: 'User 1'
          },
          error: null
        })
        .mockResolvedValue({
          data: {
            id: 'user-1',
            email: 'user1@example.com',
            role: 'author',
            username: 'user1',
            display_name: 'User 1'
          },
          error: null
        });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await detectAndFixIncorrectRoles();

      expect(result.fixed).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });

    it('should handle no users needing fixes', async () => {
      mockEq.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await detectAndFixIncorrectRoles();

      expect(result.fixed).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it('should handle query errors', async () => {
      mockEq.mockResolvedValueOnce({
        data: null,
        error: new Error('Query failed')
      });

      const result = await detectAndFixIncorrectRoles();

      expect(result.fixed).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to query users');
    });
  });

  describe('manuallyAssignRole', () => {
    it('should successfully assign role manually by admin', async () => {
      // Mock admin verification
      mockSingle
        .mockResolvedValueOnce({
          data: { role: 'admin' },
          error: null
        })
        // Mock current user profile
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader',
            username: 'testuser',
            display_name: 'Test User'
          },
          error: null
        })
        // Mock updated profile
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'author',
            username: 'testuser',
            display_name: 'Test User'
          },
          error: null
        });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await manuallyAssignRole('user-123', 'author', 'admin-123', 'Manual upgrade');

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(RoleAuditService.logRoleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          oldRole: 'reader',
          newRole: 'author',
          changedBy: 'admin-123',
          reason: 'Manual upgrade'
        })
      );
    });

    it('should reject assignment by non-admin user', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { role: 'reader' },
        error: null
      });

      const result = await manuallyAssignRole('user-123', 'author', 'user-456', 'Unauthorized attempt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to assign roles');
    });

    it('should handle admin user not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('Admin not found')
      });

      const result = await manuallyAssignRole('user-123', 'author', 'admin-123', 'Manual upgrade');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin user not found');
    });
  });

  describe('grantAuthorRole', () => {
    it('should successfully grant author role', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'author',
          username: 'testuser',
          display_name: 'Test User',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        },
        error: null
      });

      const result = await grantAuthorRole('user-123');

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
    });

    it('should handle database update error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('Update failed')
      });

      const result = await grantAuthorRole('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle user not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await grantAuthorRole('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('Role privilege checks', () => {
    const mockReaderProfile = {
      id: 'user-1',
      role: 'reader' as const,
      username: 'reader',
      display_name: 'Reader User',
      email: 'reader@example.com',
      bio: '',
      avatar_url: '',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    const mockAuthorProfile = { ...mockReaderProfile, role: 'author' as const };
    const mockModeratorProfile = { ...mockReaderProfile, role: 'moderator' as const };
    const mockAdminProfile = { ...mockReaderProfile, role: 'admin' as const };

    describe('hasAuthorPrivileges', () => {
      it('should return false for null user', () => {
        expect(hasAuthorPrivileges(null)).toBe(false);
      });

      it('should return false for reader', () => {
        expect(hasAuthorPrivileges(mockReaderProfile)).toBe(false);
      });

      it('should return true for author', () => {
        expect(hasAuthorPrivileges(mockAuthorProfile)).toBe(true);
      });

      it('should return true for moderator', () => {
        expect(hasAuthorPrivileges(mockModeratorProfile)).toBe(true);
      });

      it('should return true for admin', () => {
        expect(hasAuthorPrivileges(mockAdminProfile)).toBe(true);
      });
    });

    describe('hasModeratorPrivileges', () => {
      it('should return false for null user', () => {
        expect(hasModeratorPrivileges(null)).toBe(false);
      });

      it('should return false for reader', () => {
        expect(hasModeratorPrivileges(mockReaderProfile)).toBe(false);
      });

      it('should return false for author', () => {
        expect(hasModeratorPrivileges(mockAuthorProfile)).toBe(false);
      });

      it('should return true for moderator', () => {
        expect(hasModeratorPrivileges(mockModeratorProfile)).toBe(true);
      });

      it('should return true for admin', () => {
        expect(hasModeratorPrivileges(mockAdminProfile)).toBe(true);
      });
    });

    describe('hasAdminPrivileges', () => {
      it('should return false for null user', () => {
        expect(hasAdminPrivileges(null)).toBe(false);
      });

      it('should return false for reader', () => {
        expect(hasAdminPrivileges(mockReaderProfile)).toBe(false);
      });

      it('should return false for author', () => {
        expect(hasAdminPrivileges(mockAuthorProfile)).toBe(false);
      });

      it('should return false for moderator', () => {
        expect(hasAdminPrivileges(mockModeratorProfile)).toBe(false);
      });

      it('should return true for admin', () => {
        expect(hasAdminPrivileges(mockAdminProfile)).toBe(true);
      });
    });
  });

  describe('canUpgradeRole', () => {
    it('should allow upgrade from reader to author', () => {
      expect(canUpgradeRole('reader', 'author')).toBe(true);
    });

    it('should allow upgrade from author to moderator', () => {
      expect(canUpgradeRole('author', 'moderator')).toBe(true);
    });

    it('should allow upgrade from moderator to admin', () => {
      expect(canUpgradeRole('moderator', 'admin')).toBe(true);
    });

    it('should not allow downgrade from author to reader', () => {
      expect(canUpgradeRole('author', 'reader')).toBe(false);
    });

    it('should not allow same role transition', () => {
      expect(canUpgradeRole('author', 'author')).toBe(false);
    });

    it('should handle invalid roles', () => {
      expect(canUpgradeRole('invalid', 'author')).toBe(false);
      expect(canUpgradeRole('author', 'invalid')).toBe(false);
    });
  });
});