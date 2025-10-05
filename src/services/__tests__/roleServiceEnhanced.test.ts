import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  assignAuthorRoleFromInvitation,
  validateRoleAssignment,
  detectAndFixIncorrectRoles,
  manuallyAssignRole,
  RoleValidationContext
} from '../roleService';

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
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

describe('Enhanced Role Service', () => {
  const mockUserId = 'test-user-id';
  const mockEmail = 'test@example.com';
  
  const mockContext: RoleValidationContext = {
    registrationType: 'invitation',
    userId: mockUserId,
    email: mockEmail,
    invitationToken: 'test-token',
    reason: 'invitation_registration'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignAuthorRoleFromInvitation', () => {
    it('should reject non-invitation registrations', async () => {
      const context = { ...mockContext, registrationType: 'standard' as const };
      
      const result = await assignAuthorRoleFromInvitation(mockUserId, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invitation-based registrations');
    });

    it('should handle user already having author privileges', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;
      
      // Mock profile fetch returning author role
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockUserId,
                email: mockEmail,
                role: 'author',
                username: 'testuser',
                display_name: 'Test User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              error: null
            })
          }))
        }))
      });

      const result = await assignAuthorRoleFromInvitation(mockUserId, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
    });

    it('should handle database errors gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;
      
      // Mock database error
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          }))
        }))
      });

      const result = await assignAuthorRoleFromInvitation(mockUserId, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch user profile');
    });
  });

  describe('validateRoleAssignment', () => {
    it('should validate users with invitation tokens have author role', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;
      
      // Mock invitation token exists and user has author role
      mockFrom
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
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'author' },
                error: null
              })
            }))
          }))
        });

      const result = await validateRoleAssignment(mockUserId);
      
      expect(result).toBe(true);
    });

    it('should detect incorrect role assignments', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;
      
      // Mock invitation token exists but user has reader role
      mockFrom
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
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'reader' },
                error: null
              })
            }))
          }))
        });

      const result = await validateRoleAssignment(mockUserId);
      
      expect(result).toBe(false);
    });
  });

  describe('manuallyAssignRole', () => {
    const adminUserId = 'admin-user-id';
    const targetRole = 'author' as const;
    const reason = 'Manual correction';

    it('should require admin privileges', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;
      
      // Mock admin user with reader role (insufficient privileges)
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { role: 'reader' },
              error: null
            })
          }))
        }))
      });

      const result = await manuallyAssignRole(mockUserId, targetRole, adminUserId, reason);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });

    it('should successfully assign role with admin privileges', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;
      
      // Mock admin user check, current profile fetch, and role update
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null
              })
            }))
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUserId,
                  email: mockEmail,
                  role: 'reader',
                  username: 'testuser',
                  display_name: 'Test User',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                error: null
              })
            }))
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: mockUserId,
                    email: mockEmail,
                    role: 'author',
                    username: 'testuser',
                    display_name: 'Test User',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  },
                  error: null
                })
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'audit-log-id' },
                error: null
              })
            }))
          }))
        });

      const result = await manuallyAssignRole(mockUserId, targetRole, adminUserId, reason);
      
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(result.auditLog).toBe('audit-log-id');
    });
  });

  describe('detectAndFixIncorrectRoles', () => {
    it('should find and fix users with incorrect roles', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;
      
      // Mock finding users with incorrect roles
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn().mockResolvedValue({
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
            }))
          }))
        })
        // Mock subsequent calls for role assignment
        .mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user1',
                  email: 'user1@example.com',
                  role: 'reader',
                  username: 'user1',
                  display_name: 'User 1',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                },
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'user1',
                    email: 'user1@example.com',
                    role: 'author',
                    username: 'user1',
                    display_name: 'User 1',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  },
                  error: null
                })
              }))
            }))
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'audit-log-id' },
                error: null
              })
            }))
          }))
        });

      const result = await detectAndFixIncorrectRoles();
      
      expect(result.fixed).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle cases with no incorrect roles', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const mockFrom = supabase.from as any;
      
      // Mock no users found
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          }))
        }))
      });

      const result = await detectAndFixIncorrectRoles();
      
      expect(result.fixed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});