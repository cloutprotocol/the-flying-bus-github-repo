/**
 * Tests for Role Audit Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleAuditService } from '../roleAuditService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
const mockSupabaseData = [
  { id: '1', action: 'role_change', created_at: '2023-01-01T00:00:00Z' }
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => {
      const mockQuery = {
        insert: vi.fn(() => ({ error: null })),
        select: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        gte: vi.fn(() => mockQuery),
        lte: vi.fn(() => mockQuery),
        limit: vi.fn(() => mockQuery),
        range: vi.fn(() => ({ data: mockSupabaseData, error: null }))
      };
      return mockQuery;
    })
  }
}));

describe('RoleAuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logRoleChange', () => {
    it('should log role change successfully', async () => {
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      (supabase.from as any) = mockFrom;

      const auditLog = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        oldRole: 'reader',
        newRole: 'author',
        reason: 'Invitation registration',
        context: { invitationId: 'inv-123' }
      };

      await RoleAuditService.logRoleChange(auditLog);

      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'role_change',
          resource_type: 'profile',
          resource_id: 'user-123',
          user_email: 'test@example.com',
          user_id: 'user-123',
          success: true,
          metadata: expect.objectContaining({
            old_role: 'reader',
            new_role: 'author',
            reason: 'Invitation registration',
            invitationId: 'inv-123'
          })
        })
      );
    });

    it('should handle role change logging errors', async () => {
      const mockInsert = vi.fn(() => ({ error: { message: 'Database error' } }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      (supabase.from as any) = mockFrom;

      const auditLog = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        oldRole: 'reader',
        newRole: 'author',
        reason: 'Test'
      };

      await expect(RoleAuditService.logRoleChange(auditLog))
        .rejects.toThrow('Audit logging failed: Database error');
    });
  });

  describe('logArticleOwnership', () => {
    it('should log article ownership change successfully', async () => {
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      (supabase.from as any) = mockFrom;

      const auditLog = {
        articleId: 'article-123',
        authorId: 'author-123',
        action: 'created' as const,
        reason: 'New article creation'
      };

      await RoleAuditService.logArticleOwnership(auditLog);

      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'article_ownership_created',
          resource_type: 'article',
          resource_id: 'article-123',
          user_id: 'author-123',
          success: true,
          metadata: expect.objectContaining({
            article_id: 'article-123',
            author_id: 'author-123',
            reason: 'New article creation'
          })
        })
      );
    });
  });

  describe('logArticleReview', () => {
    it('should log article review action successfully', async () => {
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      (supabase.from as any) = mockFrom;

      const auditLog = {
        articleId: 'article-123',
        reviewerId: 'reviewer-123',
        authorId: 'author-123',
        action: 'approved' as const,
        previousStatus: 'pending_review',
        newStatus: 'approved',
        feedback: 'Looks good!'
      };

      await RoleAuditService.logArticleReview(auditLog);

      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'article_review_approved',
          resource_type: 'article_review',
          resource_id: 'article-123',
          user_id: 'reviewer-123',
          success: true,
          metadata: expect.objectContaining({
            article_id: 'article-123',
            reviewer_id: 'reviewer-123',
            author_id: 'author-123',
            previous_status: 'pending_review',
            new_status: 'approved',
            feedback: 'Looks good!'
          })
        })
      );
    });
  });

  describe('queryAuditLogs', () => {
    it('should query audit logs with filters', async () => {
      const mockData = [
        { id: '1', action: 'role_change', created_at: '2023-01-01T00:00:00Z' }
      ];
      
      // Mock the entire query chain
      const mockFrom = vi.fn(() => {
        const mockQuery = {
          select: vi.fn(() => mockQuery),
          order: vi.fn(() => mockQuery),
          eq: vi.fn(() => mockQuery),
          gte: vi.fn(() => mockQuery),
          lte: vi.fn(() => mockQuery),
          limit: vi.fn(() => mockQuery),
          range: vi.fn(() => ({ data: mockData, error: null }))
        };
        return mockQuery;
      });
      (supabase.from as any) = mockFrom;

      const query = {
        userId: 'user-123',
        action: 'role_change',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        limit: 10,
        offset: 0
      };

      const result = await RoleAuditService.queryAuditLogs(query);

      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
      expect(result).toEqual(mockSupabaseData);
    });
  });

  describe('getUserRoleHistory', () => {
    it('should get role history for a user', async () => {
      const mockData = [
        { id: '1', action: 'role_change', user_id: 'user-123' }
      ];
      
      // Mock the entire query chain
      const mockFrom = vi.fn(() => {
        const mockQuery = {
          select: vi.fn(() => mockQuery),
          order: vi.fn(() => mockQuery),
          eq: vi.fn(() => mockQuery),
          gte: vi.fn(() => mockQuery),
          lte: vi.fn(() => mockQuery),
          limit: vi.fn(() => mockQuery),
          range: vi.fn(() => ({ data: mockData, error: null }))
        };
        return mockQuery;
      });
      (supabase.from as any) = mockFrom;

      const result = await RoleAuditService.getUserRoleHistory('user-123');

      expect(result).toEqual(mockSupabaseData);
    });
  });

  describe('getAuditStatistics', () => {
    it('should calculate audit statistics correctly', async () => {
      const mockLogs = [
        { action: 'role_change', success: true, user_id: 'user-1', created_at: '2023-01-01T00:00:00Z' },
        { action: 'article_ownership_created', success: true, user_id: 'user-2', created_at: '2023-01-01T00:00:00Z' },
        { action: 'article_review_approved', success: false, user_id: 'user-1', created_at: '2023-01-02T00:00:00Z' }
      ];

      // Mock the query to return our test data
      vi.spyOn(RoleAuditService, 'queryAuditLogs').mockResolvedValue(mockLogs);

      const stats = await RoleAuditService.getAuditStatistics(30);

      expect(stats).toEqual({
        totalEvents: 3,
        roleChanges: 1,
        articleOwnershipChanges: 1,
        articleReviews: 1,
        successfulEvents: 2,
        failedEvents: 1,
        uniqueUsers: 2,
        eventsByDay: {
          '2023-01-01': 2,
          '2023-01-02': 1
        }
      });
    });
  });

  describe('logEvent', () => {
    it('should log generic audit event successfully', async () => {
      const mockInsert = vi.fn(() => ({ error: null }));
      const mockFrom = vi.fn(() => ({ insert: mockInsert }));
      (supabase.from as any) = mockFrom;

      await RoleAuditService.logEvent(
        'test_action',
        'test_resource',
        'resource-123',
        true,
        { test: 'data' },
        'user-123',
        'test@example.com'
      );

      expect(mockFrom).toHaveBeenCalledWith('audit_logs');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'test_action',
          resource_type: 'test_resource',
          resource_id: 'resource-123',
          user_id: 'user-123',
          user_email: 'test@example.com',
          success: true,
          metadata: { test: 'data' }
        })
      );
    });
  });
});