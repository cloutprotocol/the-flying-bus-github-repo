
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { 
  getArticleComments,
  addComment,
  updateCommentStatus
} from '@/services/commentService';
import { logger } from '@/utils/logger/logger';

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
  const mockComment = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    content: 'This is a test comment',
    article_id: 'article-123',
    user_id: 'user-123',
    parent_id: null,
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockCommentsList = [
    mockComment,
    {
      ...mockComment,
      id: '223e4567-e89b-12d3-a456-426614174001',
      content: 'This is another test comment',
    }
  ];

  // Mock auth session for authenticated requests
  const mockSession = {
    user: { id: 'user-123' }
  };

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
      is: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockComment, error: null }),
    } as any);

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getArticleComments', () => {
    it('should return comments for an article', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCommentsList, error: null })
      } as any);

      const result = await getArticleComments('article-123');
      
      expect(supabase.from).toHaveBeenCalledWith('comments');
      expect(result).toEqual(mockCommentsList);
    });

    it('should handle errors and log them', async () => {
      // Setup mock to simulate an error
      const mockError = new Error('Database error');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError })
      } as any);

      const result = await getArticleComments('article-123');
      
      // Should log the error
      expect(logger.error).toHaveBeenCalled();
      // Should return empty array when there's an error
      expect(result).toEqual([]);
    });
  });

  describe('addComment', () => {
    it('should add a comment successfully', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockComment, error: null })
      } as any);

      const commentData = {
        content: 'This is a test comment',
        article_id: 'article-123'
      };
      
      const result = await addComment(commentData);
      
      expect(supabase.from).toHaveBeenCalledWith('comments');
      expect(result).toEqual(mockComment);
    });
  });

  describe('updateCommentStatus', () => {
    it('should update a comment status successfully', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { ...mockComment, status: 'hidden' }, 
          error: null 
        })
      } as any);

      const result = await updateCommentStatus(mockComment.id, 'hidden');
      
      expect(supabase.from).toHaveBeenCalledWith('comments');
      expect(result).toEqual({ ...mockComment, status: 'hidden' });
    });
  });
});
