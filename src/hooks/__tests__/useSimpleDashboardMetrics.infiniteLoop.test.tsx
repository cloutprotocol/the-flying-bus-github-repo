import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSimpleDashboardMetrics } from '@/hooks/useSimpleDashboardMetrics';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('@/utils/logger/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@/hooks/useSimpleLoadingState', () => ({
  useDashboardLoadingState: vi.fn()
}));

vi.mock('@/hooks/useAdminErrorHandling', () => ({
  useAdminMetricsErrorHandling: vi.fn()
}));

describe('useSimpleDashboardMetrics - Infinite Loop Prevention', () => {
  const mockSupabaseFrom = vi.fn();
  const mockExecute = vi.fn();
  const mockExecuteWithErrorHandling = vi.fn();
  const mockRetryOperation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase client
    const { supabase } = require('@/integrations/supabase/client');
    vi.mocked(supabase.from).mockImplementation(mockSupabaseFrom);
    
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
    
    // Mock error handling hook
    const { useAdminMetricsErrorHandling } = require('@/hooks/useAdminErrorHandling');
    vi.mocked(useAdminMetricsErrorHandling).mockReturnValue({
      executeWithErrorHandling: mockExecuteWithErrorHandling,
      retryOperation: mockRetryOperation,
      canRetry: false,
      hasError: false,
      isRetrying: false,
      errorState: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setupMockSupabaseQueries = () => {
    const mockSelect = vi.fn();
    const mockIn = vi.fn();
    const mockEq = vi.fn();
    const mockOrder = vi.fn();
    const mockLimit = vi.fn();

    // Chain methods for different query types
    mockSelect.mockReturnValue({
      in: mockIn,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit
    });

    mockIn.mockReturnValue({
      eq: mockEq
    });

    mockEq.mockReturnValue({
      eq: mockEq
    });

    mockOrder.mockReturnValue({
      limit: mockLimit
    });

    // Mock successful responses
    const successResponse = { count: 10, error: null, data: [] };
    const articlesResponse = { 
      count: 5, 
      error: null, 
      data: [
        { id: '1', title: 'Test Article', status: 'published', updated_at: '2024-01-01' }
      ] 
    };

    mockSelect.mockResolvedValue(successResponse);
    mockIn.mockResolvedValue(successResponse);
    mockEq.mockResolvedValue(successResponse);
    mockLimit.mockResolvedValue(articlesResponse);

    mockSupabaseFrom.mockReturnValue({
      select: mockSelect
    });

    return { mockSelect, mockIn, mockEq, mockOrder, mockLimit };
  };

  it('should not create infinite loops with empty dependency array', async () => {
    const { mockSelect } = setupMockSupabaseQueries();
    
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
    
    // Verify Supabase queries were called the expected number of times
    expect(mockSupabaseFrom).toHaveBeenCalledTimes(6); // 6 parallel queries
    expect(mockSelect).toHaveBeenCalled();
  });

  it('should not trigger re-renders when external state changes', async () => {
    const { mockSelect } = setupMockSupabaseQueries();
    
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

    const { result, rerender } = renderHook(() => useSimpleDashboardMetrics());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockMetrics);
    });

    // Clear call counts
    vi.clearAllMocks();

    // Force re-render - should NOT trigger new fetch due to empty dependency array
    rerender();

    // Wait a bit to ensure no additional calls
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify no additional calls were made
    expect(mockExecuteWithErrorHandling).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('should handle manual refresh without creating loops', async () => {
    const { mockSelect } = setupMockSupabaseQueries();
    
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
    setupMockSupabaseQueries(); // Reset mocks

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

  it('should handle retry operations without creating loops', async () => {
    const { mockSelect } = setupMockSupabaseQueries();
    
    // Mock error handling with retry capability
    const { useAdminMetricsErrorHandling } = require('@/hooks/useAdminErrorHandling');
    vi.mocked(useAdminMetricsErrorHandling).mockReturnValue({
      executeWithErrorHandling: mockExecuteWithErrorHandling,
      retryOperation: mockRetryOperation,
      canRetry: true,
      hasError: false,
      isRetrying: false,
      errorState: null
    });
    
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
    mockRetryOperation.mockResolvedValue(mockMetrics);

    const { result } = renderHook(() => useSimpleDashboardMetrics());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockMetrics);
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
    const { mockSelect } = setupMockSupabaseQueries();
    
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

    const { result, rerender } = renderHook(() => useSimpleDashboardMetrics());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockMetrics);
    });

    // Clear call counts
    vi.clearAllMocks();

    // Mock error handling state change
    const { useAdminMetricsErrorHandling } = require('@/hooks/useAdminErrorHandling');
    vi.mocked(useAdminMetricsErrorHandling).mockReturnValue({
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
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('should not create loops when loading state changes', async () => {
    const { mockSelect } = setupMockSupabaseQueries();
    
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

    const { result, rerender } = renderHook(() => useSimpleDashboardMetrics());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockMetrics);
    });

    // Clear call counts
    vi.clearAllMocks();

    // Mock loading state change
    const { useDashboardLoadingState } = require('@/hooks/useSimpleLoadingState');
    vi.mocked(useDashboardLoadingState).mockReturnValue({
      state: {
        isLoading: true,
        error: null,
        shouldShowSkeleton: true
      },
      execute: mockExecute
    });

    // Force re-render
    rerender();

    // Wait a bit to ensure no additional calls
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify no additional calls were made due to loading state change
    expect(mockExecuteWithErrorHandling).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('should maintain stable function references', () => {
    setupMockSupabaseQueries();
    
    const { result, rerender } = renderHook(() => useSimpleDashboardMetrics());

    const firstRefresh = result.current.refresh;
    const firstManualRefresh = result.current.manualRefresh;

    // Re-render
    rerender();

    // Function references should remain stable
    expect(result.current.refresh).toBe(firstRefresh);
    expect(result.current.manualRefresh).toBe(firstManualRefresh);
  });

  it('should handle parallel Supabase queries without race conditions', async () => {
    const { mockSelect } = setupMockSupabaseQueries();
    
    const mockMetrics = {
      totalArticles: 10,
      articleViews: 0,
      commentCount: 5,
      pendingArticles: 2,
      pendingComments: 1,
      pendingInvitations: 3,
      recentArticles: []
    };
    
    // Add delay to simulate async operations
    mockExecute.mockImplementation(async (fn) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return await fn();
    });
    
    mockExecuteWithErrorHandling.mockResolvedValue(mockMetrics);

    const { result } = renderHook(() => useSimpleDashboardMetrics());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockMetrics);
    }, { timeout: 1000 });

    // Verify all parallel queries were executed
    expect(mockSupabaseFrom).toHaveBeenCalledTimes(6);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('articles');
    expect(mockSupabaseFrom).toHaveBeenCalledWith('comments');
    expect(mockSupabaseFrom).toHaveBeenCalledWith('flagged_content');
    expect(mockSupabaseFrom).toHaveBeenCalledWith('invitation_tokens');
  });
});