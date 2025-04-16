
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { 
  getFlaggedComments,
  approveComment,
  rejectComment,
  flagComment
} from '@/services/commentService';
import { logger } from '@/utils/logger/logger';
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

describe('CommentService', () => {
  // Sample comment data for testing
  const mockComment = createMockComment();

  const mockCommentsList = [
    mockComment,
    createMockComment({
      id: 'comment-id-2',
      content: 'This is another test comment',
    })
  ];

  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockComment, error: null }),
    } as any);

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: createMockSession('user-123') }, 
      error: null 
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getFlaggedComments', () => {
    it('should return flagged comments', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: mockCommentsList, 
          error: null,
          count: 2
        })
      } as any);

      const result = await getFlaggedComments('flagged');
      
      expect(supabase.from).toHaveBeenCalledWith('comments');
      expect(result.comments).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should handle errors and log them', async () => {
      // Setup mock to simulate an error
      const mockError = new Error('Database error');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: mockError,
          count: 0
        })
      } as any);

      const result = await getFlaggedComments('flagged');
      
      // Should return empty array when there's an error
      expect(result.comments).toEqual([]);
      expect(result.error).toBeTruthy();
    });
  });

  describe('approveComment', () => {
    it('should approve a comment successfully', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ 
          error: null 
        })
      } as any);

      const result = await approveComment(mockComment.id);
      
      expect(supabase.from).toHaveBeenCalledWith('comments');
      expect(result.success).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('rejectComment', () => {
    it('should reject a comment successfully', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ 
          error: null 
        })
      } as any);

      const result = await rejectComment(mockComment.id);
      
      expect(supabase.from).toHaveBeenCalledWith('comments');
      expect(result.success).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('flagComment', () => {
    it('should flag a comment successfully', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ 
          error: null 
        })
      } as any);

      const result = await flagComment(mockComment.id, 'inappropriate content');
      
      expect(supabase.from).toHaveBeenCalledWith('flagged_content');
      expect(result.success).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });
});
