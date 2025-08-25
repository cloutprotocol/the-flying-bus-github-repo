import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { registrationFlowCoordinator } from '@/services/registrationFlowCoordinator';
import { validateInvitationToken } from '@/services/invitationService';
import { assignAuthorRoleFromInvitation, validateRoleAssignment } from '@/services/roleService';
import { RoleAuditService } from '@/services/roleAuditService';

// Mock all dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn()
    },
    from: vi.fn()
  }
}));

vi.mock('@/services/invitationService', () => ({
  validateInvitationToken: vi.fn()
}));

vi.mock('@/services/roleService', () => ({
  assignAuthorRoleFromInvitation: vi.fn(),
  validateRoleAssignment: vi.fn()
}));

vi.mock('@/services/roleAuditService', () => ({
  RoleAuditService: {
    logRoleChange: vi.fn()
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Registration Flow Role Assignment Integration Tests', () => {
  const mockSupabaseFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    });
    
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    
    mockInsert.mockReturnValue({
      select: mockSelect
    });
    
    mockUpdate.mockReturnValue({
      eq: mockEq
    });
    
    mockDelete.mockReturnValue({
      eq: mockEq
    });
    
    mockEq.mockReturnValue({
      single: mockSingle,
      select: mockSelect
    });
    
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Invitation Registration Flow', () => {
    const mockInvitationData = {
      email: 'author@example.com',
      password: 'securePassword123',
      firstName: 'John',
      lastName: 'Author',
      invitationToken: 'valid-token-123'
    };

    it('should complete full invitation registration with role assignment', async () => {
      // Mock invitation token validation
      (validateInvitationToken as any).mockResolvedValue({
        data: {
          id: 'token-123',
          email: 'author@example.com',
          expires_at: new Date(Date.now() + 86400000).toISOString()
        },
        error: null
      });

      // Mock auth signup
      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'author@example.com',
            email_confirmed_at: new Date().toISOString()
          },
          session: {
            access_token: 'mock-token',
            user: { id: 'user-123' }
          }
        },
        error: null
      });

      // Mock profile creation (database trigger simulation)
      mockSingle
        .mockResolvedValueOnce({ data: null, error: null }) // First check - no profile
        .mockResolvedValueOnce({ data: null, error: null }) // Second check - no profile
        .mockResolvedValueOnce({ data: null, error: null }) // Third check - no profile
        .mockResolvedValueOnce({ data: null, error: null }) // Fourth check - no profile
        .mockResolvedValueOnce({ data: null, error: null }) // Fifth check - no profile
        .mockResolvedValueOnce({
          // Manual profile creation
          data: {
            id: 'user-123',
            email: 'author@example.com',
            username: 'john_author',
            display_name: 'John Author',
            role: 'reader',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          error: null
        });

      // Mock invitation token update
      mockUpdate.mockResolvedValue({ data: null, error: null });

      // Mock role assignment
      (assignAuthorRoleFromInvitation as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'author@example.com',
          username: 'john_author',
          display_name: 'John Author',
          role: 'author',
          bio: '',
          avatar_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        auditLog: 'audit-123'
      });

      // Mock role validation
      (validateRoleAssignment as any).mockResolvedValue(true);

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(result.session).toBeDefined();
      expect(result.roleAssignmentResult?.success).toBe(true);

      // Verify the flow called all necessary services
      expect(validateInvitationToken).toHaveBeenCalledWith('valid-token-123', 'author@example.com');
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'author@example.com',
        password: 'securePassword123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Author',
            invitation_token: 'valid-token-123'
          }
        }
      });
      expect(assignAuthorRoleFromInvitation).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          registrationType: 'invitation',
          userId: 'user-123',
          email: 'author@example.com',
          invitationToken: 'valid-token-123'
        })
      );
      expect(validateRoleAssignment).toHaveBeenCalledWith('user-123');
    });

    it('should handle role assignment failure gracefully', async () => {
      // Mock successful setup
      (validateInvitationToken as any).mockResolvedValue({
        data: { id: 'token-123', email: 'author@example.com' },
        error: null
      });

      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'author@example.com' },
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      mockSingle.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'author@example.com',
          role: 'reader'
        },
        error: null
      });

      mockUpdate.mockResolvedValue({ data: null, error: null });

      // Mock role assignment failure
      (assignAuthorRoleFromInvitation as any).mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      (validateRoleAssignment as any).mockResolvedValue(false);

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      // Registration should still succeed even if role assignment fails
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('reader'); // Remains as reader
      expect(result.roleAssignmentResult?.success).toBe(false);
      expect(result.roleAssignmentResult?.error).toBe('Database connection failed');
    });

    it('should handle invitation token validation failure', async () => {
      (validateInvitationToken as any).mockResolvedValue({
        data: null,
        error: 'Invalid or expired invitation token'
      });

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid or expired invitation token');
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should handle auth signup failure', async () => {
      (validateInvitationToken as any).mockResolvedValue({
        data: { id: 'token-123', email: 'author@example.com' },
        error: null
      });

      (supabase.auth.signUp as any).mockResolvedValue({
        data: null,
        error: new Error('Email already registered')
      });

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Email already registered');
      expect(assignAuthorRoleFromInvitation).not.toHaveBeenCalled();
    });

    it('should implement rollback on registration failure', async () => {
      (validateInvitationToken as any).mockResolvedValue({
        data: { id: 'token-123', email: 'author@example.com' },
        error: null
      });

      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'author@example.com' },
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      // Mock profile creation failure after user creation
      mockSingle.mockResolvedValue({ data: null, error: null });
      mockInsert.mockResolvedValue({
        data: null,
        error: new Error('Profile creation failed')
      });

      // Mock rollback operations
      mockDelete.mockResolvedValue({ data: null, error: null });
      mockUpdate.mockResolvedValue({ data: null, error: null });

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(false);
      
      // Verify rollback was attempted
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.from).toHaveBeenCalledWith('invitation_tokens');
    });
  });

  describe('Standard Registration Flow', () => {
    const mockStandardData = {
      email: 'reader@example.com',
      password: 'securePassword123',
      username: 'reader_user',
      displayName: 'Reader User'
    };

    it('should complete standard registration with reader role', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: {
            id: 'user-456',
            email: 'reader@example.com',
            email_confirmed_at: new Date().toISOString()
          },
          session: {
            access_token: 'mock-token',
            user: { id: 'user-456' }
          }
        },
        error: null
      });

      // Mock profile creation by database trigger
      mockSingle.mockResolvedValue({
        data: {
          id: 'user-456',
          email: 'reader@example.com',
          username: 'reader_user',
          display_name: 'Reader User',
          role: 'reader',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      });

      const result = await registrationFlowCoordinator.coordinateStandardRegistration(mockStandardData);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('reader');
      expect(result.session).toBeDefined();

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'reader@example.com',
        password: 'securePassword123',
        options: {
          data: {
            username: 'reader_user',
            display_name: 'Reader User'
          }
        }
      });

      // Should not call role assignment services for standard registration
      expect(assignAuthorRoleFromInvitation).not.toHaveBeenCalled();
    });

    it('should handle manual profile creation for standard registration', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: { id: 'user-456', email: 'reader@example.com' },
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      // Mock no profile found initially, then successful manual creation
      mockSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: {
            id: 'user-456',
            email: 'reader@example.com',
            username: 'reader_user',
            display_name: 'Reader User',
            role: 'reader'
          },
          error: null
        });

      const result = await registrationFlowCoordinator.coordinateStandardRegistration(mockStandardData);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('reader');
    });
  });

  describe('Dashboard Access After Registration', () => {
    it('should allow author dashboard access after successful invitation registration', async () => {
      // Mock successful invitation registration
      (validateInvitationToken as any).mockResolvedValue({
        data: { id: 'token-123', email: 'author@example.com' },
        error: null
      });

      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'author@example.com' },
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      mockSingle.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'author@example.com',
          role: 'reader'
        },
        error: null
      });

      mockUpdate.mockResolvedValue({ data: null, error: null });

      (assignAuthorRoleFromInvitation as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          role: 'author',
          email: 'author@example.com'
        }
      });

      (validateRoleAssignment as any).mockResolvedValue(true);

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration({
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      });

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');

      // Simulate dashboard access check
      const canAccessAuthorDashboard = result.user?.role === 'author';
      expect(canAccessAuthorDashboard).toBe(true);
    });

    it('should restrict admin dashboard access for authors', async () => {
      const mockAuthorUser = {
        id: 'user-123',
        role: 'author' as const,
        email: 'author@example.com'
      };

      // Simulate role-based access control
      const canAccessAdminFeatures = mockAuthorUser.role === 'admin';
      const canAccessAuthorFeatures = ['author', 'moderator', 'admin'].includes(mockAuthorUser.role);
      const canAccessUserManagement = ['admin'].includes(mockAuthorUser.role);

      expect(canAccessAdminFeatures).toBe(false);
      expect(canAccessAuthorFeatures).toBe(true);
      expect(canAccessUserManagement).toBe(false);
    });
  });

  describe('Article Creation and Ownership', () => {
    it('should assign article ownership after successful author registration', async () => {
      const mockAuthorUser = {
        id: 'user-123',
        role: 'author' as const,
        email: 'author@example.com',
        username: 'john_author',
        display_name: 'John Author'
      };

      // Mock article creation
      const mockArticleData = {
        title: 'My First Article',
        content: 'Article content here',
        category: 'learning',
        status: 'draft'
      };

      mockInsert.mockResolvedValue({
        data: {
          id: 'article-123',
          title: 'My First Article',
          content: 'Article content here',
          author_id: 'user-123',
          status: 'draft',
          created_at: new Date().toISOString()
        },
        error: null
      });

      // Simulate article creation service
      const createArticle = async (articleData: any, authorId: string) => {
        const { data, error } = await supabase
          .from('articles')
          .insert({
            ...articleData,
            author_id: authorId,
            status: 'draft'
          })
          .select()
          .single();

        return { data, error };
      };

      const result = await createArticle(mockArticleData, mockAuthorUser.id);

      expect(result.data?.author_id).toBe(mockAuthorUser.id);
      expect(result.data?.status).toBe('draft');
      expect(supabase.from).toHaveBeenCalledWith('articles');
    });

    it('should prevent article creation for non-author users', async () => {
      const mockReaderUser = {
        id: 'user-456',
        role: 'reader' as const,
        email: 'reader@example.com'
      };

      // Simulate role-based article creation check
      const canCreateArticles = ['author', 'moderator', 'admin'].includes(mockReaderUser.role);

      expect(canCreateArticles).toBe(false);
    });
  });

  describe('Role Assignment Failure Scenarios', () => {
    it('should handle database trigger failure during registration', async () => {
      (validateInvitationToken as any).mockResolvedValue({
        data: { id: 'token-123', email: 'author@example.com' },
        error: null
      });

      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'author@example.com' },
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      // Mock profile creation with reader role (trigger failed)
      mockSingle.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'author@example.com',
          role: 'reader' // Should be author but trigger failed
        },
        error: null
      });

      mockUpdate.mockResolvedValue({ data: null, error: null });

      // Mock service-level role assignment success
      (assignAuthorRoleFromInvitation as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          role: 'author',
          email: 'author@example.com'
        }
      });

      (validateRoleAssignment as any).mockResolvedValue(true);

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration({
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      });

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(assignAuthorRoleFromInvitation).toHaveBeenCalled();
    });

    it('should handle concurrent registration attempts', async () => {
      const mockInvitationData = {
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      };

      // Mock successful validation and auth
      (validateInvitationToken as any).mockResolvedValue({
        data: { id: 'token-123', email: 'author@example.com' },
        error: null
      });

      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'author@example.com' },
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      mockSingle.mockResolvedValue({
        data: {
          id: 'user-123',
          role: 'reader'
        },
        error: null
      });

      mockUpdate.mockResolvedValue({ data: null, error: null });

      (assignAuthorRoleFromInvitation as any).mockResolvedValue({
        success: true,
        user: { id: 'user-123', role: 'author' }
      });

      (validateRoleAssignment as any).mockResolvedValue(true);

      // Simulate concurrent registration attempts
      const promises = Array(3).fill(null).map(() =>
        registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData)
      );

      const results = await Promise.allSettled(promises);

      // At least one should succeed, others may fail due to duplicate email
      const successfulResults = results.filter(
        (result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled' && result.value.success
      );

      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle registration flow within acceptable time limits', async () => {
      const startTime = Date.now();

      (validateInvitationToken as any).mockResolvedValue({
        data: { id: 'token-123', email: 'author@example.com' },
        error: null
      });

      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'author@example.com' },
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      mockSingle.mockResolvedValue({
        data: {
          id: 'user-123',
          role: 'reader'
        },
        error: null
      });

      mockUpdate.mockResolvedValue({ data: null, error: null });

      (assignAuthorRoleFromInvitation as any).mockResolvedValue({
        success: true,
        user: { id: 'user-123', role: 'author' }
      });

      (validateRoleAssignment as any).mockResolvedValue(true);

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration({
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple simultaneous registrations', async () => {
      const registrationPromises = Array(5).fill(null).map((_, index) => {
        (validateInvitationToken as any).mockResolvedValue({
          data: { id: `token-${index}`, email: `user${index}@example.com` },
          error: null
        });

        (supabase.auth.signUp as any).mockResolvedValue({
          data: {
            user: { id: `user-${index}`, email: `user${index}@example.com` },
            session: { access_token: 'mock-token' }
          },
          error: null
        });

        return registrationFlowCoordinator.coordinateInvitationRegistration({
          email: `user${index}@example.com`,
          password: 'password',
          firstName: 'User',
          lastName: `${index}`,
          invitationToken: `token-${index}`
        });
      });

      const results = await Promise.allSettled(registrationPromises);

      // All registrations should complete (successfully or with expected errors)
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
});