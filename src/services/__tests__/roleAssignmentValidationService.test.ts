import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateUserRoleAssignment,
  detectUsersWithIncorrectRoles,
  fixUsersWithIncorrectRoles,
  adminManualRoleAssignment,
  generateRoleAssignmentHealthReport
} from '../roleAssignmentValidationService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          not: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        not: vi.fn(() => ({
          single: vi.fn(),
          is: vi.fn(() => ({
            null: vi.fn()
          }))
        })),
        is: vi.fn(() => ({
          null: vi.fn()
        }))
      }))
    }))
  }
}));

// Mock role service
vi.mock('../roleService', () => ({
  assignAuthorRoleFromInvitation: vi.fn(),
  validateRoleAssignment: vi.fn(),
  manuallyAssignRole: vi.fn(),
  detectAndFixIncorrectRoles: vi.fn()
}));

describe('Role Assignment Validation Service', () => {
  const mockUserId = 'test-user-id';
  const mockEmail = 'test@example.com';
  const mockAdminUserId = 'admin-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateUserRoleAssignment', () => {
    it('should validate user with correct author role and invitation token', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;

      // Mock profile fetch
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUserId,
                  email: mockEmail,
                  role: 'author'
                },
                error: null
              })
            }))
          }))
        })
        // Mock invitation token fetch
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'token-id', used_by: mockUserId },
                  error: null
                })
              }))
            }))
          }))
        });

      const result = await validateUserRoleAssignment(mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.currentRole).toBe('author');
      expect(result.expectedRole).toBe('author');
      expect(result.hasInvitationToken).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect user with invitation token but reader role', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;

      // Mock profile fetch
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUserId,
                  email: mockEmail,
                  role: 'reader'
                },
                error: null
              })
            }))
          }))
        })
        // Mock invitation token fetch
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'token-id', used_by: mockUserId },
                  error: null
                })
              }))
            }))
          }))
        });

      const result = await validateUserRoleAssignment(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.currentRole).toBe('reader');
      expect(result.expectedRole).toBe('author');
      expect(result.hasInvitationToken).toBe(true);
      expect(result.issues).toContain('User has invitation token but does not have author role');
    });

    it('should handle user not found', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;

      // Mock profile fetch error
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' }
            })
          }))
        }))
      });

      const result = await validateUserRoleAssignment(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('User profile not found');
    });
  });

  describe('detectUsersWithIncorrectRoles', () => {
    it('should detect users with incorrect roles', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;

      // Mock users fetch
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'user1',
                email: 'user1@example.com',
                role: 'reader',
                invitation_tokens: [{ id: 'token1', used_at: new Date().toISOString() }]
              },
              {
                id: 'user2',
                email: 'user2@example.com',
                role: 'author',
                invitation_tokens: []
              }
            ],
            error: null
          })
        })
        // Mock orphaned tokens fetch
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            not: vi.fn(() => ({
              is: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        });

      const result = await detectUsersWithIncorrectRoles();

      expect(result.totalUsers).toBe(2);
      expect(result.invalidUsers).toBe(1);
      expect(result.validUsers).toBe(1);
      expect(result.summary.usersWithInvitationTokensButReaderRole).toBe(1);
      expect(result.summary.usersWithAuthorRoleButNoInvitationToken).toBe(1);
    });

    it('should handle empty user list', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;

      // Mock empty users fetch
      mockFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      });

      const result = await detectUsersWithIncorrectRoles();

      expect(result.totalUsers).toBe(0);
      expect(result.validUsers).toBe(0);
      expect(result.invalidUsers).toBe(0);
    });
  });

  describe('adminManualRoleAssignment', () => {
    it('should successfully assign role manually', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { manuallyAssignRole } = await import('../roleService');
      const mockFrom = supabase.from as any;

      // Mock profile fetch
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                email: mockEmail,
                role: 'reader'
              },
              error: null
            })
          }))
        }))
      });

      // Mock successful role assignment
      (manuallyAssignRole as any).mockResolvedValue({
        success: true,
        user: { role: 'author' },
        auditLog: 'audit-log-id'
      });

      const result = await adminManualRoleAssignment(
        mockUserId,
        'author',
        mockAdminUserId,
        'Manual correction'
      );

      expect(result.success).toBe(true);
      expect(result.oldRole).toBe('reader');
      expect(result.newRole).toBe('author');
      expect(result.auditLogId).toBe('audit-log-id');
    });

    it('should handle role assignment failure', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { manuallyAssignRole } = await import('../roleService');
      const mockFrom = supabase.from as any;

      // Mock profile fetch
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                email: mockEmail,
                role: 'reader'
              },
              error: null
            })
          }))
        }))
      });

      // Mock failed role assignment
      (manuallyAssignRole as any).mockResolvedValue({
        success: false,
        error: 'Insufficient permissions'
      });

      const result = await adminManualRoleAssignment(
        mockUserId,
        'author',
        mockAdminUserId,
        'Manual correction'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });
  });

  describe('generateRoleAssignmentHealthReport', () => {
    it('should generate comprehensive health report', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;

      // Mock users fetch for validation
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'user1',
                email: 'user1@example.com',
                role: 'reader',
                invitation_tokens: [{ id: 'token1', used_at: new Date().toISOString() }]
              }
            ],
            error: null
          })
        })
        // Mock orphaned tokens fetch for validation
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            not: vi.fn(() => ({
              is: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        })
        // Mock all tokens fetch for report
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'token1' }],
            error: null
          })
        });

      const result = await generateRoleAssignmentHealthReport();

      expect(result.summary.totalUsers).toBe(1);
      expect(result.summary.usersWithIncorrectRoles).toBe(1);
      expect(result.issues).toHaveLength(1);
      expect(result.recommendations).toContain('Run bulk role fix to assign author roles to users with invitation tokens');
    });

    it('should report healthy system', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;

      // Mock users fetch with all correct roles
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'user1',
                email: 'user1@example.com',
                role: 'author',
                invitation_tokens: [{ id: 'token1', used_at: new Date().toISOString() }]
              }
            ],
            error: null
          })
        })
        // Mock orphaned tokens fetch
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            not: vi.fn(() => ({
              is: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        })
        // Mock all tokens fetch
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 'token1' }],
            error: null
          })
        });

      const result = await generateRoleAssignmentHealthReport();

      expect(result.summary.usersWithIncorrectRoles).toBe(0);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toContain('Role assignments are healthy - no issues detected');
    });
  });
});