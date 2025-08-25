import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HomePageDataFetcher } from '../homePageDataFetcher';
import { queryExecutor } from '@/services/queryExecutor';
import { dataLoadingManager } from '@/services/dataLoadingManager';
import { authStateBuffer } from '@/services/authStateBuffer';
import * as articlesData from '@/data/articles';

// Mock the dependencies
vi.mock('@/services/queryExecutor');
vi.mock('@/services/dataLoadingManager');
vi.mock('@/services/authStateBuffer');
vi.mock('@/data/articles');
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

const mockQueryExecutor = vi.mocked(queryExecutor);
const mockDataLoadingManager = vi.mocked(dataLoadingManager);
const mockAuthStateBuffer = vi.mocked(authStateBuffer);
const mockArticlesData = vi.mocked(articlesData);

describe('HomePageDataFetcher - Auth Independence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockAuthStateBuffer.getBufferState.mockReturnValue({
      isBuffering: false,
      bufferSize: 0,
      ongoingQueries: 0,
      config: {
        bufferDuration: 1000,
        maxBufferSize: 10,
        interferenceThreshold: 3
      }
    });

    mockDataLoadingManager.getState.mockReturnValue({
      isIndependent: true,
      authInterference: false,
      fallbackMode: false,
      queryExecutionMode: 'authenticated'
    });

    mockQueryExecutor.getExecutionStats.mockReturnValue({
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      averageExecutionTime: 0
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchHomePageData with auth independence', () => {
    it('should fetch data successfully when authenticated', async () => {
      // Mock successful featured articles query
      mockQueryExecutor.getFeaturedArticles.mockResolvedValue({
        data: [{
          id: '1',
          title: 'Featured Article',
          excerpt: 'Test excerpt',
          cover_image: 'test-image.jpg',
          categories: { name: 'Headliners' },
          profiles: { display_name: 'Test Author' },
          created_at: '2025-01-01',
          published_at: '2025-01-01'
        }],
        error: null,
        executionMode: 'authenticated'
      });

      // Mock successful category query
      mockQueryExecutor.executeQuery
        .mockResolvedValueOnce({
          data: [{ id: '1', name: 'Headliners' }],
          error: null,
          executionMode: 'authenticated'
        })
        .mockResolvedValue({
          data: [{
            id: '2',
            title: 'Category Article',
            excerpt: 'Category excerpt',
            cover_image: 'category-image.jpg',
            categories: { name: 'Headliners' },
            profiles: { display_name: 'Category Author' },
            created_at: '2025-01-01',
            published_at: '2025-01-01'
          }],
          error: null,
          executionMode: 'authenticated'
        });

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toBeTruthy();
      expect(result.data.headlineArticle?.title).toBe('Featured Article');
      expect(result.data.categoryArticles['Headliners']).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.hasPartialFailure).toBe(false);
    });

    it('should handle auth interference gracefully', async () => {
      // Simulate auth interference
      mockAuthStateBuffer.getBufferState.mockReturnValue({
        isBuffering: true,
        bufferSize: 5,
        ongoingQueries: 2,
        config: {
          bufferDuration: 1000,
          maxBufferSize: 10,
          interferenceThreshold: 3
        }
      });

      mockDataLoadingManager.getState.mockReturnValue({
        isIndependent: true,
        authInterference: true,
        fallbackMode: false,
        queryExecutionMode: 'anonymous'
      });

      // Mock query failure with fallback success
      mockQueryExecutor.getFeaturedArticles.mockResolvedValue({
        data: null,
        error: new Error('Auth interference'),
        executionMode: 'fallback'
      });

      // Mock fallback to original method
      mockArticlesData.getHeadlineArticle.mockResolvedValue({
        id: '1',
        title: 'Fallback Article',
        excerpt: 'Fallback excerpt',
        imageUrl: 'fallback-image.jpg',
        category: 'Headliners',
        readingLevel: 'Intermediate',
        readTime: 5,
        author: 'Fallback Author',
        date: '2025-01-01',
        publishDate: '2025-01-01'
      });

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle?.title).toBe('Fallback Article');
      expect(mockArticlesData.getHeadlineArticle).toHaveBeenCalled();
    });

    it('should work when logged out (anonymous mode)', async () => {
      // Mock anonymous query execution
      mockQueryExecutor.getFeaturedArticles.mockResolvedValue({
        data: [{
          id: '1',
          title: 'Public Article',
          excerpt: 'Public excerpt',
          cover_image: 'public-image.jpg',
          categories: { name: 'Headliners' },
          profiles: { display_name: 'Public Author' },
          created_at: '2025-01-01',
          published_at: '2025-01-01'
        }],
        error: null,
        executionMode: 'anonymous'
      });

      mockQueryExecutor.executeQuery.mockResolvedValue({
        data: [],
        error: null,
        executionMode: 'anonymous'
      });

      const result = await HomePageDataFetcher.fetchWithAuthState('logged_out');

      expect(result.data.headlineArticle?.title).toBe('Public Article');
      expect(mockAuthStateBuffer.bufferStateChange).not.toHaveBeenCalled();
    });

    it('should handle logging in state with buffering', async () => {
      // Mock successful query despite auth state changes
      mockQueryExecutor.getFeaturedArticles.mockResolvedValue({
        data: [{
          id: '1',
          title: 'Buffered Article',
          excerpt: 'Buffered excerpt',
          cover_image: 'buffered-image.jpg',
          categories: { name: 'Headliners' },
          profiles: { display_name: 'Buffered Author' },
          created_at: '2025-01-01',
          published_at: '2025-01-01'
        }],
        error: null,
        executionMode: 'authenticated'
      });

      mockQueryExecutor.executeQuery.mockResolvedValue({
        data: [],
        error: null,
        executionMode: 'authenticated'
      });

      const result = await HomePageDataFetcher.fetchWithAuthState('logging_in');

      expect(result.data.headlineArticle?.title).toBe('Buffered Article');
      expect(mockAuthStateBuffer.bufferStateChange).toHaveBeenCalledWith({
        type: 'session_start',
        timestamp: expect.any(Number)
      });
    });

    it('should handle partial failures gracefully', async () => {
      // Mock headline success but category failure
      mockQueryExecutor.getFeaturedArticles.mockResolvedValue({
        data: [{
          id: '1',
          title: 'Success Article',
          excerpt: 'Success excerpt',
          cover_image: 'success-image.jpg',
          categories: { name: 'Headliners' },
          profiles: { display_name: 'Success Author' },
          created_at: '2025-01-01',
          published_at: '2025-01-01'
        }],
        error: null,
        executionMode: 'authenticated'
      });

      // Mock category query failure - first call for category lookup, second for articles
      mockQueryExecutor.executeQuery
        .mockRejectedValueOnce(new Error('Category lookup failed'))
        .mockRejectedValue(new Error('Category fetch failed'));
      mockArticlesData.getCategoryArticles.mockRejectedValue(new Error('Fallback also failed'));

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle?.title).toBe('Success Article');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.hasPartialFailure).toBe(true);
    });

    it('should handle complete failure with empty data structure', async () => {
      // Mock all queries failing with complete failure errors
      mockQueryExecutor.getFeaturedArticles.mockRejectedValue(new Error('complete failure: Featured articles failed'));
      mockQueryExecutor.executeQuery.mockRejectedValue(new Error('complete failure: Category query failed'));
      mockArticlesData.getHeadlineArticle.mockRejectedValue(new Error('Headline fallback failed'));
      mockArticlesData.getCategoryArticles.mockRejectedValue(new Error('Category fallback failed'));

      const result = await HomePageDataFetcher.fetchHomePageData();

      expect(result.data.headlineArticle).toBeNull();
      // Categories that fail completely should not be added to the result
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.hasPartialFailure).toBe(false); // Complete failure
    });

    it('should respect abort signals', async () => {
      const abortController = new AbortController();
      
      // Abort immediately
      abortController.abort();

      await expect(
        HomePageDataFetcher.fetchHomePageData(abortController.signal)
      ).rejects.toThrow('Request was aborted before starting');
    });
  });

  describe('preloadCriticalData', () => {
    it('should preload critical data successfully', async () => {
      mockDataLoadingManager.preloadCriticalData.mockResolvedValue();
      mockQueryExecutor.getFeaturedArticles.mockResolvedValue({
        data: [],
        error: null,
        executionMode: 'authenticated'
      });
      mockQueryExecutor.getCategories.mockResolvedValue({
        data: [],
        error: null,
        executionMode: 'authenticated'
      });

      await HomePageDataFetcher.preloadCriticalData();

      expect(mockDataLoadingManager.preloadCriticalData).toHaveBeenCalled();
      expect(mockQueryExecutor.getFeaturedArticles).toHaveBeenCalled();
      expect(mockQueryExecutor.getCategories).toHaveBeenCalled();
    });

    it('should handle preload failures gracefully', async () => {
      mockDataLoadingManager.preloadCriticalData.mockRejectedValue(new Error('Preload failed'));
      mockQueryExecutor.getFeaturedArticles.mockRejectedValue(new Error('Featured failed'));
      mockQueryExecutor.getCategories.mockRejectedValue(new Error('Categories failed'));

      // Should not throw
      await expect(HomePageDataFetcher.preloadCriticalData()).resolves.toBeUndefined();
    });
  });

  describe('getDebugInfo', () => {
    it('should return comprehensive debug information', async () => {
      const debugInfo = await HomePageDataFetcher.getDebugInfo();

      expect(debugInfo).toHaveProperty('dataLoadingState');
      expect(debugInfo).toHaveProperty('authBufferState');
      expect(debugInfo).toHaveProperty('executionStats');
      expect(mockDataLoadingManager.getState).toHaveBeenCalled();
      expect(mockAuthStateBuffer.getBufferState).toHaveBeenCalled();
      expect(mockQueryExecutor.getExecutionStats).toHaveBeenCalled();
    });
  });
});