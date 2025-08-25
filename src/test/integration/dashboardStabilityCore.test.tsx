import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSimpleActivityFeed } from '@/hooks/useSimpleActivityFeed';
import { useSimpleDashboardMetrics } from '@/hooks/useSimpleDashboardMetrics';

// Mock the hooks' dependencies
vi.mock('@/hooks/useSimpleLoadingState', () => ({
  useDashboardLoadingState: vi.fn()
}));

vi.mock('@/hooks/useAdminErrorHandling', () => ({
  useAdminActivityErrorHandling: vi.fn(),
  useAdminMetricsErrorHandling: vi.fn()
}));

describe('Dashboard Stability Core Tests', () => {
  const mockExecute = vi.fn();
  const mockExecuteWithErrorHandling = vi.fn();
  const mockRetryOperation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock loading state hook
    const { useDashboardLoadingState } = require('@/hooks/useSimpleLoadingState');
    vi.mocked(useDashboardLoadingState).mockReturnValue({
      state: {
        isLoading: false,
        error: null,
        shouldShowSkeleton: false
      },
      execute: mockExecute
    });
    
    // Mock error handling hooks
    const { useAdminActivityErrorHandling, useAdminMetricsErrorHandling } = require('@/hooks/useAdminErrorHandling');
    const errorHandlingReturn = {
      executeWithErrorHandling: mockExecuteWithErrorHandling,
      retryOperation: mockRetryOperation,
      canRetry: false,
      hasError: false,
      isRetrying: false,
      errorState: null
    };
    
    vi.mocked(useAdminActivityErrorHandling).mockReturnValue(errorHandlingReturn);
    vi.mocked(useAdminMetricsErrorHandling).mockReturnValue(errorHandlingReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useSimpleActivityFeed', () => {
    it('should not create infinite loops with empty dependency array', async () => {
      const mockActivities = [
        { 
          id: '1', 
          user_id: 'user1',
          activity_type: 'article_created' as const,
          entity_type: 'article',
          entity_id: 'article1',
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          profile: { display_name: 'Test User', avatar_url: null }
        }
      ];
      
      mockExecute.mockResolvedValue(mockActivities);
      mockExecuteWithErrorHandling.mockResolvedValue(mockActivities);

      const { result } = renderHook(() => useSimpleActivityFeed(10));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.activities).toEqual(mockActivities);
      });

      // Verify useEffect was called only once (no infinite loop)
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useSimpleActivityFeed(10));

      const firstRefresh = result.current.refresh;
      const firstManualRefresh = result.current.manualRefresh;

      // Re-render
      rerender();

      // Function references should remain stable
      expect(result.current.refresh).toBe(firstRefresh);
      expect(result.current.manualRefresh).toBe(firstManualRefresh);
    });

    it('should handle manual refresh without creating loops', async () => {
      const mockActivities = [
        { 
          id: '1', 
          user_id: 'user1',
          activity_type: 'article_created' as const,
          entity_type: 'article',
          entity_id: 'article1',
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          profile: { display_name: 'Test User', avatar_url: null }
        }
      ];
      
      mockExecute.mockResolvedValue(mockActivities);
      mockExecuteWithErrorHandling.mockResolvedValue(mockActivities);

      const { result } = renderHook(() => useSimpleActivityFeed(10));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.activities).toEqual(mockActivities);
      });

      // Clear call counts
      vi.clearAllMocks();

      // Call refresh manually
      await result.current.refresh();

      // Verify refresh was called once
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no additional calls were made
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('useSimpleDashboardMetrics', () => {
    it('should not create infinite loops with empty dependency array', async () => {
      const mockMetrics = {
        totalArticles: 10,
        articleViews: 0,
        commentCount: 5,
        pendingArticles: 2,
        pendingComments: 1,
        pendingInvitations: 3,
        recentArticles: [
          { id: '1', title: 'Test Article', status: 'published', lastEdited: '1/1/2024' }
        ]
      };
      
      mockExecute.mockResolvedValue(mockMetrics);
      mockExecuteWithErrorHandling.mockResolvedValue(mockMetrics);

      const { result } = renderHook(() => useSimpleDashboardMetrics());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.metrics).toEqual(mockMetrics);
      });

      // Verify useEffect was called only once (no infinite loop)
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useSimpleDashboardMetrics());

      const firstRefresh = result.current.refresh;
      const firstManualRefresh = result.current.manualRefresh;

      // Re-render
      rerender();

      // Function references should remain stable
      expect(result.current.refresh).toBe(firstRefresh);
      expect(result.current.manualRefresh).toBe(firstManualRefresh);
    });

    it('should handle manual refresh without creating loops', async () => {
      const mockMetrics = {
        totalArticles: 10,
        articleViews: 0,
        commentCount: 5,
        pendingArticles: 2,
        pendingComments: 1,
        pendingInvitations: 3,
        recentArticles: []
      };
      
      mockExecute.mockResolvedValue(mockMetrics);
      mockExecuteWithErrorHandling.mockResolvedValue(mockMetrics);

      const { result } = renderHook(() => useSimpleDashboardMetrics());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.metrics).toEqual(mockMetrics);
      });

      // Clear call counts
      vi.clearAllMocks();

      // Call refresh manually
      await result.current.refresh();

      // Verify refresh was called once
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);

      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no additional calls were made
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery', () => {
    it('should handle retry operations without creating loops', async () => {
      // Mock error handling with retry capability
      const { useAdminActivityErrorHandling } = require('@/hooks/useAdminErrorHandling');
      vi.mocked(useAdminActivityErrorHandling).mockReturnValue({
        executeWithErrorHandling: mockExecuteWithErrorHandling,
        retryOperation: mockRetryOperation,
        canRetry: true,
        hasError: false,
        isRetrying: false,
        errorState: null
      });
      
      const mockActivities = [
        { 
          id: '1', 
          user_id: 'user1',
          activity_type: 'article_created' as const,
          entity_type: 'article',
          entity_id: 'article1',
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          profile: { display_name: 'Test User', avatar_url: null }
        }
      ];
      
      mockExecute.mockResolvedValue(mockActivities);
      mockExecuteWithErrorHandling.mockResolvedValue(mockActivities);
      mockRetryOperation.mockResolvedValue(mockActivities);

      const { result } = renderHook(() => useSimpleActivityFeed(10));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.activities).toEqual(mockActivities);
      });

      // Clear call counts
      vi.clearAllMocks();

      // Call manual refresh (which should use retry when available)
      await result.current.manualRefresh();

      // Verify retry was called once
      expect(mockRetryOperation).toHaveBeenCalledTimes(1);

      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no additional calls were made
      expect(mockRetryOperation).toHaveBeenCalledTimes(1);
    });

    it('should not create loops when error state changes', async () => {
      const mockActivities = [
        { 
          id: '1', 
          user_id: 'user1',
          activity_type: 'article_created' as const,
          entity_type: 'article',
          entity_id: 'article1',
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          profile: { display_name: 'Test User', avatar_url: null }
        }
      ];
      
      mockExecute.mockResolvedValue(mockActivities);
      mockExecuteWithErrorHandling.mockResolvedValue(mockActivities);

      const { result, rerender } = renderHook(() => useSimpleActivityFeed(10));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.activities).toEqual(mockActivities);
      });

      // Clear call counts
      vi.clearAllMocks();

      // Mock error handling state change
      const { useAdminActivityErrorHandling } = require('@/hooks/useAdminErrorHandling');
      vi.mocked(useAdminActivityErrorHandling).mockReturnValue({
        executeWithErrorHandling: mockExecuteWithErrorHandling,
        retryOperation: mockRetryOperation,
        canRetry: true,
        hasError: true,
        isRetrying: false,
        errorState: { message: 'Test error', retryCount: 1 }
      });

      // Force re-render
      rerender();

      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no additional calls were made due to error state change
      expect(mockExecuteWithErrorHandling).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle concurrent operations without race conditions', async () => {
      const mockMetrics = {
        totalArticles: 10,
        articleViews: 0,
        commentCount: 5,
        pendingArticles: 2,
        pendingComments: 1,
        pendingInvitations: 3,
        recentArticles: []
      };
      
      // Add delays to simulate async operations
      mockExecute.mockImplementation(async (fn) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return await fn();
      });
      
      mockExecuteWithErrorHandling.mockResolvedValue(mockMetrics);

      const { result } = renderHook(() => useSimpleDashboardMetrics());

      // Wait for all operations to complete
      await waitFor(() => {
        expect(result.current.metrics).toEqual(mockMetrics);
      }, { timeout: 1000 });

      // Verify operations completed successfully
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should prevent memory leaks on unmount', async () => {
      const mockActivities = [
        { 
          id: '1', 
          user_id: 'user1',
          activity_type: 'article_created' as const,
          entity_type: 'article',
          entity_id: 'article1',
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          profile: { display_name: 'Test User', avatar_url: null }
        }
      ];
      
      mockExecute.mockResolvedValue(mockActivities);
      mockExecuteWithErrorHandling.mockResolvedValue(mockActivities);

      const { result, unmount } = renderHook(() => useSimpleActivityFeed(10));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.activities).toEqual(mockActivities);
      });

      // Unmount component
      unmount();

      // Wait a bit to ensure no additional calls after unmount
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify no additional calls were made after unmount
      const initialCallCount = mockExecuteWithErrorHandling.mock.calls.length;
      
      // Wait more time to ensure no delayed calls
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(initialCallCount);
    });
  });
});