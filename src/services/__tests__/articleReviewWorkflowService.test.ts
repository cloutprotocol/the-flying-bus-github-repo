/**
 * Article Review Workflow Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    },
    from: vi.fn()
  }
}));

// Mock logger
vi.mock('@/utils/logger/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

import { 
  getArticlesPendingReview,
  approveArticle,
  rejectArticle,
  getArticleReviewHistory,
  publishArticle
} from '../articleReviewWorkflowService';
import { supabase } from '@/integrations/supabase/client';

describe('Article Review Workflow Service', () => {
  const mockUserId = 'user-123';
  const mockArticleId = 'article-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getArticlesPendingReview', () => {
    it('should return pending articles for admin users', async () => {
      // Mock session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null
      });

      // Mock profile query
      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null
        })
      };

      // Mock articles query
      const mockArticlesQuery = {
        range: vi.fn().mockResolvedValue({
          data: [
            {
              id: mockArticleId,
              title: 'Test Article',
              content: 'Test content',
              status: 'pending_review',
              created_at: '2024-01-01',
              updated_at: '2024-01-01',
              submitted_for_review_at: '2024-01-01',
              author_id: 'author-123',
              profiles: {
                id: 'author-123',
                display_name: 'Test Author',
                avatar_url: null
              }
            }
          ],
          error: null,
          count: 1
        })
      };

      (supabase.from as any)
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => mockProfileQuery)
          }))
        })
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => mockArticlesQuery)
            }))
          }))
        });

      const result = await getArticlesPendingReview();

      expect(result.articles).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should deny access to non-admin users', async () => {
      // Mock session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null
      });

      // Mock profile query - author role
      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: { role: 'author' },
          error: null
        })
      };

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => mockProfileQuery)
        }))
      });

      const result = await getArticlesPendingReview();

      expect(result.articles).toHaveLength(0);
      expect(result.count).toBe(0);
      expect(result.error).toBe('Insufficient permissions to review articles');
    });
  });

  describe('approveArticle', () => {
    it('should approve article for admin users', async () => {
      // Mock session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null
      });

      // Mock profile query
      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null
        })
      };

      // Mock article update
      const mockUpdateQuery = {
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      };

      // Mock review insert
      const mockInsertQuery = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'review-123',
              article_id: mockArticleId,
              reviewer_id: mockUserId,
              status: 'approved',
              feedback: 'Good article',
              created_at: '2024-01-01',
              profiles: {
                id: mockUserId,
                display_name: 'Admin User',
                avatar_url: null
              }
            },
            error: null
          })
        }))
      };

      (supabase.from as any)
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => mockProfileQuery)
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => mockUpdateQuery)
        })
        .mockReturnValueOnce({
          insert: vi.fn(() => mockInsertQuery)
        });

      const result = await approveArticle(mockArticleId, 'Good article');

      expect(result.success).toBe(true);
      expect(result.review).toBeDefined();
      expect(result.review?.status).toBe('approved');
    });

    it('should deny access to non-admin users', async () => {
      // Mock session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null
      });

      // Mock profile query - author role
      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: { role: 'author' },
          error: null
        })
      };

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => mockProfileQuery)
        }))
      });

      const result = await approveArticle(mockArticleId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to approve articles');
    });
  });

  describe('rejectArticle', () => {
    it('should reject article with feedback', async () => {
      // Mock session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null
      });

      // Mock profile query
      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null
        })
      };

      // Mock article update
      const mockUpdateQuery = {
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      };

      // Mock review insert
      const mockInsertQuery = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'review-123',
              article_id: mockArticleId,
              reviewer_id: mockUserId,
              status: 'rejected',
              feedback: 'Needs improvement',
              created_at: '2024-01-01',
              profiles: {
                id: mockUserId,
                display_name: 'Admin User',
                avatar_url: null
              }
            },
            error: null
          })
        }))
      };

      (supabase.from as any)
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => mockProfileQuery)
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => mockUpdateQuery)
        })
        .mockReturnValueOnce({
          insert: vi.fn(() => mockInsertQuery)
        });

      const result = await rejectArticle(mockArticleId, 'Needs improvement');

      expect(result.success).toBe(true);
      expect(result.review).toBeDefined();
      expect(result.review?.status).toBe('rejected');
      expect(result.review?.feedback).toBe('Needs improvement');
    });
  });

  describe('getArticleReviewHistory', () => {
    it('should return review history for an article', async () => {
      const mockHistoryQuery = {
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'review-123',
              article_id: mockArticleId,
              reviewer_id: mockUserId,
              status: 'approved',
              feedback: 'Good article',
              created_at: '2024-01-01',
              profiles: {
                id: mockUserId,
                display_name: 'Admin User',
                avatar_url: null
              }
            }
          ],
          error: null
        })
      };

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => mockHistoryQuery)
        }))
      });

      const result = await getArticleReviewHistory(mockArticleId);

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].status).toBe('approved');
      expect(result.error).toBeUndefined();
    });
  });

  describe('publishArticle', () => {
    it('should publish approved article for admin users', async () => {
      // Mock session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null
      });

      // Mock profile query
      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
          error: null
        })
      };

      // Mock article update
      const mockUpdateQuery = {
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      };

      (supabase.from as any)
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => mockProfileQuery)
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => mockUpdateQuery)
        });

      const result = await publishArticle(mockArticleId);

      expect(result.success).toBe(true);
    });

    it('should deny access to non-admin users', async () => {
      // Mock session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: { id: mockUserId } } },
        error: null
      });

      // Mock profile query - author role
      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: { role: 'author' },
          error: null
        })
      };

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => mockProfileQuery)
        }))
      });

      const result = await publishArticle(mockArticleId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to publish articles');
    });
  });
});