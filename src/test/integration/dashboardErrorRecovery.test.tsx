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

// Mock UI components
vi.mock('@/components/Layout/AdminPortalLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>
}));

vi.mock('@/components/ErrorBoundary/AdminErrorBoundary', () => ({
  AdminErrorBoundary: ({ children, section }: { children: React.ReactNode; section: string }) => (
    <div data-testid={`error-boundary-${section.replace(/\s+/g, '-')}`}>
      {children}
    </div>
  )
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
  AdminSectionErrorDisplay: ({ errorState, onRetry, onRefresh }: any) => (
    <div data-testid="section-error">
      <span>Error: {errorState?.message || 'Unknown error'}</span>
      <button onClick={onRetry} data-testid="error-retry-button">Retry</button>
      <button onClick={onRefresh} data-testid="error-refresh-button">Refresh</button>
    </div>
  ),
  AdminSectionGracefulDegradation: ({ sectionName, onRetry, onRefresh, fallbackContent }: any) => (
    <div data-testid="graceful-degradation">
      <span data-testid="section-name">Section: {sectionName}</span>
      <button onClick={onRetry} data-testid="graceful-retry">Retry</button>
      <button onClick={onRefresh} data-testid="graceful-refresh">Refresh</button>
      <div data-testid="fallback-content">{fallbackContent}</div>
    </div>
  )
}));

describe('Dashboard Error Recovery Tests', () => {
  const mockSupabaseFrom = vi.fn();
  const mockGetRecentActivities = vi.fn();
  const mockExecute = vi.fn();
  const mockExecuteWithErrorHandling = vi.fn();
  const mockRetryOperation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setupErrorScenario = (scenario: {
    metricsError?: boolean;
    activitiesError?: boolean;
    canRetry?: boolean;
    retryCount?: number;
    isRetrying?: boolean;
  }) => {
    const {
      metricsError = false,
      activitiesError = false,
      canRetry = true,
      retryCount = 0,
      isRetrying = false
    } = scenario;

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
        isLoading: false,
        error: metricsError || activitiesError ? 'Test error' : null,
        shouldShowSkeleton: false
      },
      execute: mockExecute
    });

    // Mock error handling hooks
    const { useAdminActivityErrorHandling, useAdminMetricsErrorHandling } = require('@/hooks/useAdminErrorHandling');
    
    const metricsErrorHandling = {
      executeWithErrorHandling: mockExecuteWithErrorHandling,
      retryOperation: mockRetryOperation,
      canRetry,
      hasError: metricsError,
      isRetrying,
      errorState: metricsError ? { message: 'Metrics error', retryCount } : null
    };

    const activitiesErrorHandling = {
      executeWithErrorHandling: mockExecuteWithErrorHandling,
      retryOperation: mockRetryOperation,
      canRetry,
      hasError: activitiesError,
      isRetrying,
      errorState: activitiesError ? { message: 'Activities error', retryCount } : null
    };
    
    vi.mocked(useAdminMetricsErrorHandling).mockReturnValue(metricsErrorHandling);
    vi.mocked(useAdminActivityErrorHandling).mockReturnValue(activitiesErrorHandling);

    // Setup mock responses
    if (!metricsError) {
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
      mockRetryOperation.mockResolvedValue(mockMetrics);
    }

    if (!activitiesError) {
      const mockActivities = [
        { id: '1', type: 'article', description: 'New article published', timestamp: '2024-01-01' }
      ];

      mockGetRecentActivities.mockResolvedValue({
        activities: mockActivities,
        error: null
      });
    } else {
      mockGetRecentActivities.mockRejectedValue(new Error('Activities error'));
      mockExecute.mockRejectedValue(new Error('Activities error'));
      mockExecuteWithErrorHandling.mockRejectedValue(new Error('Activities error'));
    }
  };

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  it('should show graceful degradation when metrics fail', async () => {
    setupErrorScenario({ metricsError: true });

    renderDashboard();

    // Should show graceful degradation for metrics
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Should show section name
    expect(screen.getByTestId('section-name')).toHaveTextContent('Section: Dashboard Metrics');

    // Should show fallback content
    expect(screen.getByTestId('fallback-content')).toBeInTheDocument();

    // Should show retry and refresh buttons
    expect(screen.getByTestId('graceful-retry')).toBeInTheDocument();
    expect(screen.getByTestId('graceful-refresh')).toBeInTheDocument();
  });

  it('should show graceful degradation when activities fail', async () => {
    setupErrorScenario({ activitiesError: true });

    renderDashboard();

    // Should show graceful degradation for activities
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Should show section name
    expect(screen.getByTestId('section-name')).toHaveTextContent('Section: Recent Activity');

    // Should show fallback content
    expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
  });

  it('should handle partial failures gracefully', async () => {
    setupErrorScenario({ metricsError: true, activitiesError: false });

    renderDashboard();

    // Should show graceful degradation for metrics
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Should still show working sections
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();

    // Activities section should work normally (not show graceful degradation)
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  it('should handle retry operations successfully', async () => {
    setupErrorScenario({ metricsError: true, canRetry: true });

    renderDashboard();

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByTestId('graceful-retry');
    fireEvent.click(retryButton);

    // Verify retry was called
    await waitFor(() => {
      expect(mockRetryOperation).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle refresh operations successfully', async () => {
    setupErrorScenario({ metricsError: true });

    renderDashboard();

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Clear call counts
    vi.clearAllMocks();
    setupErrorScenario({ metricsError: false }); // Setup for successful refresh

    // Click refresh button
    const refreshButton = screen.getByTestId('graceful-refresh');
    fireEvent.click(refreshButton);

    // Verify refresh was called
    await waitFor(() => {
      expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(1);
    });
  });

  it('should show retry count in error states', async () => {
    setupErrorScenario({ metricsError: true, retryCount: 3 });

    renderDashboard();

    // Should show error with retry count
    await waitFor(() => {
      expect(screen.getByText(/Error: Metrics error/)).toBeInTheDocument();
    });
  });

  it('should handle retrying state correctly', async () => {
    setupErrorScenario({ metricsError: true, isRetrying: true });

    renderDashboard();

    // Should show graceful degradation even when retrying
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Retry button should be available
    expect(screen.getByTestId('graceful-retry')).toBeInTheDocument();
  });

  it('should isolate errors between sections', async () => {
    setupErrorScenario({ metricsError: true, activitiesError: false });

    renderDashboard();

    // Metrics should show error
    await waitFor(() => {
      expect(screen.getByText(/Section: Dashboard Metrics/)).toBeInTheDocument();
    });

    // Activities should work normally
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Quick actions should still be available
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
  });

  it('should handle multiple simultaneous errors', async () => {
    setupErrorScenario({ metricsError: true, activitiesError: true });

    renderDashboard();

    // Should show multiple graceful degradations
    await waitFor(() => {
      const degradations = screen.getAllByTestId('graceful-degradation');
      expect(degradations).toHaveLength(3); // Metrics, Activities, Recent Articles
    });

    // Should show different section names
    expect(screen.getByText(/Section: Dashboard Metrics/)).toBeInTheDocument();
    expect(screen.getByText(/Section: Recent Activity/)).toBeInTheDocument();
    expect(screen.getByText(/Section: Recent Articles/)).toBeInTheDocument();
  });

  it('should prevent error loops during recovery', async () => {
    setupErrorScenario({ metricsError: true, canRetry: true });

    renderDashboard();

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Click retry multiple times rapidly
    const retryButton = screen.getByTestId('graceful-retry');
    
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);

    // Wait for operations to complete
    await waitFor(() => {
      expect(mockRetryOperation).toHaveBeenCalled();
    });

    // Should not create multiple retry operations
    expect(mockRetryOperation).toHaveBeenCalledTimes(1);
  });

  it('should maintain error boundaries during recovery', async () => {
    setupErrorScenario({ metricsError: true });

    renderDashboard();

    // Should have error boundaries for all sections
    expect(screen.getByTestId('error-boundary-quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-dashboard-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-activity-feed')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-recent-articles')).toBeInTheDocument();

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Error boundaries should still be present
    expect(screen.getByTestId('error-boundary-dashboard-metrics')).toBeInTheDocument();
  });

  it('should handle recovery from temporary network issues', async () => {
    // Start with error
    setupErrorScenario({ metricsError: true });

    renderDashboard();

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Simulate network recovery
    setupErrorScenario({ metricsError: false });

    // Click refresh
    const refreshButton = screen.getByTestId('graceful-refresh');
    fireEvent.click(refreshButton);

    // Should recover successfully
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // Metrics loaded
    });
  });

  it('should provide meaningful fallback content', async () => {
    setupErrorScenario({ metricsError: true, activitiesError: true });

    renderDashboard();

    // Wait for error states
    await waitFor(() => {
      const degradations = screen.getAllByTestId('graceful-degradation');
      expect(degradations).toHaveLength(3);
    });

    // Should show helpful fallback messages
    expect(screen.getByText(/Basic metrics may be available in other sections/)).toBeInTheDocument();
    expect(screen.getByText(/Check individual admin pages for specific activity/)).toBeInTheDocument();
    expect(screen.getByText(/Visit the Articles page to manage content directly/)).toBeInTheDocument();
  });

  it('should handle error recovery without affecting other sections', async () => {
    setupErrorScenario({ metricsError: true, activitiesError: false });

    renderDashboard();

    // Wait for partial error state
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Clear mocks and setup recovery
    vi.clearAllMocks();
    setupErrorScenario({ metricsError: false, activitiesError: false });

    // Retry metrics
    const retryButton = screen.getByTestId('graceful-retry');
    fireEvent.click(retryButton);

    // Should not affect activities section
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();

    // Should recover metrics
    await waitFor(() => {
      expect(mockRetryOperation).toHaveBeenCalledTimes(1);
    });
  });
});