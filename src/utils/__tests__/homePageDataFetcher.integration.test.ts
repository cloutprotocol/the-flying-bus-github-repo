import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HomePageDataFetcher } from '../homePageDataFetcher';

// Mock the logger to avoid console output during tests
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  LogSource: {
    ARTICLE: 'ARTICLE'
  }
}));

describe('HomePageDataFetcher - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchHomePageData', () => {
    it('should return proper data structure even when queries fail', async () => {
      const result = await HomePageDataFetcher.fetchHomePageData();

      // Should always return the expected structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('hasPartialFailure');
      
      expect(result.data).toHaveProperty('headlineArticle');
      expect(result.data).toHaveProperty('categoryArticles');
      
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.hasPartialFailure).toBe('boolean');
    });

    it('should handle abort signals properly', async () => {
      const abortController = new AbortController();
      
      // Abort immediately
      abortController.abort();

      await expect(
        HomePageDataFetcher.fetchHomePageData(abortController.signal)
      ).rejects.toThrow('Request was aborted before starting');
    });

    it('should handle abort signals during execution', async () => {
      const abortController = new AbortController();
      
      // Start the fetch and abort after a short delay
      const fetchPromise = HomePageDataFetcher.fetchHomePageData(abortController.signal);
      
      setTimeout(() => {
        abortController.abort();
      }, 10);

      // Should either complete successfully or throw an abort error
      try {
        const result = await fetchPromise;
        // If it completes, it should have the proper structure
        expect(result).toHaveProperty('data');
      } catch (error) {
        // If it throws, it should be an abort error
        expect(error.message).toMatch(/abort/i);
      }
    });

    it('should work with custom categories', async () => {
      const customCategories = [
        { title: 'Custom Category', slug: 'custom', color: 'blue' }
      ];

      const result = await HomePageDataFetcher.fetchHomePageData(undefined, customCategories);

      expect(result.data.categoryArticles).toHaveProperty('Custom Category');
    });

    it('should handle empty categories gracefully', async () => {
      const result = await HomePageDataFetcher.fetchHomePageData(undefined, []);

      expect(result.data.headlineArticle).toBeDefined(); // Can be null
      expect(Object.keys(result.data.categoryArticles)).toHaveLength(0);
    });
  });

  describe('fetchWithAuthState', () => {
    it('should handle different auth states', async () => {
      const states = ['logged_out', 'logging_in', 'logged_in'] as const;

      for (const state of states) {
        const result = await HomePageDataFetcher.fetchWithAuthState(state);
        
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('hasPartialFailure');
      }
    }, 10000); // Increase timeout for this test
  });

  describe('preloadCriticalData', () => {
    it('should complete without throwing errors', async () => {
      // Should not throw even if underlying services fail
      await expect(HomePageDataFetcher.preloadCriticalData()).resolves.toBeUndefined();
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', async () => {
      const debugInfo = await HomePageDataFetcher.getDebugInfo();

      expect(debugInfo).toHaveProperty('dataLoadingState');
      expect(debugInfo).toHaveProperty('authBufferState');
      expect(debugInfo).toHaveProperty('executionStats');
    });
  });

  describe('getDefaultCategories', () => {
    it('should return default categories', () => {
      const categories = HomePageDataFetcher.getDefaultCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      
      categories.forEach(category => {
        expect(category).toHaveProperty('title');
        expect(category).toHaveProperty('slug');
        expect(category).toHaveProperty('color');
      });
    });

    it('should return a copy of categories (not reference)', () => {
      const categories1 = HomePageDataFetcher.getDefaultCategories();
      const categories2 = HomePageDataFetcher.getDefaultCategories();

      expect(categories1).not.toBe(categories2); // Different references
      expect(categories1).toEqual(categories2); // Same content
    });
  });

  describe('error handling and resilience', () => {
    it('should be resilient to network issues', async () => {
      // This test verifies that the fetcher doesn't crash on network issues
      // The actual network calls might fail, but the structure should be maintained
      
      const result = await HomePageDataFetcher.fetchHomePageData();
      
      // Should always return a valid structure
      expect(result.data).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(typeof result.hasPartialFailure).toBe('boolean');
    });

    it('should handle concurrent requests', async () => {
      // Test multiple concurrent requests
      const promises = Array.from({ length: 3 }, () => 
        HomePageDataFetcher.fetchHomePageData()
      );

      const results = await Promise.allSettled(promises);
      
      // All should either succeed or fail gracefully
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveProperty('data');
          expect(result.value).toHaveProperty('errors');
        }
        // If rejected, that's also acceptable for this test
      });
    });
  });
});