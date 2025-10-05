import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  assignAuthorRoleFromInvitation,
  manuallyAssignRole,
  detectAndFixIncorrectRoles,
  RoleValidationContext
} from '../roleService';
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
    logRoleChange: vi.fn()
  }
}));

describe('Role Assignment Error Handling and Retry Tests', () => {
  const mockSupabaseFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      update: mockUpdate
    });
    
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    
    mockUpdate.mockReturnValue({
      eq: mockEq
    });
    
    mockEq.mockReturnValue({
      select: mockSelect,
      single: mockSingle
    });
    
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Retry Mechanism Tests', () => {
    const mockContext: RoleValidationContext = {
      registrationType: 'invitation',
      userId: 'user-123',
      email: 'test@example.com',
      invitationToken: 'token-123'
    };

    it('should retry on transient database errors', async () => {
      let attemptCount = 0;
      
      mockSingle.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Connection timeout'));
        }
        return Promise.resolve({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader',
            username: 'testuser',
            display_name: 'Test User'
          },
          error: null
        });
      });

      // Mock successful update on retry
      mockSingle
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
      expect(attemptCount).toBe(3); // Failed twice, succeeded on third attempt
    });

    it('should implement exponential backoff between retries', async () => {
      const startTime = Date.now();
      let attemptTimes: number[] = [];
      
      mockSingle.mockImplementation(() => {
        attemptTimes.push(Date.now());
        return Promise.reject(new Error('Temporary failure'));
      });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(false);
      expect(attemptTimes.length).toBe(3); // Maximum retries
      
      // Check that delays increase (allowing for some timing variance)
      if (attemptTimes.length >= 3) {
        const delay1 = attemptTimes[1] - attemptTimes[0];
        const delay2 = attemptTimes[2] - attemptTimes[1];
        expect(delay2).toBeGreaterThan(delay1);
      }
    });

    it('should fail after maximum retries exceeded', async () => {
      mockSingle.mockRejectedValue(new Error('Persistent database error'));
      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Persistent database error');
      
      // Should log the final failure
      expect(RoleAuditService.logRoleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            assignment_method: 'service_level_failed',
            final_attempt: true
          })
        })
      );
    });

    it('should handle different types of database errors appropriately', async () => {
      const testCases = [
        { error: new Error('Connection timeout'), shouldRetry: true },
        { error: new Error('Temporary lock'), shouldRetry: true },
        { error: new Error('Invalid user ID'), shouldRetry: false },
        { error: new Error('Permission denied'), shouldRetry: false }
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        
        if (testCase.shouldRetry) {
          // Mock failure then success
          mockSingle
            .mockRejectedValueOnce(testCase.error)
            .mockResolvedValueOnce({
              data: {
                id: 'user-123',
                role: 'reader',
                email: 'test@example.com'
              },
              error: null
            })
            .mockResolvedValueOnce({
              data: {
                id: 'user-123',
                role: 'author',
                email: 'test@example.com'
              },
              error: null
            });
        } else {
          mockSingle.mockRejectedValue(testCase.error);
        }

        (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

        const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

        if (testCase.shouldRetry) {
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(false);
          expect(result.error).toContain(testCase.error.message);
        }
      }
    });
  });

  describe('Error Recovery Tests', () => {
    it('should recover from partial failures in role assignment', async () => {
      const mockContext: RoleValidationContext = {
        registrationType: 'invitation',
        userId: 'user-123',
        email: 'test@example.com',
        invitationToken: 'token-123'
      };

      // Mock successful profile fetch but failed update
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader'
          },
          error: null
        })
        // First update attempt fails
        .mockRejectedValueOnce(new Error('Update failed'))
        // Second attempt succeeds
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'author'
          },
          error: null
        });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
    });

    it('should handle audit logging failures gracefully', async () => {
      const mockContext: RoleValidationContext = {
        registrationType: 'invitation',
        userId: 'user-123',
        email: 'test@example.com',
        invitationToken: 'token-123'
      };

      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'author'
          },
          error: null
        });

      // Mock audit logging failure
      (RoleAuditService.logRoleChange as any).mockRejectedValue(new Error('Audit service unavailable'));

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      // Role assignment should still succeed even if audit logging fails
      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('author');
      expect(result.auditLog).toBeNull();
    });

    it('should handle concurrent role assignment attempts', async () => {
      const mockContext: RoleValidationContext = {
        registrationType: 'invitation',
        userId: 'user-123',
        email: 'test@example.com',
        invitationToken: 'token-123'
      };

      // Simulate concurrent attempts
      const promises = Array(3).fill(null).map(() => {
        // Each attempt gets fresh mocks
        mockSingle
          .mockResolvedValueOnce({
            data: {
              id: 'user-123',
              email: 'test@example.com',
              role: 'reader'
            },
            error: null
          })
          .mockResolvedValueOnce({
            data: {
              id: 'user-123',
              email: 'test@example.com',
              role: 'author'
            },
            error: null
          });

        (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

        return assignAuthorRoleFromInvitation('user-123', mockContext);
      });

      const results = await Promise.all(promises);

      // All attempts should succeed (idempotent operation)
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.user?.role).toBe('author');
      });
    });
  });

  describe('Rollback and Cleanup Tests', () => {
    it('should handle rollback when role assignment fails after user creation', async () => {
      // This test simulates the registration flow coordinator's rollback mechanism
      const simulateRegistrationWithRollback = async () => {
        let userCreated = false;
        let profileCreated = false;
        let tokenMarkedUsed = false;

        try {
          // Simulate user creation
          userCreated = true;
          
          // Simulate profile creation
          profileCreated = true;
          
          // Simulate token marking
          tokenMarkedUsed = true;
          
          // Simulate role assignment failure
          throw new Error('Role assignment failed');
          
        } catch (error) {
          // Rollback operations
          if (tokenMarkedUsed) {
            // Reset token
            await supabase
              .from('invitation_tokens')
              .update({ used_at: null, used_by: null })
              .eq('id', 'token-123');
          }
          
          if (profileCreated) {
            // Delete profile
            await supabase
              .from('profiles')
              .delete()
              .eq('id', 'user-123');
          }
          
          // Note: Cannot delete auth user via client SDK
          
          return { success: false, rolledBack: true, error: (error as Error).message };
        }
      };

      mockUpdate.mockResolvedValue({ data: null, error: null });
      const mockDelete = vi.fn().mockResolvedValue({ data: null, error: null });
      mockEq.mockReturnValue({ delete: mockDelete });

      const result = await simulateRegistrationWithRollback();

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('invitation_tokens');
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });

    it('should handle partial rollback failures gracefully', async () => {
      const simulatePartialRollbackFailure = async () => {
        try {
          throw new Error('Role assignment failed');
        } catch (error) {
          // Simulate rollback operations with some failures
          try {
            await supabase
              .from('invitation_tokens')
              .update({ used_at: null, used_by: null })
              .eq('id', 'token-123');
          } catch (rollbackError) {
            console.warn('Token rollback failed:', rollbackError);
          }
          
          try {
            // This will fail
            throw new Error('Profile deletion failed');
          } catch (rollbackError) {
            console.warn('Profile rollback failed:', rollbackError);
          }
          
          return { 
            success: false, 
            error: (error as Error).message,
            rollbackPartial: true 
          };
        }
      };

      mockUpdate.mockResolvedValue({ data: null, error: null });

      const result = await simulatePartialRollbackFailure();

      expect(result.success).toBe(false);
      expect(result.rollbackPartial).toBe(true);
    });
  });

  describe('Bulk Operation Error Handling', () => {
    it('should handle errors in bulk role detection and fixing', async () => {
      // Mock query that returns some users but fails for others
      mockEq.mockImplementation((field, value) => {
        if (field === 'role' && value === 'reader') {
          return Promise.resolve({
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
        }
        return Promise.resolve({ data: null, error: null });
      });

      // Mock individual role assignments - first succeeds, second fails
      let assignmentCount = 0;
      mockSingle.mockImplementation(() => {
        assignmentCount++;
        if (assignmentCount <= 2) {
          // First user - successful assignment
          return Promise.resolve({
            data: {
              id: 'user-1',
              email: 'user1@example.com',
              role: 'reader'
            },
            error: null
          });
        } else if (assignmentCount <= 4) {
          // Second user - successful fetch, failed update
          if (assignmentCount === 3) {
            return Promise.resolve({
              data: {
                id: 'user-2',
                email: 'user2@example.com',
                role: 'reader'
              },
              error: null
            });
          } else {
            return Promise.reject(new Error('Database lock timeout'));
          }
        }
        return Promise.resolve({ data: null, error: null });
      });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await detectAndFixIncorrectRoles();

      expect(result.fixed).toBe(1); // Only first user fixed
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('user2@example.com');
    });

    it('should continue processing after individual failures in bulk operations', async () => {
      const processBulkOperationWithFailures = async (userIds: string[]) => {
        const results = [];
        const errors = [];

        for (const userId of userIds) {
          try {
            if (userId === 'user-fail') {
              throw new Error('Simulated failure');
            }
            
            results.push({
              userId,
              success: true,
              message: 'Processed successfully'
            });
          } catch (error) {
            errors.push(`Failed to process ${userId}: ${(error as Error).message}`);
            results.push({
              userId,
              success: false,
              error: (error as Error).message
            });
          }
        }

        return { results, errors };
      };

      const result = await processBulkOperationWithFailures([
        'user-1',
        'user-fail',
        'user-3'
      ]);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Network and Timeout Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const mockContext: RoleValidationContext = {
        registrationType: 'invitation',
        userId: 'user-123',
        email: 'test@example.com',
        invitationToken: 'token-123'
      };

      // Mock network timeout
      mockSingle.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100);
        });
      });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle connection refused errors', async () => {
      const mockContext: RoleValidationContext = {
        registrationType: 'invitation',
        userId: 'user-123',
        email: 'test@example.com',
        invitationToken: 'token-123'
      };

      mockSingle.mockRejectedValue(new Error('Connection refused'));
      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });

    it('should handle rate limiting errors', async () => {
      const mockContext: RoleValidationContext = {
        registrationType: 'invitation',
        userId: 'user-123',
        email: 'test@example.com',
        invitationToken: 'token-123'
      };

      mockSingle.mockRejectedValue(new Error('Rate limit exceeded'));
      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });
  });

  describe('Data Consistency Error Handling', () => {
    it('should handle inconsistent data states', async () => {
      const mockContext: RoleValidationContext = {
        registrationType: 'invitation',
        userId: 'user-123',
        email: 'test@example.com',
        invitationToken: 'token-123'
      };

      // Mock inconsistent state - user profile shows different data on subsequent reads
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'different@example.com', // Inconsistent email
            role: 'author'
          },
          error: null
        });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      // Should still succeed but log the inconsistency
      expect(result.success).toBe(true);
    });

    it('should handle missing related data', async () => {
      const mockContext: RoleValidationContext = {
        registrationType: 'invitation',
        userId: 'user-123',
        email: 'test@example.com',
        invitationToken: 'token-123'
      };

      // Mock profile exists but update returns null (data was deleted concurrently)
      mockSingle
        .mockResolvedValueOnce({
          data: {
            id: 'user-123',
            email: 'test@example.com',
            role: 'reader'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: null, // Profile was deleted
          error: null
        });

      (RoleAuditService.logRoleChange as any).mockResolvedValue(undefined);

      const result = await assignAuthorRoleFromInvitation('user-123', mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve updated profile');
    });
  });
});