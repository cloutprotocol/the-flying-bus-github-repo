import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HomePageDataFetcher } from '../homePageDataFetcher';
import * as articlesModule from '@/data/articles';

// Mock the articles module
vi.mock('@/data/articles', () => ({
  getHeadlineArticle: vi.fn(),
  getCategoryArticles: vi.fn()
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  LogSource: {
    ARTICLE: 'ARTICLE'
  }
}));

describe('HomePageDataFetcher', () => {
  const mockHeadlineArticle = {
    id: '1',
    title: 'Test Headline',
    excerpt: 'Test excerpt',
    imageUrl: 'test.jpg',
    category: 'Headliners',
    readingLevel: 'Intermediate',
    readTime: 5,
    author: 'Test Author',
    date: '2025-01-01',
    publishDate: '2025-01-01'
  };

  const mockCategoryArticles = [
    {
      id: '2',
      title: 'Test Category Article',
      excerpt: 'Test category excerpt',
      imageUrl: 'test2.jpg',
      category: 'Debates',
      readingLevel: 'Beginner',
      readTime: 3,
      author: 'Test Author 2',
      date: '2025-01-02',
      publishDate: '2025-01-02'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchHomePageData', () => {
    it('should fetch all data successfully', async () => {
      // Mock successful responses
      vi.mocked(articlesModule.getHeadlineArticle).mockResolvedValue(mockHeadlineArticle);
      vi.mocked(articlesModule.getCategoryArticles).mockResolvedValue(mockCategoryArticles);

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toEqual(mockHeadlineArticle);
      expect(result.errors).toHaveLength(0);
      expect(result.hasPartialFailure).toBe(false);
      
      // Should have articles for all default categories
      const categories = HomePageDataFetcher.getDefaultCategories();
      expect(Object.keys(result.data.categoryArticles)).toHaveLength(categories.length);
    });

    it('should handle headline failure gracefully', async () => {
      // Mock headline failure, category success
      vi.mocked(articlesModule.getHeadlineArticle).mockRejectedValue(new Error('Headline failed'));
      vi.mocked(articlesModule.getCategoryArticles).mockResolvedValue(mockCategoryArticles);

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toBeNull();
      expect(result.errors).toContain('Failed to load featured article: Error: Headline failed');
      expect(result.hasPartialFailure).toBe(true);
      
      // Categories should still be loaded
      expect(Object.keys(result.data.categoryArticles)).toHaveLength(7);
    });

    it('should handle category failures gracefully', async () => {
      // Mock headline success, some category failures
      vi.mocked(articlesModule.getHeadlineArticle).mockResolvedValue(mockHeadlineArticle);
      vi.mocked(articlesModule.getCategoryArticles)
        .mockResolvedValueOnce(mockCategoryArticles) // First category succeeds
        .mockRejectedValueOnce(new Error('Category failed')) // Second category fails
        .mockResolvedValue([]); // Rest return empty arrays

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toEqual(mockHeadlineArticle);
      expect(result.hasPartialFailure).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Should still have category structure
      expect(Object.keys(result.data.categoryArticles)).toHaveLength(7);
    });

    it('should handle abort signal', async () => {
      const abortController = new AbortController();
      
      // Abort immediately
      abortController.abort();

      await expect(
        HomePageDataFetcher.fetchHomePageData(abortController.signal)
      ).rejects.toThrow('Request was aborted before starting');
    });

    it('should handle timeout for individual fetches', async () => {
      // Mock a slow headline fetch that will timeout
      vi.mocked(articlesModule.getHeadlineArticle).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockHeadlineArticle), 6000))
      );
      vi.mocked(articlesModule.getCategoryArticles).mockResolvedValue([]);

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toBeNull();
      expect(result.hasPartialFailure).toBe(true);
      expect(result.errors.some(error => error.includes('timeout'))).toBe(true);
    }, 10000); // Increase test timeout to 10 seconds

    it('should work with custom categories', async () => {
      const customCategories = [
        { title: 'Custom1', slug: 'custom1', color: 'blue' },
        { title: 'Custom2', slug: 'custom2', color: 'red' }
      ];

      vi.mocked(articlesModule.getHeadlineArticle).mockResolvedValue(mockHeadlineArticle);
      vi.mocked(articlesModule.getCategoryArticles).mockResolvedValue(mockCategoryArticles);

      const result = await HomePageDataFetcher.fetchHomePageData(undefined, customCategories);

      expect(Object.keys(result.data.categoryArticles)).toHaveLength(2);
      expect(result.data.categoryArticles).toHaveProperty('Custom1');
      expect(result.data.categoryArticles).toHaveProperty('Custom2');
    });

    it('should handle complete failure', async () => {
      // Mock all fetches to fail
      vi.mocked(articlesModule.getHeadlineArticle).mockRejectedValue(new Error('Complete failure'));
      vi.mocked(articlesModule.getCategoryArticles).mockRejectedValue(new Error('Complete failure'));

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toBeNull();
      expect(result.hasPartialFailure).toBe(true); // Partial because some categories might succeed
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getDefaultCategories', () => {
    it('should return default categories', () => {
      const categories = HomePageDataFetcher.getDefaultCategories();
      
      expect(categories).toHaveLength(7);
      expect(categories[0]).toEqual({ title: 'Headliners', slug: 'headliners', color: 'red' });
      expect(categories[1]).toEqual({ title: 'Debates', slug: 'debates', color: 'orange' });
    });

    it('should return a copy of categories (not reference)', () => {
      const categories1 = HomePageDataFetcher.getDefaultCategories();
      const categories2 = HomePageDataFetcher.getDefaultCategories();
      
      expect(categories1).not.toBe(categories2);
      expect(categories1).toEqual(categories2);
    });
  });
});