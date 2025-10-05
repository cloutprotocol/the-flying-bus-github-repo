import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSimpleActivityFeed } from '@/hooks/useSimpleActivityFeed';

// Mock dependencies
vi.mock('@/services/activityService', () => ({
  getRecentActivities: vi.fn(),
  Activity: {}
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
  useAdminActivityErrorHandling: vi.fn()
}));

describe('useSimpleActivityFeed - Infinite Loop Prevention', () => {
  const mockGetRecentActivities = vi.fn();
  const mockExecute = vi.fn();
  const mockExecuteWithErrorHandling = vi.fn();
  const mockRetryOperation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock activity service
    const { getRecentActivities } = require('@/services/activityService');
    vi.mocked(getRecentActivities).mockImplementation(mockGetRecentActivities);
    
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
    const { useAdminActivityErrorHandling } = require('@/hooks/useAdminErrorHandling');
    vi.mocked(useAdminActivityErrorHandling).mockReturnValue({
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

  it('should not create infinite loops with empty dependency array', async () => {
    // Mock successful data fetch
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
    
    mockGetRecentActivities.mockResolvedValue({
      activities: mockActivities,
      error: null
    });
    
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
    expect(mockGetRecentActivities).toHaveBeenCalledTimes(1);
  });

  it('should not trigger re-renders when limit prop changes', async () => {
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
    
    mockGetRecentActivities.mockResolvedValue({
      activities: mockActivities,
      error: null
    });
    
    mockExecute.mockResolvedValue(mockActivities);
    mockExecuteWithErrorHandling.mockResolvedValue(mockActivities);

    const { result, rerender } = renderHook(
      ({ limit }) => useSimpleActivityFeed(limit),
      { initialProps: { limit: 10 } }
    );

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.activities).toEqual(mockActivities);
    });

    // Clear call counts
    vi.clearAllMocks();

    // Change limit prop - should NOT trigger new fetch due to empty dependency array
    rerender({ limit: 20 });

    // Wait a bit to ensure no additional calls
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify no additional calls were made
    expect(mockExecuteWithErrorHandling).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockGetRecentActivities).not.toHaveBeenCalled();
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
    
    mockGetRecentActivities.mockResolvedValue({
      activities: mockActivities,
      error: null
    });
    
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

  it('should handle retry operations without creating loops', async () => {
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
    
    mockGetRecentActivities.mockResolvedValue({
      activities: mockActivities,
      error: null
    });
    
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
    
    mockGetRecentActivities.mockResolvedValue({
      activities: mockActivities,
      error: null
    });
    
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
    expect(mockGetRecentActivities).not.toHaveBeenCalled();
  });

  it('should not create loops when loading state changes', async () => {
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
    
    mockGetRecentActivities.mockResolvedValue({
      activities: mockActivities,
      error: null
    });
    
    mockExecute.mockResolvedValue(mockActivities);
    mockExecuteWithErrorHandling.mockResolvedValue(mockActivities);

    const { result, rerender } = renderHook(() => useSimpleActivityFeed(10));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.activities).toEqual(mockActivities);
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
    expect(mockGetRecentActivities).not.toHaveBeenCalled();
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
});