
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  getFlaggedComments,
  approveComment,
  rejectComment,
  flagComment
} from '@/services/commentService';
import { commentConvexService } from '@/services/convex/commentConvexService';
import { createMockComment, createMockSession } from '@/test/helpers/testData';

// Mock the logger to prevent console spam
vi.mock('@/utils/logger/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock Convex service
vi.mock('@/services/convex/commentConvexService', () => ({
  commentConvexService: {
    getFlagged: vi.fn(),
    updateStatus: vi.fn(),
  }
}));

describe('CommentService', () => {
  // Sample comment data for testing
  // We need to match Convex structure (_id instead of id) - though our transformer handles it.
  // The service expects specific return from Convex service.
  const mockComment = {
    ...createMockComment(),
    _id: 'comment-id-1',
    profile: {
      display_name: 'Test User',
      avatar_url: 'http://example.com/avatar.jpg'
    }
  };

  const mockCommentsList = [
    mockComment,
    {
      ...createMockComment({
        id: 'comment-id-2',
        content: 'This is another test comment',
      }),
      _id: 'comment-id-2',
      profile: {
        display_name: 'Test User 2',
        avatar_url: 'http://example.com/avatar2.jpg'
      }
    }
  ];

  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Supabase auth mock (still used)
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: createMockSession('user-123') as any },
      error: null
    });

    // Setup default Convex mock responses
    vi.mocked(commentConvexService.getFlagged).mockResolvedValue({
      comments: mockCommentsList as any,
      count: 2,
      error: null
    });

    vi.mocked(commentConvexService.updateStatus).mockResolvedValue({
      success: true,
      error: null
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getFlaggedComments', () => {
    it('should return flagged comments', async () => {
      const result = await getFlaggedComments('flagged');

      expect(commentConvexService.getFlagged).toHaveBeenCalledWith('flagged', '', 1, 10);
      expect(result.comments).toHaveLength(2);
      expect(result.count).toBe(2);
      // Verify transformation
      expect(result.comments[0].id).toBe('comment-id-1');
      expect(result.comments[0].author.name).toBe('Test User');
    });

    it('should handle errors and log them', async () => {
      // Setup mock to simulate an error
      const mockError = new Error('Database error');
      vi.mocked(commentConvexService.getFlagged).mockResolvedValue({
        comments: [],
        count: 0,
        error: mockError
      });

      const result = await getFlaggedComments('flagged');

      // Should return empty array when there's an error
      expect(result.comments).toEqual([]);
      expect(result.error).toBeTruthy();
    });
  });

  describe('approveComment', () => {
    it('should approve a comment successfully', async () => {
      const result = await approveComment('comment-id-1');

      expect(commentConvexService.updateStatus).toHaveBeenCalledWith('comment-id-1', 'published');
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(result.success).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('rejectComment', () => {
    it('should reject a comment successfully', async () => {
      const result = await rejectComment('comment-id-1');

      expect(commentConvexService.updateStatus).toHaveBeenCalledWith('comment-id-1', 'rejected');
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(result.success).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('flagComment', () => {
    it('should flag a comment successfully', async () => {
      const result = await flagComment('comment-id-1', 'inappropriate content');

      // We expect updateStatus to be called with 'flagged'
      // Note: flag content details are skipped in MVP migration unless we update Convex service to handle it
      expect(commentConvexService.updateStatus).toHaveBeenCalledWith('comment-id-1', 'flagged');

      expect(result.success).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });
});
