import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as articlesData from '@/data/articles';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock the articles data module
vi.mock('@/data/articles', () => ({
  getHeadlineArticle: vi.fn(),
  getCategoryArticles: vi.fn(),
}));

// Mock the logger to avoid console noise in tests
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  LogSource: {
    ARTICLE: 'ARTICLE',
    AUTH: 'AUTH',
  },
}));

// Test data
const mockHeadlineArticle: ArticleProps = {
  id: 'headline-1',
  title: 'Breaking: Major News Story',
  excerpt: 'This is a major breaking news story that everyone should know about.',
  content: 'Full content of the breaking news story...',
  author: 'Jane Reporter',
  publishedAt: '2024-01-15T10:00:00Z',
  category: 'Headliners',
  imageUrl: 'https://example.com/headline-image.jpg',
  slug: 'breaking-major-news-story',
  readTime: 5,
  tags: ['breaking', 'news'],
  featured: true,
};

const mockCategoryArticles: Record<string, ArticleProps[]> = {
  'Headliners': [
    {
      id: 'headliner-1',
      title: 'Important Headliner Story',
      excerpt: 'An important story in the headliners category.',
      content: 'Full content...',
      author: 'John Writer',
      publishedAt: '2024-01-14T15:30:00Z',
      category: 'Headliners',
      imageUrl: 'https://example.com/headliner-1.jpg',
      slug: 'important-headliner-story',
      readTime: 3,
      tags: ['important'],
      featured: false,
    },
  ],
  'Debates': [
    {
      id: 'debate-1',
      title: 'Should Schools Start Later?',
      excerpt: 'A debate about school start times and student health.',
      content: 'Full debate content...',
      author: 'Mike Debater',
      publishedAt: '2024-01-12T09:00:00Z',
      category: 'Debates',
      imageUrl: 'https://example.com/debate-1.jpg',
      slug: 'should-schools-start-later',
      readTime: 6,
      tags: ['education', 'health'],
      featured: false,
    },
  ],
  'Learning': [
    {
      id: 'learning-1',
      title: 'How Photosynthesis Works',
      excerpt: 'Learn about how plants make their own food.',
      content: 'Educational content about photosynthesis...',
      author: 'Dr. Science',
      publishedAt: '2024-01-11T14:00:00Z',
      category: 'Learning',
      imageUrl: 'https://example.com/learning-1.jpg',
      slug: 'how-photosynthesis-works',
      readTime: 8,
      tags: ['science', 'plants'],
      featured: false,
    },
  ],
};

describe('Home Page End-to-End Validation - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default successful responses
    vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(mockHeadlineArticle);
    vi.mocked(articlesData.getCategoryArticles).mockImplementation((category: string) => {
      return Promise.resolve(mockCategoryArticles[category] || []);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('HomePageDataFetcher Functionality', () => {
    it('should fetch home page data successfully within 3 seconds', async () => {
      const startTime = Date.now();
      
      const result = await HomePageDataFetcher.fetchHomePageData();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Requirement 1.1: Load within 3 seconds
      
      // Verify data structure
      expect(result.data.headlineArticle).toEqual(mockHeadlineArticle);
      expect(result.data.categoryArticles['Headliners']).toEqual(mockCategoryArticles['Headliners']);
      expect(result.data.categoryArticles['Debates']).toEqual(mockCategoryArticles['Debates']);
      expect(result.data.categoryArticles['Learning']).toEqual(mockCategoryArticles['Learning']);
      
      // Verify no errors
      expect(result.errors).toEqual([]);
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle featured article display correctly', async () => {
      const result = await HomePageDataFetcher.fetchHomePageData();
      
      // Verify featured article is present and properly structured
      expect(result.data.headlineArticle).not.toBeNull();
      expect(result.data.headlineArticle?.title).toBe('Breaking: Major News Story');
      expect(result.data.headlineArticle?.featured).toBe(true);
      expect(result.data.headlineArticle?.author).toBe('Jane Reporter');
    });

    it('should handle missing featured article gracefully', async () => {
      // Mock no headline article
      vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(null);

      const result = await HomePageDataFetcher.fetchHomePageData();
      
      // Verify no featured article
      expect(result.data.headlineArticle).toBeNull();
      
      // Verify category articles are still available
      expect(result.data.categoryArticles['Headliners']).toEqual(mockCategoryArticles['Headliners']);
      expect(result.data.categoryArticles['Debates']).toEqual(mockCategoryArticles['Debates']);
    });

    it('should render category sections properly', async () => {
      const result = await HomePageDataFetcher.fetchHomePageData();
      
      // Verify all expected categories have content
      expect(result.data.categoryArticles['Headliners']).toHaveLength(1);
      expect(result.data.categoryArticles['Debates']).toHaveLength(1);
      expect(result.data.categoryArticles['Learning']).toHaveLength(1);
      
      // Verify article structure
      const headlinerArticle = result.data.categoryArticles['Headliners'][0];
      expect(headlinerArticle.title).toBe('Important Headliner Story');
      expect(headlinerArticle.category).toBe('Headliners');
      expect(headlinerArticle.author).toBe('John Writer');
    });

    it('should skip empty category sections', async () => {
      // Mock some categories as empty
      vi.mocked(articlesData.getCategoryArticles).mockImplementation((category: string) => {
        if (category === 'Spice It Up' || category === 'Storyboard') {
          return Promise.resolve([]);
        }
        return Promise.resolve(mockCategoryArticles[category] || []);
      });

      const result = await HomePageDataFetcher.fetchHomePageData();
      
      // Verify populated categories are present
      expect(result.data.categoryArticles['Headliners']).toHaveLength(1);
      expect(result.data.categoryArticles['Debates']).toHaveLength(1);
      expect(result.data.categoryArticles['Learning']).toHaveLength(1);
      
      // Verify empty categories return empty arrays
      expect(result.data.categoryArticles['Spice It Up']).toEqual([]);
      expect(result.data.categoryArticles['Storyboard']).toEqual([]);
    });

    it('should handle complete data loading failure gracefully', async () => {
      // Mock complete failure
      vi.mocked(articlesData.getHeadlineArticle).mockRejectedValue(new Error('Network error'));
      vi.mocked(articlesData.getCategoryArticles).mockRejectedValue(new Error('Network error'));

      const result = await HomePageDataFetcher.fetchHomePageData();
      
      // Verify error handling
      expect(result.data.headlineArticle).toBeNull();
      // The data fetcher returns empty arrays for failed categories, not an empty object
      expect(Object.keys(result.data.categoryArticles).length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      // The HomePageDataFetcher treats any errors as partial failure (which is correct behavior)
      expect(result.hasPartialFailure).toBe(true);
    });

    it('should handle partial data loading failure', async () => {
      // Mock partial failure - headline succeeds, some categories fail
      vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(mockHeadlineArticle);
      vi.mocked(articlesData.getCategoryArticles).mockImplementation((category: string) => {
        if (category === 'Debates') {
          return Promise.reject(new Error('Category fetch failed'));
        }
        return Promise.resolve(mockCategoryArticles[category] || []);
      });

      const result = await HomePageDataFetcher.fetchHomePageData();
      
      // Verify successful content is still available
      expect(result.data.headlineArticle).toEqual(mockHeadlineArticle);
      expect(result.data.categoryArticles['Headliners']).toEqual(mockCategoryArticles['Headliners']);
      expect(result.data.categoryArticles['Learning']).toEqual(mockCategoryArticles['Learning']);
      
      // Verify failed category returns empty array
      expect(result.data.categoryArticles['Debates']).toEqual([]);
      
      // Verify partial failure is detected
      expect(result.hasPartialFailure).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle no content scenarios appropriately', async () => {
      // Mock no content scenario
      vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(null);
      vi.mocked(articlesData.getCategoryArticles).mockResolvedValue([]);

      const result = await HomePageDataFetcher.fetchHomePageData();
      
      // Verify no content state
      expect(result.data.headlineArticle).toBeNull();
      
      // Verify all categories are empty
      const categories = HomePageDataFetcher.getDefaultCategories();
      categories.forEach(category => {
        expect(result.data.categoryArticles[category.title]).toEqual([]);
      });
      
      // Verify no errors (successful empty response)
      expect(result.errors).toEqual([]);
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle scenario with only featured article', async () => {
      // Mock scenario with only headline, no category articles
      vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(mockHeadlineArticle);
      vi.mocked(articlesData.getCategoryArticles).mockResolvedValue([]);

      const result = await HomePageDataFetcher.fetchHomePageData();
      
      // Verify featured article is present
      expect(result.data.headlineArticle).toEqual(mockHeadlineArticle);
      
      // Verify all categories are empty
      const categories = HomePageDataFetcher.getDefaultCategories();
      categories.forEach(category => {
        expect(result.data.categoryArticles[category.title]).toEqual([]);
      });
    });

    it('should support request cancellation with abort controller', async () => {
      // Mock slow loading
      vi.mocked(articlesData.getHeadlineArticle).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockHeadlineArticle), 1000))
      );

      const abortController = new AbortController();
      
      // Start the request
      const fetchPromise = HomePageDataFetcher.fetchHomePageData(abortController.signal);
      
      // Abort the request after 100ms
      setTimeout(() => abortController.abort(), 100);
      
      // The HomePageDataFetcher handles aborts gracefully and returns a result with errors
      const result = await fetchPromise;
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('aborted');
    });

    it('should handle component unmounting during data fetch', async () => {
      // Mock slow loading
      vi.mocked(articlesData.getHeadlineArticle).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockHeadlineArticle), 500))
      );

      const abortController = new AbortController();
      
      // Start the request
      const fetchPromise = HomePageDataFetcher.fetchHomePageData(abortController.signal);
      
      // Simulate component unmounting
      abortController.abort();
      
      // Verify the request handles abortion gracefully
      const result = await fetchPromise;
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('aborted');
    });
  });

  describe('Category Configuration', () => {
    it('should provide correct default categories', () => {
      const categories = HomePageDataFetcher.getDefaultCategories();
      
      // Verify expected categories are present
      const expectedCategories = [
        'Headliners', 'Debates', 'Spice It Up', 'Storyboard', 
        'Neighborhood', 'Learning', 'School News'
      ];
      
      expectedCategories.forEach(expectedCategory => {
        const found = categories.find(cat => cat.title === expectedCategory);
        expect(found).toBeDefined();
        expect(found?.slug).toBeDefined();
        expect(found?.color).toBeDefined();
      });
      
      // Verify category structure
      categories.forEach(category => {
        expect(category).toHaveProperty('title');
        expect(category).toHaveProperty('slug');
        expect(category).toHaveProperty('color');
        expect(typeof category.title).toBe('string');
        expect(typeof category.slug).toBe('string');
        expect(typeof category.color).toBe('string');
      });
    });
  });

  describe('Performance Validation', () => {
    it('should complete data fetching within performance targets', async () => {
      const startTime = Date.now();
      
      const result = await HomePageDataFetcher.fetchHomePageData();
      
      const duration = Date.now() - startTime;
      
      // Verify performance targets
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(result.data.headlineArticle).toBeDefined();
      expect(Object.keys(result.data.categoryArticles).length).toBeGreaterThan(0);
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Mock very slow response that would timeout
      vi.mocked(articlesData.getHeadlineArticle).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockHeadlineArticle), 6000))
      );

      const startTime = Date.now();
      
      const result = await HomePageDataFetcher.fetchHomePageData();
      
      const duration = Date.now() - startTime;
      
      // Should timeout and return error within reasonable time (5 second timeout + buffer)
      expect(duration).toBeLessThan(7000); // Should timeout before 7 seconds
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('timeout');
    }, 10000); // Increase test timeout to 10 seconds
  });
});