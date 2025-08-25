import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dataLoadingManager } from '../dataLoadingManager';
import { authStateBuffer } from '../authStateBuffer';
import { queryExecutor } from '../queryExecutor';

// Mock Supabase client
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mockQuery)
  }
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Data Loading Independence Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataLoadingManager.clearCache();
    authStateBuffer.reset();
  });

  afterEach(() => {
    authStateBuffer.reset();
  });

  describe('DataLoadingManager', () => {
    it('should execute authenticated queries successfully', async () => {
      const mockData = [{ id: 1, title: 'Test Article' }];
      
      // Mock successful query
      mockQuery.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await dataLoadingManager.executeQuery({
        table: 'articles',
        select: '*',
        filters: { status: 'published' },
        limit: 10
      });

      expect(result.data).toEqual(mockData);
      expect(result.executionMode).toBe('authenticated');
      expect(result.error).toBeNull();
    });

    it('should fallback to anonymous queries when authenticated fails', async () => {
      const mockData = [{ id: 1, title: 'Public Article' }];
      
      // First call (authenticated) fails, second call (anonymous) succeeds
      mockQuery.limit
        .mockRejectedValueOnce(new Error('Auth failed'))
        .mockResolvedValueOnce({ data: mockData, error: null });

      const result = await dataLoadingManager.executeQuery({
        table: 'articles',
        select: '*',
        filters: { status: 'published' },
        limit: 10
      });

      expect(result.data).toEqual(mockData);
      expect(result.executionMode).toBe('anonymous');
    });

    it('should cache successful query results', async () => {
      const mockData = [{ id: 1, title: 'Cached Article' }];
      
      mockQuery.limit.mockResolvedValue({ data: mockData, error: null });

      const options = {
        table: 'articles',
        select: '*',
        filters: { status: 'published' },
        limit: 10
      };

      // First call should hit the database
      const result1 = await dataLoadingManager.executeQuery(options);
      expect(result1.fromCache).toBeFalsy();

      // Second call should return cached result
      const result2 = await dataLoadingManager.executeQuery(options);
      expect(result2.fromCache).toBeTruthy();
      expect(result2.data).toEqual(mockData);
    });

    it('should handle auth interference state', () => {
      const initialState = dataLoadingManager.getState();
      expect(initialState.authInterference).toBe(false);

      dataLoadingManager.setAuthInterference(true);
      const interferenceState = dataLoadingManager.getState();
      expect(interferenceState.authInterference).toBe(true);
      expect(interferenceState.queryExecutionMode).toBe('anonymous');
    });
  });

  describe('AuthStateBuffer', () => {
    it('should buffer auth state changes', () => {
      const change = {
        type: 'session_start' as const,
        timestamp: Date.now(),
        data: { userId: '123' }
      };

      authStateBuffer.bufferStateChange(change);
      const state = authStateBuffer.getBufferState();
      
      expect(state.bufferSize).toBe(1);
    });

    it('should register and unregister queries', () => {
      const queryId = 'test-query-1';
      
      authStateBuffer.registerQuery(queryId);
      let state = authStateBuffer.getBufferState();
      expect(state.ongoingQueries).toBe(1);
      expect(state.isBuffering).toBe(true);

      authStateBuffer.unregisterQuery(queryId);
      state = authStateBuffer.getBufferState();
      expect(state.ongoingQueries).toBe(0);
    });

    it('should detect interference patterns', () => {
      // Simulate rapid auth state changes
      for (let i = 0; i < 5; i++) {
        authStateBuffer.bufferStateChange({
          type: 'profile_loading',
          timestamp: Date.now(),
        });
      }

      const state = authStateBuffer.getBufferState();
      expect(state.isBuffering).toBe(true);
    });

    it('should reset buffer state', () => {
      authStateBuffer.registerQuery('test-query');
      authStateBuffer.bufferStateChange({
        type: 'session_start',
        timestamp: Date.now()
      });

      authStateBuffer.reset();
      const state = authStateBuffer.getBufferState();
      
      expect(state.bufferSize).toBe(0);
      expect(state.ongoingQueries).toBe(0);
      expect(state.isBuffering).toBe(false);
    });
  });

  describe('QueryExecutor', () => {
    it('should execute single query with auth protection', async () => {
      const mockData = [{ id: 1, title: 'Protected Article' }];
      
      mockQuery.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await queryExecutor.executeQuery({
        table: 'articles',
        select: '*',
        filters: { status: 'published' },
        limit: 10
      });

      expect(result.data).toEqual(mockData);
      expect(result.executionMode).toBe('authenticated');
    });

    it('should execute multiple queries concurrently', async () => {
      const mockArticles = [{ id: 1, title: 'Article 1' }];
      const mockCategories = [{ id: 1, name: 'Category 1' }];
      
      // First query returns articles, second returns categories
      mockQuery.limit
        .mockResolvedValueOnce({ data: mockArticles, error: null })
        .mockResolvedValueOnce({ data: mockCategories, error: null });

      const queries = [
        { table: 'articles', select: '*', filters: { status: 'published' } },
        { table: 'categories', select: '*' }
      ];

      const results = await queryExecutor.executeQueries(queries);
      
      expect(results).toHaveLength(2);
      expect(results[0].data).toEqual(mockArticles);
      expect(results[1].data).toEqual(mockCategories);
    });

    it('should provide specialized query methods', async () => {
      const mockArticles = [{ id: 1, title: 'Featured Article' }];
      
      mockQuery.limit.mockResolvedValue({ data: mockArticles, error: null });

      const articlesResult = await queryExecutor.getArticles();
      const categoriesResult = await queryExecutor.getCategories();
      const featuredResult = await queryExecutor.getFeaturedArticles();

      expect(articlesResult.data).toEqual(mockArticles);
      expect(categoriesResult.data).toEqual(mockArticles); // Same mock data
      expect(featuredResult.data).toEqual(mockArticles); // Same mock data
    });

    it('should handle query timeouts', async () => {
      // Mock a slow query that takes 2 seconds
      mockQuery.limit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 2000)));

      await expect(queryExecutor.executeQuery({
        table: 'articles',
        select: '*',
        timeout: 100 // 100ms timeout
      })).rejects.toThrow('Query timeout after 100ms');
    });

    it('should provide execution statistics', () => {
      const stats = queryExecutor.getExecutionStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('averageExecutionTime');
    });
  });

  describe('Integration Tests', () => {
    it('should handle auth state changes during query execution', async () => {
      const mockData = [{ id: 1, title: 'Integration Test Article' }];
      
      mockQuery.limit.mockResolvedValue({ data: mockData, error: null });

      // Start a query
      const queryPromise = queryExecutor.executeQuery({
        table: 'articles',
        select: '*',
        filters: { status: 'published' }
      });

      // Simulate auth state changes during query
      authStateBuffer.bufferStateChange({
        type: 'session_start',
        timestamp: Date.now()
      });

      authStateBuffer.bufferStateChange({
        type: 'profile_loading',
        timestamp: Date.now()
      });

      const result = await queryPromise;
      
      expect(result.data).toEqual(mockData);
      expect(result.executionMode).toBe('authenticated');
    });

    it('should maintain data loading independence during auth interference', async () => {
      // Simulate auth interference
      dataLoadingManager.setAuthInterference(true);
      
      const mockData = [{ id: 1, title: 'Independent Article' }];
      
      mockQuery.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await dataLoadingManager.executeQuery({
        table: 'articles',
        select: '*',
        filters: { status: 'published' }
      });

      expect(result.data).toEqual(mockData);
      // Should still work despite auth interference
      expect(result.executionMode).toBe('authenticated');
    });
  });
});