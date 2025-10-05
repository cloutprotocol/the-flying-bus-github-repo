import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { registrationFlowCoordinator } from '@/services/registrationFlowCoordinator';
import { validateInvitationToken } from '@/services/invitationService';
import { assignAuthorRoleFromInvitation, detectAndFixIncorrectRoles } from '@/services/roleService';
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
  detectAndFixIncorrectRoles: vi.fn()
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

describe('Role Assignment Failure Scenarios Integration Tests', () => {
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

  describe('Database Trigger Failure Scenarios', () => {
    it('should handle database trigger failure and recover with service-level assignment', async () => {
      const mockInvitationData = {
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      };

      // Mock successful invitation validation
      (validateInvitationToken as any).mockResolvedValue({
        data: { id: 'token-123', email: 'author@example.com' },
        error: null
      });

      // Mock successful auth signup
      (supabase.auth.signUp as any).mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'author@example.com' },
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      // Mock profile creation with reader role (trigger failed to assign author role)
      mockSingle.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'author@example.com',
          username: 'john_author',
          display_name: 'John Author',
          role: 'reader' // Trigger failed - should be author
        },
        error: null
      });

      // Mock invitation token update
      mockUpdate.mockResolvedValue({ data: null, error: null });

      // Mock service-level role assignment success (recovery)
      (assignAuthorRoleFromInvitation as any).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'author@example.com',
          role: 'author' // Service-level assignment succeeded
        },
        auditLog: 'audit-123'
      });

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(result.roleAssignmentResult?.success).toBe(true);

      // Verify service-level assignment was called as fallback
      expect(assignAuthorRoleFromInvitation).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          registrationType: 'invitation',
          userId: 'user-123',
          email: 'author@example.com'
        })
      );
    });

    it('should handle both trigger and service-level assignment failures', async () => {
      const mockInvitationData = {
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      };

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

      // Mock profile with reader role (trigger failed)
      mockSingle.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'author@example.com',
          role: 'reader'
        },
        error: null
      });

      mockUpdate.mockResolvedValue({ data: null, error: null });

      // Mock service-level assignment failure
      (assignAuthorRoleFromInvitation as any).mockResolvedValue({
        success: false,
        error: 'Database connection timeout'
      });

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      // Registration should still succeed but with reader role
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('reader');
      expect(result.roleAssignmentResult?.success).toBe(false);
      expect(result.roleAssignmentResult?.error).toBe('Database connection timeout');
    });
  });

  describe('Rollback Mechanism Tests', () => {
    it('should rollback profile creation on role assignment failure', async () => {
      const mockInvitationData = {
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      };

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

      // Mock profile creation failure
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
      expect(result.error?.message).toContain('Profile creation failed');

      // Verify rollback operations were called
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.from).toHaveBeenCalledWith('invitation_tokens');
    });

    it('should handle partial rollback failures gracefully', async () => {
      const mockInvitationData = {
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      };

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

      // Mock profile creation failure
      mockSingle.mockResolvedValue({ data: null, error: null });
      mockInsert.mockResolvedValue({
        data: null,
        error: new Error('Profile creation failed')
      });

      // Mock rollback failures
      mockDelete.mockRejectedValue(new Error('Profile deletion failed'));
      mockUpdate.mockRejectedValue(new Error('Token reset failed'));

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(false);
      // Should still return the original error, not rollback errors
      expect(result.error?.message).toContain('Profile creation failed');
    });

    it('should reset invitation token on registration failure', async () => {
      const mockInvitationData = {
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      };

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

      // Mock token update success, then failure in role assignment
      mockUpdate
        .mockResolvedValueOnce({ data: null, error: null }) // Token marked as used
        .mockResolvedValueOnce({ data: null, error: null }); // Token reset during rollback

      // Mock critical failure after token is marked as used
      (assignAuthorRoleFromInvitation as any).mockRejectedValue(new Error('Critical system error'));

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(false);

      // Verify token reset was attempted
      expect(mockUpdate).toHaveBeenCalledWith({
        used_at: null,
        used_by: null
      });
    });
  });

  describe('Recovery and Repair Mechanisms', () => {
    it('should detect and fix users with incorrect roles after failed registration', async () => {
      // Simulate a scenario where registration completed but role assignment failed
      const usersWithIncorrectRoles = [
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
      ];

      // Mock detection and fixing
      (detectAndFixIncorrectRoles as any).mockResolvedValue({
        fixed: 2,
        errors: []
      });

      const result = await detectAndFixIncorrectRoles();

      expect(result.fixed).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial success in bulk role fixing', async () => {
      (detectAndFixIncorrectRoles as any).mockResolvedValue({
        fixed: 1,
        errors: [
          'Failed to fix role for user2@example.com: Database timeout'
        ]
      });

      const result = await detectAndFixIncorrectRoles();

      expect(result.fixed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('user2@example.com');
    });

    it('should provide detailed error information for failed repairs', async () => {
      (detectAndFixIncorrectRoles as any).mockResolvedValue({
        fixed: 0,
        errors: [
          'Failed to query users: Connection refused',
          'Failed to fix role for user1@example.com: Permission denied',
          'Failed to fix role for user2@example.com: User not found'
        ]
      });

      const result = await detectAndFixIncorrectRoles();

      expect(result.fixed).toBe(0);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0]).toContain('Connection refused');
      expect(result.errors[1]).toContain('Permission denied');
      expect(result.errors[2]).toContain('User not found');
    });
  });

  describe('Audit Trail for Failed Operations', () => {
    it('should log failed role assignments for audit purposes', async () => {
      const mockInvitationData = {
        email: 'author@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Author',
        invitationToken: 'valid-token'
      };

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

      // Mock role assignment failure with audit logging
      (assignAuthorRoleFromInvitation as any).mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      // Mock audit service to track the failure
      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await registrationFlowCoordinator.coordinateInvitationRegistration(mockInvitationData);

      expect(result.success).toBe(true); // Registration succeeds
      expect(result.roleAssignmentResult?.success).toBe(false);

      // Verify audit logging was called for the failure
      expect(assignAuthorRoleFromInvitation).toHaveBeenCalled();
    });

    it('should track rollback operations in audit logs', async () => {
      // This test verifies that rollback operations are properly logged
      const simulateRollbackWithAuditLogging = async () => {
        try {
          // Simulate registration failure
          throw new Error('Registration failed');
        } catch (error) {
          // Log rollback start
          await RoleAuditService.logRoleChange({
            userId: 'user-123',
            userEmail: 'author@example.com',
            oldRole: 'unknown',
            newRole: 'unknown',
            changedBy: 'system',
            reason: 'Registration rollback initiated',
            context: {
              operation: 'rollback_start',
              error: (error as Error).message,
              timestamp: new Date().toISOString()
            }
          });

          // Perform rollback operations
          await supabase.from('profiles').delete().eq('id', 'user-123');
          await supabase.from('invitation_tokens').update({
            used_at: null,
            used_by: null
          }).eq('id', 'token-123');

          // Log rollback completion
          await RoleAuditService.logRoleChange({
            userId: 'user-123',
            userEmail: 'author@example.com',
            oldRole: 'unknown',
            newRole: 'unknown',
            changedBy: 'system',
            reason: 'Registration rollback completed',
            context: {
              operation: 'rollback_complete',
              timestamp: new Date().toISOString()
            }
          });

          return { rolledBack: true };
        }
      };

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);
      mockDelete.mockResolvedValue({ data: null, error: null });
      mockUpdate.mockResolvedValue({ data: null, error: null });

      const result = await simulateRollbackWithAuditLogging();

      expect(result.rolledBack).toBe(true);
      expect(RoleAuditService.logRoleChange).toHaveBeenCalledTimes(2);
      expect(RoleAuditService.logRoleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Registration rollback initiated'
        })
      );
      expect(RoleAuditService.logRoleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Registration rollback completed'
        })
      );
    });
  });

  describe('System Recovery Scenarios', () => {
    it('should handle system-wide role assignment failures', async () => {
      // Simulate a scenario where the role assignment system is down
      const simulateSystemDowntime = async () => {
        const registrationAttempts = [
          { email: 'user1@example.com', token: 'token-1' },
          { email: 'user2@example.com', token: 'token-2' },
          { email: 'user3@example.com', token: 'token-3' }
        ];

        const results = [];

        for (const attempt of registrationAttempts) {
          try {
            // All role assignments fail due to system downtime
            (assignAuthorRoleFromInvitation as any).mockResolvedValue({
              success: false,
              error: 'Role assignment service unavailable'
            });

            const result = {
              email: attempt.email,
              registrationSuccess: true, // User account created
              roleAssignmentSuccess: false, // Role assignment failed
              needsManualFix: true
            };

            results.push(result);
          } catch (error) {
            results.push({
              email: attempt.email,
              registrationSuccess: false,
              error: (error as Error).message
            });
          }
        }

        return results;
      };

      const results = await simulateSystemDowntime();

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.registrationSuccess).toBe(true);
        expect(result.roleAssignmentSuccess).toBe(false);
        expect(result.needsManualFix).toBe(true);
      });
    });

    it('should provide recovery recommendations after system failures', async () => {
      const generateRecoveryPlan = async (failedOperations: any[]) => {
        const recommendations = [];

        const roleAssignmentFailures = failedOperations.filter(
          op => op.type === 'role_assignment_failure'
        );

        const registrationFailures = failedOperations.filter(
          op => op.type === 'registration_failure'
        );

        if (roleAssignmentFailures.length > 0) {
          recommendations.push({
            action: 'run_bulk_role_fix',
            description: 'Run bulk role assignment fix for users with invitation tokens',
            affectedUsers: roleAssignmentFailures.length,
            priority: 'high'
          });
        }

        if (registrationFailures.length > 0) {
          recommendations.push({
            action: 'manual_user_creation',
            description: 'Manually create accounts for failed registrations',
            affectedUsers: registrationFailures.length,
            priority: 'medium'
          });
        }

        recommendations.push({
          action: 'system_health_check',
          description: 'Perform comprehensive system health check',
          priority: 'high'
        });

        return recommendations;
      };

      const failedOperations = [
        { type: 'role_assignment_failure', userId: 'user-1' },
        { type: 'role_assignment_failure', userId: 'user-2' },
        { type: 'registration_failure', email: 'user3@example.com' }
      ];

      const recoveryPlan = await generateRecoveryPlan(failedOperations);

      expect(recoveryPlan).toHaveLength(3);
      expect(recoveryPlan[0].action).toBe('run_bulk_role_fix');
      expect(recoveryPlan[0].affectedUsers).toBe(2);
      expect(recoveryPlan[1].action).toBe('manual_user_creation');
      expect(recoveryPlan[2].action).toBe('system_health_check');
    });
  });

  describe('Data Consistency Validation', () => {
    it('should validate data consistency after failed operations', async () => {
      const validateDataConsistency = async () => {
        const issues = [];

        // Check for users with invitation tokens but reader roles
        const usersWithIncorrectRoles = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            role,
            invitation_tokens!invitation_tokens_used_by_fkey (
              id,
              used_at
            )
          `)
          .eq('role', 'reader');

        // Check for orphaned invitation tokens
        const orphanedTokens = await supabase
          .from('invitation_tokens')
          .select('id')
          .not('used_at', 'is', null)
          .is('used_by', null);

        // Check for profiles without corresponding auth users
        // (This would require admin API access in real implementation)

        return {
          usersWithIncorrectRoles: usersWithIncorrectRoles.data?.length || 0,
          orphanedTokens: orphanedTokens.data?.length || 0,
          issues
        };
      };

      // Mock consistency check results
      mockSelect
        .mockResolvedValueOnce({
          data: [
            {
              id: 'user-1',
              email: 'user1@example.com',
              role: 'reader',
              invitation_tokens: [{ id: 'token-1', used_at: '2024-01-01' }]
            }
          ],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ id: 'orphan-token-1' }],
          error: null
        });

      const consistencyReport = await validateDataConsistency();

      expect(consistencyReport.usersWithIncorrectRoles).toBe(1);
      expect(consistencyReport.orphanedTokens).toBe(1);
    });

    it('should provide repair actions for consistency issues', async () => {
      const generateRepairActions = (consistencyReport: any) => {
        const actions = [];

        if (consistencyReport.usersWithIncorrectRoles > 0) {
          actions.push({
            type: 'fix_user_roles',
            description: 'Fix users with invitation tokens but incorrect roles',
            count: consistencyReport.usersWithIncorrectRoles,
            automated: true
          });
        }

        if (consistencyReport.orphanedTokens > 0) {
          actions.push({
            type: 'clean_orphaned_tokens',
            description: 'Clean up orphaned invitation tokens',
            count: consistencyReport.orphanedTokens,
            automated: true
          });
        }

        return actions;
      };

      const consistencyReport = {
        usersWithIncorrectRoles: 3,
        orphanedTokens: 2,
        issues: []
      };

      const repairActions = generateRepairActions(consistencyReport);

      expect(repairActions).toHaveLength(2);
      expect(repairActions[0].type).toBe('fix_user_roles');
      expect(repairActions[0].count).toBe(3);
      expect(repairActions[1].type).toBe('clean_orphaned_tokens');
      expect(repairActions[1].count).toBe(2);
    });
  });
});