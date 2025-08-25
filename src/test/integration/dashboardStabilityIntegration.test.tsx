import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '@/pages/Admin/Dashboard';

// Mock all external dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('@/services/activityService', () => ({
  getRecentActivities: vi.fn()
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
  useAdminActivityErrorHandling: vi.fn(),
  useAdminMetricsErrorHandling: vi.fn()
}));

// Mock UI components to focus on logic
vi.mock('@/components/Layout/AdminPortalLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>
}));

vi.mock('@/components/ErrorBoundary/AdminErrorBoundary', () => ({
  AdminErrorBoundary: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>
}));

vi.mock('@/components/Admin/Dashboard/DashboardPreferences', () => ({
  default: () => <div data-testid="dashboard-preferences">Preferences</div>,
  defaultPreferences: [
    { id: 'metrics', name: 'Metrics', enabled: true },
    { id: 'activityFeed', name: 'Activity Feed', enabled: true },
    { id: 'recentArticles', name: 'Recent Articles', enabled: true }
  ]
}));

vi.mock('@/components/Admin/Dashboard/QuickActions', () => ({
  default: () => <div data-testid="quick-actions">Quick Actions</div>
}));

vi.mock('@/components/Common/SkeletonLoaders', () => ({
  MetricsGridSkeleton: () => <div data-testid="metrics-skeleton">Loading metrics...</div>,
  ActivityFeedSkeleton: () => <div data-testid="activity-skeleton">Loading activities...</div>,
  RecentArticlesSkeleton: () => <div data-testid="articles-skeleton">Loading articles...</div>,
  DashboardSectionSkeleton: ({ children }: { children: React.ReactNode }) => <div data-testid="section-skeleton">{children}</div>,
  QuickActionsSkeleton: () => <div data-testid="quick-actions-skeleton">Loading quick actions...</div>
}));

vi.mock('@/components/Admin/ErrorDisplay/AdminSectionErrorDisplay', () => ({
  AdminSectionErrorDisplay: ({ errorState, onRetry }: any) => (
    <div data-testid="section-error">
      <span>Error: {errorState?.message || 'Unknown error'}</span>
      <button onClick={onRetry} data-testid="retry-button">Retry</button>
    </div>
  ),
  AdminSectionGracefulDegradation: ({ sectionName, onRetry, fallbackContent }: any) => (
    <div data-testid="graceful-degradation">
      <span>Section: {sectionName}</span>
      <button onClick={onRetry} data-testid="graceful-retry">Retry</button>
      {fallbackContent}
    </div>
  )
}));

describe('Dashboard Stability Integration Tests', () => {
  const mockSupabaseFrom = vi.fn();
  const mockGetRecentActivities = vi.fn();
  const mockExecute = vi.fn();
  const mockExecuteWithErrorHandling = vi.fn();
  const mockRetryOperation = vi.fn();

  const setupMocks = (options: {
    metricsLoading?: boolean;
    metricsError?: string | null;
    activitiesLoading?: boolean;
    activitiesError?: string | null;
    hasError?: boolean;
    canRetry?: boolean;
  } = {}) => {
    const {
      metricsLoading = false,
      metricsError = null,
      activitiesLoading = false,
      activitiesError = null,
      hasError = false,
      canRetry = false
    } = options;

    // Mock Supabase client
    const { supabase } = require('@/integrations/supabase/client');
    vi.mocked(supabase.from).mockImplementation(mockSupabaseFrom);

    // Mock activity service
    const { getRecentActivities } = require('@/services/activityService');
    vi.mocked(getRecentActivities).mockImplementation(mockGetRecentActivities);

    // Mock loading state hook
    const { useDashboardLoadingState } = require('@/hooks/useSimpleLoadingState');
    vi.mocked(useDashboardLoadingState).mockReturnValue({
      state: {
        isLoading: metricsLoading || activitiesLoading,
        error: metricsError || activitiesError,
        shouldShowSkeleton: metricsLoading || activitiesLoading
      },
      execute: mockExecute
    });

    // Mock error handling hooks
    const { useAdminActivityErrorHandling, useAdminMetricsErrorHandling } = require('@/hooks/useAdminErrorHandling');
    const errorHandlingReturn = {
      executeWithErrorHandling: mockExecuteWithErrorHandling,
      retryOperation: mockRetryOperation,
      canRetry,
      hasError,
      isRetrying: false,
      errorState: hasError ? { message: 'Test error', retryCount: 1 } : null
    };
    
    vi.mocked(useAdminActivityErrorHandling).mockReturnValue(errorHandlingReturn);
    vi.mocked(useAdminMetricsErrorHandling).mockReturnValue(errorHandlingReturn);

    // Setup successful Supabase queries
    const mockSelect = vi.fn();
    const mockIn = vi.fn();
    const mockEq = vi.fn();
    const mockOrder = vi.fn();
    const mockLimit = vi.fn();

    mockSelect.mockReturnValue({
      in: mockIn,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit
    });

    mockIn.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq });
    mockOrder.mockReturnValue({ limit: mockLimit });

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

    mockSupabaseFrom.mockReturnValue({ select: mockSelect });

    // Mock successful data
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

    const mockActivities = [
      { id: '1', type: 'article', description: 'New article published', timestamp: '2024-01-01' }
    ];

    mockGetRecentActivities.mockResolvedValue({
      activities: mockActivities,
      error: null
    });

    mockExecute.mockResolvedValue(mockMetrics);
    mockExecuteWithErrorHandling.mockResolvedValue(mockMetrics);
    mockRetryOperation.mockResolvedValue(mockMetrics);

    return { mockMetrics, mockActivities };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  it('should load dashboard without infinite loops', async () => {
    const { mockMetrics, mockActivities } = setupMocks();

    renderDashboard();

    // Verify initial render
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // Total articles
    });

    // Verify hooks were called only once (no infinite loops)
    expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(2); // Once for metrics, once for activities
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockGetRecentActivities).toHaveBeenCalledTimes(1);
    expect(mockSupabaseFrom).toHaveBeenCalledTimes(6); // 6 parallel queries for metrics
  });

  it('should handle loading states without flashing', async () => {
    setupMocks({ metricsLoading: true, activitiesLoading: true });

    renderDashboard();

    // Should show skeleton loaders
    expect(screen.getByTestId('quick-actions-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('activity-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('articles-skeleton')).toBeInTheDocument();

    // Should not show actual content while loading
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });

  it('should handle error states gracefully without loops', async () => {
    setupMocks({ hasError: true, canRetry: true });

    renderDashboard();

    // Should show graceful degradation
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Should show retry buttons
    expect(screen.getByTestId('graceful-retry')).toBeInTheDocument();

    // Verify error handling was called
    expect(mockExecuteWithErrorHandling).toHaveBeenCalled();
  });

  it('should handle manual refresh without creating loops', async () => {
    const { mockMetrics } = setupMocks();

    renderDashboard();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // Clear call counts
    vi.clearAllMocks();
    setupMocks(); // Reset mocks

    // Find and click refresh button
    const refreshButtons = screen.getAllByText('Refresh');
    expect(refreshButtons.length).toBeGreaterThan(0);

    fireEvent.click(refreshButtons[0]);

    // Wait for refresh to complete
    await waitFor(() => {
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
    });

    // Verify only one refresh call was made
    expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it('should handle retry operations without creating loops', async () => {
    setupMocks({ hasError: true, canRetry: true });

    renderDashboard();

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Clear call counts
    vi.clearAllMocks();

    // Click retry button
    const retryButton = screen.getByTestId('graceful-retry');
    fireEvent.click(retryButton);

    // Wait for retry to complete
    await waitFor(() => {
      expect(mockRetryOperation).toHaveBeenCalledTimes(1);
    });

    // Verify only one retry call was made
    expect(mockRetryOperation).toHaveBeenCalledTimes(1);
  });

  it('should maintain stable component structure during re-renders', async () => {
    const { mockMetrics } = setupMocks();

    const { rerender } = renderDashboard();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // Get initial structure
    const initialLayout = screen.getByTestId('admin-layout');
    const initialErrorBoundaries = screen.getAllByTestId('error-boundary');

    // Force re-render
    rerender(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Verify structure remains stable
    expect(screen.getByTestId('admin-layout')).toBe(initialLayout);
    expect(screen.getAllByTestId('error-boundary')).toHaveLength(initialErrorBoundaries.length);
  });

  it('should handle concurrent operations without race conditions', async () => {
    const { mockMetrics } = setupMocks();

    // Add delays to simulate async operations
    mockExecute.mockImplementation(async (fn) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      return await fn();
    });

    renderDashboard();

    // Wait for all operations to complete
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Verify all operations completed successfully
    expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it('should prevent memory leaks on unmount', async () => {
    const { mockMetrics } = setupMocks();

    const { unmount } = renderDashboard();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
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

  it('should handle error boundary failures gracefully', async () => {
    setupMocks({ hasError: true });

    // Mock console.error to avoid test noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderDashboard();

    // Should still render basic structure even with errors
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Should show error boundaries
    await waitFor(() => {
      expect(screen.getAllByTestId('error-boundary')).toHaveLength(4); // 4 error boundaries in dashboard
    });

    consoleSpy.mockRestore();
  });

  it('should maintain performance under rapid state changes', async () => {
    const { mockMetrics } = setupMocks();

    const { rerender } = renderDashboard();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    const startTime = performance.now();

    // Perform rapid re-renders
    for (let i = 0; i < 10; i++) {
      rerender(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete rapid re-renders in reasonable time (less than 1 second)
    expect(duration).toBeLessThan(1000);

    // Should not trigger additional data fetches
    expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(2); // Only initial calls
  });
});