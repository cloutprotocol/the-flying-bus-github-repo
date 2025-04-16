
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { 
  getArticleById, 
  getArticlesByCategory,
  getRecentArticles,
  updateArticle
} from '@/services/articleService';
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

describe('ArticleService', () => {
  // Sample article data for testing
  const mockArticle = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Article',
    content: 'Test content',
    slug: 'test-article',
    published_at: new Date().toISOString(),
    status: 'published',
    category_id: '123e4567-e89b-12d3-a456-426614174999',
    author_id: '123e4567-e89b-12d3-a456-426614174111',
    excerpt: 'Test excerpt',
    featured: false,
    article_type: 'standard',
    cover_image: 'test-image.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockArticlesList = [
    mockArticle,
    {
      ...mockArticle,
      id: '223e4567-e89b-12d3-a456-426614174000',
      title: 'Test Article 2',
      slug: 'test-article-2'
    }
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
      
      // Check if the correct functions were called
      expect(supabase.from).toHaveBeenCalledWith('articles');
      expect(result).toEqual(mockArticle);
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
      expect(result).toBeNull();
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
      expect(result).toBeNull();
    });
  });

  describe('getArticlesByCategory', () => {
    it('should return articles for a given category', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockArticlesList, error: null })
      } as any);

      const result = await getArticlesByCategory('category-slug', 1, 10);
      
      expect(supabase.from).toHaveBeenCalledWith('articles');
      expect(result).toEqual(mockArticlesList);
    });
  });

  describe('updateArticle', () => {
    it('should update an article successfully', async () => {
      // Setup specific mock for this test
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { ...mockArticle, title: 'Updated Title' }, 
          error: null 
        })
      } as any);

      const updatedData = { title: 'Updated Title' };
      const result = await updateArticle(mockArticle.id, updatedData);
      
      expect(supabase.from).toHaveBeenCalledWith('articles');
      expect(result).toEqual({ ...mockArticle, title: 'Updated Title' });
    });
  });
});
