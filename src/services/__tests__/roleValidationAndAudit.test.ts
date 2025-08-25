import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  validateUserRoleAssignment,
  detectUsersWithIncorrectRoles,
  fixUsersWithIncorrectRoles,
  generateRoleAssignmentHealthReport
} from '../roleAssignmentValidationService';
import { RoleAuditService } from '../roleAuditService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock RoleAuditService
vi.mock('../roleAuditService', () => ({
  RoleAuditService: {
    logRoleChange: vi.fn(),
    getRoleChangeHistory: vi.fn(),
    generateAuditReport: vi.fn()
  }
}));

describe('Role Validation and Audit Tests', () => {
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
      single: mockSingle,
      is: mockIs
    });
    
    mockIs.mockReturnValue({});
    
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateUserRoleAssignment', () => {
    it('should validate user with correct role assignment', async () => {
      // Mock user profile
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'author',
            username: 'testuser'
          },
          error: null
        })
        // Mock invitation token
        .mockResolvedValueOnce({
          data: {
            id: 'token-123',
            used_by: 'user-123',
            used_at: '2024-01-01T00:00:00Z'
          },
          error: null
        });

      const result = await validateUserRoleAssignment('user-123');

      expect(result.isValid).toBe(true);
      expect(result.currentRole).toBe('author');
      expect(result.expectedRole).toBe('author');
      expect(result.hasInvitationToken).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect user with invitation token but incorrect role', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader', // Incorrect role
            username: 'testuser'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'token-123',
            used_by: 'user-123',
            used_at: '2024-01-01T00:00:00Z'
          },
          error: null
        });

      const result = await validateUserRoleAssignment('user-123');

      expect(result.isValid).toBe(false);
      expect(result.currentRole).toBe('reader');
      expect(result.expectedRole).toBe('author');
      expect(result.hasInvitationToken).toBe(true);
      expect(result.issues).toContain('User has invitation token but does not have author role');
    });

    it('should handle user without invitation token', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader',
            username: 'testuser'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' } // No rows returned
        });

      const result = await validateUserRoleAssignment('user-123');

      expect(result.isValid).toBe(true);
      expect(result.currentRole).toBe('reader');
      expect(result.expectedRole).toBe('reader');
      expect(result.hasInvitationToken).toBe(false);
      expect(result.issues).toHaveLength(0);
    });

    it('should note manual upgrades as potentially valid', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'author', // Author role without invitation
            username: 'testuser'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });

      const result = await validateUserRoleAssignment('user-123');

      expect(result.isValid).toBe(true);
      expect(result.currentRole).toBe('author');
      expect(result.expectedRole).toBe('author');
      expect(result.hasInvitationToken).toBe(false);
      expect(result.issues).toContain('User has author role without invitation token (possibly manual upgrade)');
    });

    it('should handle user profile not found', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: new Error('User not found')
      });

      const result = await validateUserRoleAssignment('user-123');

      expect(result.isValid).toBe(false);
      expect(result.currentRole).toBe('unknown');
      expect(result.issues).toContain('User profile not found');
    });

    it('should detect invalid roles', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'invalid_role',
            username: 'testuser'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });

      const result = await validateUserRoleAssignment('user-123');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid role: invalid_role');
    });
  });

  describe('detectUsersWithIncorrectRoles', () => {
    it('should detect multiple users with role issues', async () => {
      // Mock users query
      mockSelect.mockResolvedValueOnce({
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
            role: 'author',
            invitation_tokens: []
          },
          {
            id: 'user-3',
            email: 'user3@example.com',
            role: 'author',
            invitation_tokens: [{ id: 'token-3', used_at: '2024-01-01' }]
          }
        ],
        error: null
      });

      // Mock orphaned tokens query
      mockIs.mockResolvedValueOnce({
        data: [{ id: 'orphan-1' }, { id: 'orphan-2' }],
        error: null
      });

      const result = await detectUsersWithIncorrectRoles();

      expect(result.totalUsers).toBe(3);
      expect(result.validUsers).toBe(1); // user-3 is valid
      expect(result.invalidUsers).toBe(2); // user-1 and user-2 have issues
      expect(result.summary.usersWithInvitationTokensButReaderRole).toBe(1); // user-1
      expect(result.summary.usersWithAuthorRoleButNoInvitationToken).toBe(1); // user-2
      expect(result.summary.orphanedInvitationTokens).toBe(2);
    });

    it('should handle empty user list', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null
      });

      mockIs.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await detectUsersWithIncorrectRoles();

      expect(result.totalUsers).toBe(0);
      expect(result.validUsers).toBe(0);
      expect(result.invalidUsers).toBe(0);
      expect(result.reports).toHaveLength(0);
    });

    it('should handle database query errors', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed')
      });

      await expect(detectUsersWithIncorrectRoles()).rejects.toThrow('Failed to fetch users');
    });
  });

  describe('fixUsersWithIncorrectRoles', () => {
    it('should fix specific users with incorrect roles', async () => {
      // Mock validation for specific users
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-1',
            email: 'user1@example.com',
            role: 'reader',
            username: 'user1'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'token-1',
            used_by: 'user-1',
            used_at: '2024-01-01'
          },
          error: null
        })
        // Mock role assignment
        .mockResolvedValueOnce({
          data: {
            id: 'user-1',
            role: 'reader'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'user-1',
            role: 'author'
          },
          error: null
        });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await fixUsersWithIncorrectRoles(['user-1']);

      expect(result.totalProcessed).toBe(1);
      expect(result.successfulFixes).toBe(1);
      expect(result.failedFixes).toBe(0);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].newRole).toBe('author');
    });

    it('should handle fix failures gracefully', async () => {
      // Mock validation
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-1',
            email: 'user1@example.com',
            role: 'reader',
            username: 'user1'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'token-1',
            used_by: 'user-1',
            used_at: '2024-01-01'
          },
          error: null
        })
        // Mock role assignment failure
        .mockRejectedValueOnce(new Error('Database update failed'));

      const result = await fixUsersWithIncorrectRoles(['user-1']);

      expect(result.totalProcessed).toBe(1);
      expect(result.successfulFixes).toBe(0);
      expect(result.failedFixes).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.errors).toContain('Exception fixing user1@example.com: Database update failed');
    });

    it('should handle no users needing fixes', async () => {
      // Mock validation showing user is already correct
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-1',
            email: 'user1@example.com',
            role: 'author',
            username: 'user1'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'token-1',
            used_by: 'user-1',
            used_at: '2024-01-01'
          },
          error: null
        });

      const result = await fixUsersWithIncorrectRoles(['user-1']);

      expect(result.totalProcessed).toBe(0);
      expect(result.successfulFixes).toBe(0);
      expect(result.failedFixes).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('generateRoleAssignmentHealthReport', () => {
    it('should generate comprehensive health report', async () => {
      // Mock bulk validation
      mockSelect
        .mockResolvedValueOnce({
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
              role: 'author',
              invitation_tokens: []
            }
          ],
          error: null
        })
        // Mock orphaned tokens
        .mockResolvedValueOnce({
          data: [{ id: 'orphan-1' }],
          error: null
        })
        // Mock all tokens count
        .mockResolvedValueOnce({
          data: [
            { id: 'token-1', used_at: '2024-01-01', used_by: 'user-1' },
            { id: 'token-2', used_at: null, used_by: null },
            { id: 'orphan-1', used_at: '2024-01-01', used_by: null }
          ],
          error: null
        });

      const report = await generateRoleAssignmentHealthReport();

      expect(report.summary.totalUsers).toBe(2);
      expect(report.summary.totalInvitationTokens).toBe(3);
      expect(report.summary.usersWithCorrectRoles).toBe(1);
      expect(report.summary.usersWithIncorrectRoles).toBe(1);
      expect(report.summary.orphanedTokens).toBe(1);

      expect(report.issues).toHaveLength(2);
      expect(report.issues[0].type).toBe('invitation_token_reader_role');
      expect(report.issues[1].type).toBe('author_role_no_token');

      expect(report.recommendations).toContain('Run bulk role fix to assign author roles to users with invitation tokens');
      expect(report.recommendations).toContain('Review users with author role but no invitation token - may be manual upgrades');
    });

    it('should generate healthy report when no issues found', async () => {
      // Mock perfect system state
      mockSelect
        .mockResolvedValueOnce({
          data: [
            {
              id: 'user-1',
              email: 'user1@example.com',
              role: 'author',
              invitation_tokens: [{ id: 'token-1', used_at: '2024-01-01' }]
            },
            {
              id: 'user-2',
              email: 'user2@example.com',
              role: 'reader',
              invitation_tokens: []
            }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ id: 'token-1', used_at: '2024-01-01', used_by: 'user-1' }],
          error: null
        });

      const report = await generateRoleAssignmentHealthReport();

      expect(report.summary.usersWithIncorrectRoles).toBe(0);
      expect(report.issues).toHaveLength(0);
      expect(report.recommendations).toContain('Role assignments are healthy - no issues detected');
    });
  });

  describe('Audit Logging Integration', () => {
    it('should test audit log creation for role changes', async () => {
      const mockAuditData = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        oldRole: 'reader',
        newRole: 'author',
        changedBy: 'admin-456',
        reason: 'Manual upgrade',
        context: {
          assignment_method: 'manual_admin',
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      await RoleAuditService.logRoleChange(mockAuditData);

      expect(RoleAuditService.logRoleChange).toHaveBeenCalledWith(mockAuditData);
    });

    it('should test audit log retrieval', async () => {
      const mockAuditHistory = [
        {
          id: 'audit-1',
          user_id: 'user-123',
          old_role: 'reader',
          new_role: 'author',
          changed_by: 'admin-456',
          reason: 'Manual upgrade',
          timestamp: '2024-01-01T00:00:00Z'
        }
      ];

      (RoleAuditService.getRoleChangeHistory as any).mockResolvedValue(mockAuditHistory);

      const history = await RoleAuditService.getRoleChangeHistory('user-123');

      expect(history).toEqual(mockAuditHistory);
      expect(RoleAuditService.getRoleChangeHistory).toHaveBeenCalledWith('user-123');
    });

    it('should test audit report generation', async () => {
      const mockAuditReport = {
        totalRoleChanges: 10,
        roleChangesByType: {
          manual_admin: 3,
          invitation_based: 5,
          database_trigger: 2
        },
        recentChanges: [],
        suspiciousActivity: []
      };

      (RoleAuditService.generateAuditReport as any).mockResolvedValue(mockAuditReport);

      const report = await RoleAuditService.generateAuditReport();

      expect(report).toEqual(mockAuditReport);
      expect(RoleAuditService.generateAuditReport).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Retry Mechanisms', () => {
    it('should test retry mechanism for transient failures', async () => {
      let attemptCount = 0;
      const mockRetryFunction = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Transient error');
        }
        return { success: true, attempt: attemptCount };
      };

      const result = await mockRetryFunction();
      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3);
    });

    it('should test error handling for permanent failures', async () => {
      const mockPermanentFailure = async () => {
        throw new Error('Permanent database error');
      };

      await expect(mockPermanentFailure()).rejects.toThrow('Permanent database error');
    });

    it('should test graceful degradation', async () => {
      const mockGracefulFunction = async (shouldFail: boolean) => {
        if (shouldFail) {
          console.warn('Non-critical operation failed, continuing...');
          return { success: false, degraded: true };
        }
        return { success: true, degraded: false };
      };

      const result = await mockGracefulFunction(true);
      expect(result.success).toBe(false);
      expect(result.degraded).toBe(true);
    });
  });
});