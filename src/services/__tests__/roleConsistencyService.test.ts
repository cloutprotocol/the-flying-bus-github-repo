/**
 * Tests for Role Consistency Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleConsistencyService } from '../roleConsistencyService';
import { supabase } from '@/integrations/supabase/client';
import { RoleAuditService } from '../roleAuditService';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('../roleAuditService');

const mockSupabase = supabase as any;
const mockRoleAuditService = RoleAuditService as any;

describe('RoleConsistencyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectIncorrectRoles', () => {
    it('should detect users with invitation but reader role', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test1@example.com',
          role: 'reader',
          created_at: '2023-01-01T00:00:00Z',
          invitation_tokens: [
            {
              id: 'token-1',
              used_at: '2023-01-01T00:00:00Z',
              invitation_requests: { status: 'approved' }
            }
          ]
        },
        {
          id: 'user-2',
          email: 'test2@example.com',
          role: 'author',
          created_at: '2023-01-02T00:00:00Z',
          invitation_tokens: [
            {
              id: 'token-2',
              used_at: '2023-01-02T00:00:00Z',
              invitation_requests: { status: 'approved' }
            }
          ]
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null
          })
        })
      });

      mockRoleAuditService.getUserRoleHistory.mockResolvedValue([]);

      const inconsistencies = await RoleConsistencyService.detectIncorrectRoles();

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0]).toMatchObject({
        userId: 'user-1',
        userEmail: 'test1@example.com',
        currentRole: 'reader',
        expectedRole: 'author',
        severity: 'high'
      });
    });

    it('should detect users with author role but no invitation', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test1@example.com',
          role: 'author',
          created_at: '2023-01-01T00:00:00Z',
          invitation_tokens: []
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null
          })
        })
      });

      // Mock no manual assignment in audit logs
      mockRoleAuditService.getUserRoleHistory.mockResolvedValue([]);

      const inconsistencies = await RoleConsistencyService.detectIncorrectRoles();

      expect(inconsistencies).toHaveLength(1);
      expect(inconsistencies[0]).toMatchObject({
        userId: 'user-1',
        userEmail: 'test1@example.com',
        currentRole: 'author',
        expectedRole: 'reader',
        severity: 'medium'
      });
    });

    it('should not flag users with manual role assignments', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test1@example.com',
          role: 'author',
          created_at: '2023-01-01T00:00:00Z',
          invitation_tokens: []
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null
          })
        })
      });

      // Mock manual assignment in audit logs
      mockRoleAuditService.getUserRoleHistory.mockResolvedValue([
        {
          metadata: {
            assignment_method: 'manual_admin'
          }
        }
      ]);

      const inconsistencies = await RoleConsistencyService.detectIncorrectRoles();

      expect(inconsistencies).toHaveLength(0);
    });
  });

  describe('validateRoleConsistency', () => {
    it('should return validation results', async () => {
      // Mock detectIncorrectRoles
      vi.spyOn(RoleConsistencyService, 'detectIncorrectRoles').mockResolvedValue([
        {
          userId: 'user-1',
          userEmail: 'test1@example.com',
          currentRole: 'reader',
          expectedRole: 'author',
          reason: 'Test inconsistency',
          registrationDate: '2023-01-01T00:00:00Z',
          severity: 'high'
        }
      ]);

      // Mock user count
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            count: 10,
            error: null
          })
        })
      });

      mockRoleAuditService.logEvent.mockResolvedValue(undefined);

      const result = await RoleConsistencyService.validateRoleConsistency();

      expect(result).toMatchObject({
        isValid: false,
        totalUsers: 10,
        validUsers: 9,
        invalidUsers: 1
      });
      expect(result.inconsistencies).toHaveLength(1);
    });
  });

  describe('fixUserRole', () => {
    it('should successfully fix a user role', async () => {
      const mockCurrentProfile = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'reader'
      };

      const mockUpdatedProfile = {
        ...mockCurrentProfile,
        role: 'author'
      };

      // Mock profile fetch
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCurrentProfile,
              error: null
            })
          })
        })
      });

      // Mock profile update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedProfile,
                error: null
              })
            })
          })
        })
      });

      mockRoleAuditService.logRoleChange.mockResolvedValue(undefined);

      const result = await RoleConsistencyService.fixUserRole(
        'user-1',
        'author',
        'admin-1',
        'Test fix'
      );

      expect(result).toMatchObject({
        userId: 'user-1',
        userEmail: 'test@example.com',
        oldRole: 'reader',
        newRole: 'author',
        success: true
      });

      expect(mockRoleAuditService.logRoleChange).toHaveBeenCalledWith({
        userId: 'user-1',
        userEmail: 'test@example.com',
        oldRole: 'reader',
        newRole: 'author',
        changedBy: 'admin-1',
        reason: 'Role consistency fix: Test fix',
        context: expect.objectContaining({
          fix_type: 'consistency_repair',
          automated: false
        })
      });
    });

    it('should handle user not found error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' }
            })
          })
        })
      });

      const result = await RoleConsistencyService.fixUserRole(
        'user-1',
        'author',
        'admin-1',
        'Test fix'
      );

      expect(result).toMatchObject({
        userId: 'user-1',
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('generateConsistencyReport', () => {
    it('should generate a comprehensive report', async () => {
      const mockValidationResult = {
        isValid: false,
        inconsistencies: [
          {
            userId: 'user-1',
            userEmail: 'test1@example.com',
            currentRole: 'reader',
            expectedRole: 'author',
            reason: 'Test inconsistency',
            registrationDate: '2023-01-01T00:00:00Z',
            severity: 'high' as const
          }
        ],
        totalUsers: 10,
        validUsers: 9,
        invalidUsers: 1,
        lastValidationDate: '2023-01-01T00:00:00Z'
      };

      vi.spyOn(RoleConsistencyService, 'validateRoleConsistency').mockResolvedValue(mockValidationResult);
      mockRoleAuditService.logEvent.mockResolvedValue(undefined);

      const report = await RoleConsistencyService.generateConsistencyReport();

      expect(report.summary).toMatchObject({
        totalUsers: 10,
        usersWithCorrectRoles: 9,
        usersWithIncorrectRoles: 1,
        consistencyPercentage: 90
      });

      expect(report.recommendations).toContain('Fix 1 high-severity role inconsistencies immediately');
      expect(report.inconsistencies).toHaveLength(1);
    });

    it('should generate report with no issues', async () => {
      const mockValidationResult = {
        isValid: true,
        inconsistencies: [],
        totalUsers: 10,
        validUsers: 10,
        invalidUsers: 0,
        lastValidationDate: '2023-01-01T00:00:00Z'
      };

      vi.spyOn(RoleConsistencyService, 'validateRoleConsistency').mockResolvedValue(mockValidationResult);
      mockRoleAuditService.logEvent.mockResolvedValue(undefined);

      const report = await RoleConsistencyService.generateConsistencyReport();

      expect(report.summary.consistencyPercentage).toBe(100);
      expect(report.recommendations).toContain('All user roles are consistent - no action needed');
    });
  });

  describe('getRoleStatistics', () => {
    it('should return role statistics', async () => {
      const mockRoleData = [
        { role: 'reader' },
        { role: 'reader' },
        { role: 'author' },
        { role: 'moderator' }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({
            data: mockRoleData,
            error: null
          })
        })
      });

      const stats = await RoleConsistencyService.getRoleStatistics();

      expect(stats).toMatchObject({
        total: 4,
        reader: 2,
        author: 1,
        moderator: 1
      });
    });
  });
});