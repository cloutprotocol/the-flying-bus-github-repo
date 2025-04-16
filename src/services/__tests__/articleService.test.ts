
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { 
  getArticleById, 
  updateArticle,
  createArticle,
  getArticlesByStatus,
  updateArticleStatus
} from '@/services/articleService';
import { logger } from '@/utils/logger/logger';
import { createMockArticle } from '@/test/helpers/testData';

// Mock the logger to prevent console spam
vi.mock('@/utils/logger/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('ArticleService', () => {
  // Sample article data for testing
  const mockArticle = createMockArticle();
  const mockArticlesList = [
    mockArticle,
    createMockArticle({
      id: 'article-id-2',
      title: 'Test Article 2',
      slug: 'test-article-2'
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
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockArticle, error: null }),
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getArticleById', () => {
    it('should return an article when found', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockArticle, error: null })
      } as any);

      const result = await getArticleById(mockArticle.id);
      
      // We're getting an object with article and error properties
      expect(supabase.from).toHaveBeenCalledWith('articles');
      expect(result.article).toEqual(mockArticle);
      expect(result.error).toBeNull();
    });

    it('should return null when article is not found', async () => {
      // Setup mock for article not found
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      } as any);

      const result = await getArticleById('non-existent-id');
      
      // Should return null when article not found
      expect(result.article).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it('should handle errors and log them', async () => {
      // Setup mock to simulate an error
      const mockError = new Error('Database error');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError })
      } as any);

      const result = await getArticleById(mockArticle.id);
      
      // Should log the error
      expect(logger.error).toHaveBeenCalled();
      // Should return null when there's an error
      expect(result.article).toBeNull();
      expect(result.error).not.toBeNull();
    });
  });

  describe('getArticlesByStatus', () => {
    it('should return articles for a given status', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockArticlesList, error: null, count: 2 })
      } as any);

      const result = await getArticlesByStatus('published', undefined, 1, 10);
      
      expect(supabase.from).toHaveBeenCalledWith('articles');
      expect(result.articles).toEqual(expect.any(Array));
      expect(result.count).toEqual(2);
    });
  });

  describe('updateArticle', () => {
    it('should update an article successfully', async () => {
      // Setup specific mock for this test
      const updatedArticle = { ...mockArticle, title: 'Updated Title' };
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: updatedArticle, 
          error: null 
        })
      } as any);

      const updatedData = { title: 'Updated Title' };
      const result = await updateArticle(mockArticle.id, updatedData);
      
      expect(supabase.from).toHaveBeenCalledWith('articles');
      expect(result.data).toEqual(updatedArticle);
      expect(result.error).toBeNull();
    });
  });

  describe('createArticle', () => {
    it('should create a new article successfully', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: mockArticle, 
          error: null 
        })
      } as any);

      const newArticleData = {
        title: 'New Test Article',
        content: 'This is a test article',
        excerpt: 'Test excerpt',
        categoryId: 'category-1'
      };
      
      const result = await createArticle(newArticleData);
      
      expect(supabase.from).toHaveBeenCalledWith('articles');
      expect(result.data).toEqual(mockArticle);
      expect(result.error).toBeNull();
    });
  });

  describe('updateArticleStatus', () => {
    it('should update an article status successfully', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ 
          error: null 
        })
      } as any);

      const result = await updateArticleStatus(mockArticle.id, 'published');
      
      expect(supabase.from).toHaveBeenCalledWith('articles');
      expect(result.success).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });
});
