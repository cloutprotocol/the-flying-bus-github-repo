import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { 
  useDataLoadingIndependence, 
  useArticlesIndependent, 
  useCategoriesIndependent,
  useFeaturedArticlesIndependent,
  useUserDataIndependent
} from '../useDataLoadingIndependence';

// Mock the services
vi.mock('@/services/queryExecutor', () => ({
  queryExecutor: {
    executeQuery: vi.fn()
  }
}));

vi.mock('@/services/dataLoadingManager', () => ({
  dataLoadingManager: {
    executeQuery: vi.fn(),
    getState: vi.fn(() => ({
      isIndependent: true,
      authInterference: false,
      fallbackMode: false,
      queryExecutionMode: 'authenticated'
    }))
  }
}));

vi.mock('@/services/authStateBuffer', () => ({
  authStateBuffer: {
    registerQuery: vi.fn(),
    unregisterQuery: vi.fn(),
    getBufferState: vi.fn(() => ({
      isBuffering: false,
      bufferSize: 0,
      ongoingQueries: 0
    }))
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('useDataLoadingIndependence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useDataLoadingIndependence', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() =>
        useDataLoadingIndependence({
          table: 'articles',
          select: '*',
          enabled: false // Disabled to prevent initial fetch
        })
      );

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.executionMode).toBe('authenticated');
      expect(result.current.fromCache).toBe(false);
      expect(typeof result.current.refetch).toBe('function');
      expect(result.current.isStale).toBe(true);
    });

    it('should fetch data when enabled', async () => {
      const mockData = [{ id: 1, title: 'Test Article' }];
      const { queryExecutor } = await import('@/services/queryExecutor');
      
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        data: mockData,
        error: null,
        executionMode: 'authenticated',
        fromCache: false
      });

      const { result } = renderHook(() =>
        useDataLoadingIndependence({
          table: 'articles',
          select: '*',
          enabled: true
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(result.current.executionMode).toBe('authenticated');
    });

    it('should handle query errors gracefully', async () => {
      const mockError = new Error('Query failed');
      const { queryExecutor } = await import('@/services/queryExecutor');
      
      vi.mocked(queryExecutor.executeQuery).mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useDataLoadingIndependence({
          table: 'articles',
          select: '*',
          enabled: true
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(mockError);
    });

    it('should support manual refetch', async () => {
      const mockData = [{ id: 1, title: 'Refetched Article' }];
      const { queryExecutor } = await import('@/services/queryExecutor');
      
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        data: mockData,
        error: null,
        executionMode: 'authenticated',
        fromCache: false
      });

      const { result } = renderHook(() =>
        useDataLoadingIndependence({
          table: 'articles',
          select: '*',
          enabled: false
        })
      );

      expect(result.current.data).toBeNull();

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });
    });

    it('should detect stale data', async () => {
      const { result } = renderHook(() =>
        useDataLoadingIndependence({
          table: 'articles',
          select: '*',
          enabled: false,
          staleTime: 100 // 100ms stale time
        })
      );

      expect(result.current.isStale).toBe(true);

      // Simulate data fetch
      const mockData = [{ id: 1, title: 'Fresh Article' }];
      const { queryExecutor } = await import('@/services/queryExecutor');
      
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        data: mockData,
        error: null,
        executionMode: 'authenticated',
        fromCache: false
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.isStale).toBe(false);
      });

      // Wait for data to become stale
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(result.current.isStale).toBe(true);
    });
  });

  describe('useArticlesIndependent', () => {
    it('should fetch articles with correct options', async () => {
      const mockArticles = [
        { id: 1, title: 'Article 1', status: 'published' },
        { id: 2, title: 'Article 2', status: 'published' }
      ];
      
      const { queryExecutor } = await import('@/services/queryExecutor');
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        data: mockArticles,
        error: null,
        executionMode: 'authenticated',
        fromCache: false
      });

      const { result } = renderHook(() => useArticlesIndependent());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockArticles);
      expect(queryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'articles',
          filters: expect.objectContaining({
            status: 'published'
          }),
          limit: 20,
          priority: 'high'
        })
      );
    });

    it('should apply additional filters', async () => {
      const filters = { category_id: 1 };
      const { queryExecutor } = await import('@/services/queryExecutor');
      
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        data: [],
        error: null,
        executionMode: 'authenticated',
        fromCache: false
      });

      renderHook(() => useArticlesIndependent(filters));

      await waitFor(() => {
        expect(queryExecutor.executeQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              status: 'published',
              category_id: 1
            })
          })
        );
      });
    });
  });

  describe('useCategoriesIndependent', () => {
    it('should fetch categories with correct options', async () => {
      const mockCategories = [
        { id: 1, name: 'Category 1' },
        { id: 2, name: 'Category 2' }
      ];
      
      const { queryExecutor } = await import('@/services/queryExecutor');
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        data: mockCategories,
        error: null,
        executionMode: 'authenticated',
        fromCache: false
      });

      const { result } = renderHook(() => useCategoriesIndependent());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCategories);
      expect(queryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'categories',
          orderBy: { column: 'name', ascending: true },
          priority: 'normal',
          staleTime: 30 * 60 * 1000 // 30 minutes
        })
      );
    });
  });

  describe('useFeaturedArticlesIndependent', () => {
    it('should fetch featured articles with correct options', async () => {
      const mockFeatured = [
        { id: 1, title: 'Featured Article 1', featured: true },
        { id: 2, title: 'Featured Article 2', featured: true }
      ];
      
      const { queryExecutor } = await import('@/services/queryExecutor');
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        data: mockFeatured,
        error: null,
        executionMode: 'authenticated',
        fromCache: false
      });

      const { result } = renderHook(() => useFeaturedArticlesIndependent());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockFeatured);
      expect(queryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'articles',
          filters: expect.objectContaining({
            status: 'published',
            featured: true
          }),
          limit: 5,
          priority: 'high'
        })
      );
    });
  });

  describe('useUserDataIndependent', () => {
    it('should fetch user data when userId is provided', async () => {
      const userId = 'user-123';
      const mockUserData = [{ id: userId, username: 'testuser' }];
      
      const { queryExecutor } = await import('@/services/queryExecutor');
      vi.mocked(queryExecutor.executeQuery).mockResolvedValue({
        data: mockUserData,
        error: null,
        executionMode: 'authenticated',
        fromCache: false
      });

      const { result } = renderHook(() => useUserDataIndependent(userId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockUserData);
      expect(queryExecutor.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'profiles',
          filters: { id: userId },
          requireAuth: true,
          refetchOnAuthChange: true
        })
      );
    });

    it('should not fetch when userId is not provided', async () => {
      const { queryExecutor } = await import('@/services/queryExecutor');
      
      renderHook(() => useUserDataIndependent());

      expect(queryExecutor.executeQuery).not.toHaveBeenCalled();
    });
  });
});