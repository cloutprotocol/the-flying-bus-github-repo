import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HomePageDataFetcher } from '../homePageDataFetcher';
import * as articlesData from '@/data/articles';
import { logger } from '@/utils/logger';

// Mock dependencies
vi.mock('@/data/articles');
vi.mock('@/utils/logger');

const mockArticlesData = vi.mocked(articlesData);
const mockLogger = vi.mocked(logger);

// Helper to create mock article
const createMockArticle = (id: string, title: string, category: string = 'Headliners') => ({
  id,
  title,
  excerpt: `${title} excerpt`,
  category,
  author: 'Test Author',
  date: '2024-01-01',
  readTime: '5 min',
  image: `/test-${id}.jpg`
});

describe('HomePageDataFetcher - Error Boundary Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Network Failure Scenarios', () => {
    it('should handle complete network failure', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('NetworkError: fetch failed')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('NetworkError: fetch failed')
      );

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toBeNull();
      expect(result.data.categoryArticles).toEqual({});
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('NetworkError: fetch failed');
      expect(result.hasPartialFailure).toBe(false); // Complete failure
    });

    it('should handle DNS resolution failures', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('ENOTFOUND: DNS lookup failed')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('ENOTFOUND: DNS lookup failed')
      );

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.errors[0]).toContain('ENOTFOUND: DNS lookup failed');
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle connection refused errors', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      );

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.errors[0]).toContain('ECONNREFUSED: Connection refused');
      expect(result.hasPartialFailure).toBe(false);
    });
  });

  describe('Partial Data Loading Scenarios', () => {
    it('should handle headline success with category failures', async () => {
      mockArticlesData.getHeadlineArticle.mockResolvedValue(
        createMockArticle('1', 'Featured Article')
      );
      
      mockArticlesData.getCategoryArticles.mockImplementation((category: string) => {
        if (category === 'Headliners') {
          return Promise.resolve([createMockArticle('2', 'Headline Article')]);
        }
        return Promise.reject(new Error(`${category} fetch failed`));
      });

      const categories = [
        { title: 'Headliners', slug: 'headliners', color: 'red' },
        { title: 'Debates', slug: 'debates', color: 'orange' },
        { title: 'Learning', slug: 'learning', color: 'purple' }
      ];

      const result = await HomePageDataFetcher.fetchHomePageData(undefined, categories);

      expect(result.data.headlineArticle).toEqual(
        expect.objectContaining({ title: 'Featured Article' })
      );
      expect(result.data.categoryArticles['Headliners']).toHaveLength(1);
      expect(result.data.categoryArticles['Debates']).toEqual([]);
      expect(result.data.categoryArticles['Learning']).toEqual([]);
      expect(result.errors).toHaveLength(2);
      expect(result.hasPartialFailure).toBe(true);
    });

    it('should handle headline failure with category success', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('Headline fetch failed')
      );
      
      mockArticlesData.getCategoryArticles.mockResolvedValue([
        createMockArticle('1', 'Category Article')
      ]);

      const categories = [
        { title: 'Headliners', slug: 'headliners', color: 'red' },
        { title: 'Debates', slug: 'debates', color: 'orange' }
      ];

      const result = await HomePageDataFetcher.fetchHomePageData(undefined, categories);

      expect(result.data.headlineArticle).toBeNull();
      expect(result.data.categoryArticles['Headliners']).toHaveLength(1);
      expect(result.data.categoryArticles['Debates']).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to load featured article');
      expect(result.hasPartialFailure).toBe(true);
    });

    it('should handle mixed category success and failure', async () => {
      mockArticlesData.getHeadlineArticle.mockResolvedValue(
        createMockArticle('1', 'Featured Article')
      );
      
      mockArticlesData.getCategoryArticles.mockImplementation((category: string) => {
        if (category === 'Headliners' || category === 'Learning') {
          return Promise.resolve([createMockArticle('2', `${category} Article`, category)]);
        }
        return Promise.reject(new Error(`${category} timeout`));
      });

      const categories = [
        { title: 'Headliners', slug: 'headliners', color: 'red' },
        { title: 'Debates', slug: 'debates', color: 'orange' },
        { title: 'Learning', slug: 'learning', color: 'purple' },
        { title: 'Neighborhood', slug: 'neighborhood', color: 'green' }
      ];

      const result = await HomePageDataFetcher.fetchHomePageData(undefined, categories);

      expect(result.data.headlineArticle).toBeTruthy();
      expect(result.data.categoryArticles['Headliners']).toHaveLength(1);
      expect(result.data.categoryArticles['Learning']).toHaveLength(1);
      expect(result.data.categoryArticles['Debates']).toEqual([]);
      expect(result.data.categoryArticles['Neighborhood']).toEqual([]);
      expect(result.errors).toHaveLength(2);
      expect(result.hasPartialFailure).toBe(true);
    });
  });

  describe('Database Connection Issues', () => {
    it('should handle database timeout errors', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('Query timeout after 30 seconds')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('Query timeout after 30 seconds')
      );

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.errors[0]).toContain('Query timeout after 30 seconds');
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle database connection pool exhaustion', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('Connection pool exhausted')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('Connection pool exhausted')
      );

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.errors[0]).toContain('Connection pool exhausted');
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle database authentication failures', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('Authentication failed: invalid credentials')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('Authentication failed: invalid credentials')
      );

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.errors[0]).toContain('Authentication failed: invalid credentials');
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle database constraint violations', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('Database constraint violation: foreign key error')
      );
      mockArticlesData.getCategoryArticles.mockResolvedValue([
        createMockArticle('1', 'Valid Article')
      ]);

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toBeNull();
      expect(result.data.categoryArticles).toBeTruthy();
      expect(result.errors[0]).toContain('Failed to load featured article');
      expect(result.hasPartialFailure).toBe(true);
    });
  });

  describe('Timeout and Abort Scenarios', () => {
    it('should handle timeout during headline fetch', async () => {
      mockArticlesData.getHeadlineArticle.mockImplementation(() =>
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Headline fetch timeout after 5 seconds')), 6000)
        )
      );
      mockArticlesData.getCategoryArticles.mockResolvedValue([]);

      const promise = HomePageDataFetcher.fetchHomePageData();
      
      // Fast-forward past timeout
      vi.advanceTimersByTime(6000);
      
      const result = await promise;

      expect(result.errors[0]).toContain('Failed to load featured article');
      expect(result.hasPartialFailure).toBe(true);
    });

    it('should handle timeout during category fetch', async () => {
      mockArticlesData.getHeadlineArticle.mockResolvedValue(
        createMockArticle('1', 'Featured Article')
      );
      
      mockArticlesData.getCategoryArticles.mockImplementation((category: string) => {
        if (category === 'Headliners') {
          return new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${category} fetch timeout after 5 seconds`)), 6000)
          );
        }
        return Promise.resolve([createMockArticle('2', `${category} Article`, category)]);
      });

      const categories = [
        { title: 'Headliners', slug: 'headliners', color: 'red' },
        { title: 'Debates', slug: 'debates', color: 'orange' }
      ];

      const promise = HomePageDataFetcher.fetchHomePageData(undefined, categories);
      
      // Fast-forward past timeout
      vi.advanceTimersByTime(6000);
      
      const result = await promise;

      expect(result.data.headlineArticle).toBeTruthy();
      expect(result.data.categoryArticles['Headliners']).toEqual([]);
      expect(result.data.categoryArticles['Debates']).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.hasPartialFailure).toBe(true);
    });

    it('should handle abort signal during fetch', async () => {
      const abortController = new AbortController();
      
      mockArticlesData.getHeadlineArticle.mockImplementation(() =>
        new Promise((_, reject) => {
          const timeout = setTimeout(() => reject(new Error('Should not reach here')), 1000);
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Request was aborted'));
          });
        })
      );
      
      mockArticlesData.getCategoryArticles.mockImplementation(() =>
        new Promise((_, reject) => {
          const timeout = setTimeout(() => reject(new Error('Should not reach here')), 1000);
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Request was aborted'));
          });
        })
      );

      const promise = HomePageDataFetcher.fetchHomePageData(abortController.signal);
      
      // Abort the request
      abortController.abort();
      
      await expect(promise).rejects.toThrow('Request was aborted');
    });

    it('should handle pre-aborted signal', async () => {
      const abortController = new AbortController();
      abortController.abort(); // Abort before calling

      await expect(
        HomePageDataFetcher.fetchHomePageData(abortController.signal)
      ).rejects.toThrow('Request was aborted before starting');
    });

    it('should handle abort during fetch execution', async () => {
      const abortController = new AbortController();
      
      mockArticlesData.getHeadlineArticle.mockImplementation(() =>
        new Promise((resolve) => 
          setTimeout(() => resolve(createMockArticle('1', 'Test')), 500)
        )
      );
      
      mockArticlesData.getCategoryArticles.mockImplementation(() =>
        new Promise((resolve) => 
          setTimeout(() => resolve([]), 500)
        )
      );

      const promise = HomePageDataFetcher.fetchHomePageData(abortController.signal);
      
      // Abort after 100ms
      setTimeout(() => abortController.abort(), 100);
      vi.advanceTimersByTime(100);
      
      await expect(promise).rejects.toThrow('Request was aborted during fetch');
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log successful fetch with metrics', async () => {
      mockArticlesData.getHeadlineArticle.mockResolvedValue(
        createMockArticle('1', 'Featured Article')
      );
      mockArticlesData.getCategoryArticles.mockResolvedValue([
        createMockArticle('2', 'Category Article')
      ]);

      await HomePageDataFetcher.fetchHomePageData();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        'Home page data fetch completed',
        expect.objectContaining({
          totalArticles: expect.any(Number),
          hasHeadline: true,
          categoriesLoaded: expect.any(Number),
          errorsCount: 0,
          hasPartialFailure: false
        })
      );
    });

    it('should log partial failures with details', async () => {
      mockArticlesData.getHeadlineArticle.mockResolvedValue(
        createMockArticle('1', 'Featured Article')
      );
      mockArticlesData.getCategoryArticles.mockImplementation((category: string) => {
        if (category === 'Headliners') {
          return Promise.resolve([createMockArticle('2', 'Success')]);
        }
        return Promise.reject(new Error(`${category} failed`));
      });

      const categories = [
        { title: 'Headliners', slug: 'headliners', color: 'red' },
        { title: 'Debates', slug: 'debates', color: 'orange' }
      ];

      await HomePageDataFetcher.fetchHomePageData(undefined, categories);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(String),
        'Category Debates fetch failed',
        expect.objectContaining({
          error: expect.any(Error),
          category: 'Debates'
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        'Home page data fetch completed',
        expect.objectContaining({
          hasPartialFailure: true,
          errorsCount: 1
        })
      );
    });

    it('should log complete failures', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('Complete system failure')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('Complete system failure')
      );

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        'Home page data fetch failed completely',
        expect.objectContaining({
          error: expect.any(Error)
        })
      );

      expect(result.hasPartialFailure).toBe(false);
    });

    it('should log performance metrics', async () => {
      mockArticlesData.getHeadlineArticle.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve(createMockArticle('1', 'Test')), 100)
        )
      );
      mockArticlesData.getCategoryArticles.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve([]), 50)
        )
      );

      const promise = HomePageDataFetcher.fetchHomePageData();
      vi.advanceTimersByTime(200);
      await promise;

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        'Home page data fetch completed',
        expect.objectContaining({
          totalDuration: expect.any(Number)
        })
      );
    });
  });

  describe('Edge Cases and Resilience', () => {
    it('should handle empty category list', async () => {
      mockArticlesData.getHeadlineArticle.mockResolvedValue(
        createMockArticle('1', 'Featured Article')
      );

      const result = await HomePageDataFetcher.fetchHomePageData(undefined, []);

      expect(result.data.headlineArticle).toBeTruthy();
      expect(result.data.categoryArticles).toEqual({});
      expect(result.errors).toHaveLength(0);
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle null/undefined responses gracefully', async () => {
      mockArticlesData.getHeadlineArticle.mockResolvedValue(null);
      mockArticlesData.getCategoryArticles.mockResolvedValue([]);

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toBeNull();
      expect(result.data.categoryArticles).toBeTruthy();
      expect(result.errors).toHaveLength(0);
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle malformed error objects', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue('String error');
      mockArticlesData.getCategoryArticles.mockRejectedValue({ message: 'Object error' });

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('String error');
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle concurrent fetch requests', async () => {
      mockArticlesData.getHeadlineArticle.mockResolvedValue(
        createMockArticle('1', 'Featured Article')
      );
      mockArticlesData.getCategoryArticles.mockResolvedValue([
        createMockArticle('2', 'Category Article')
      ]);

      // Start multiple concurrent requests
      const promises = [
        HomePageDataFetcher.fetchHomePageData(),
        HomePageDataFetcher.fetchHomePageData(),
        HomePageDataFetcher.fetchHomePageData()
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.data.headlineArticle).toBeTruthy();
        expect(result.errors).toHaveLength(0);
        expect(result.hasPartialFailure).toBe(false);
      });
    });
  });
});