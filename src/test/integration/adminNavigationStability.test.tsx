import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
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

// Mock admin pages
const MockArticlesPage = () => {
  const navigate = useNavigate();
  return (
    <div data-testid="articles-page">
      <h1>Articles Management</h1>
      <button onClick={() => navigate('/admin/dashboard')} data-testid="nav-to-dashboard">
        Back to Dashboard
      </button>
    </div>
  );
};

const MockCommentsPage = () => {
  const navigate = useNavigate();
  return (
    <div data-testid="comments-page">
      <h1>Comments Management</h1>
      <button onClick={() => navigate('/admin/dashboard')} data-testid="nav-to-dashboard">
        Back to Dashboard
      </button>
    </div>
  );
};

const MockInvitationsPage = () => {
  const navigate = useNavigate();
  return (
    <div data-testid="invitations-page">
      <h1>Invitations Management</h1>
      <button onClick={() => navigate('/admin/dashboard')} data-testid="nav-to-dashboard">
        Back to Dashboard
      </button>
    </div>
  );
};

// Mock UI components
vi.mock('@/components/Layout/AdminPortalLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    return (
      <div data-testid="admin-layout">
        <nav data-testid="admin-nav">
          <button onClick={() => navigate('/admin/dashboard')} data-testid="nav-dashboard">
            Dashboard
          </button>
          <button onClick={() => navigate('/admin/articles')} data-testid="nav-articles">
            Articles
          </button>
          <button onClick={() => navigate('/admin/comments')} data-testid="nav-comments">
            Comments
          </button>
          <button onClick={() => navigate('/admin/invitations')} data-testid="nav-invitations">
            Invitations
          </button>
        </nav>
        <main data-testid="admin-content">
          {children}
        </main>
      </div>
    );
  }
}));

vi.mock('@/components/ErrorBoundary/AdminErrorBoundary', () => ({
  AdminErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
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
  default: ({ pendingArticles, pendingComments, pendingInvitations }: any) => {
    const navigate = useNavigate();
    return (
      <div data-testid="quick-actions">
        <button 
          onClick={() => navigate('/admin/articles')} 
          data-testid="quick-action-articles"
        >
          Create Article ({pendingArticles} pending)
        </button>
        <button 
          onClick={() => navigate('/admin/comments')} 
          data-testid="quick-action-comments"
        >
          Manage Comments ({pendingComments} pending)
        </button>
        <button 
          onClick={() => navigate('/admin/invitations')} 
          data-testid="quick-action-invitations"
        >
          Manage Invitations ({pendingInvitations} pending)
        </button>
      </div>
    );
  }
}));

vi.mock('@/components/Common/SkeletonLoaders', () => ({
  MetricsGridSkeleton: () => <div data-testid="metrics-skeleton">Loading metrics...</div>,
  ActivityFeedSkeleton: () => <div data-testid="activity-skeleton">Loading activities...</div>,
  RecentArticlesSkeleton: () => <div data-testid="articles-skeleton">Loading articles...</div>,
  DashboardSectionSkeleton: ({ children }: { children: React.ReactNode }) => <div data-testid="section-skeleton">{children}</div>,
  QuickActionsSkeleton: () => <div data-testid="quick-actions-skeleton">Loading quick actions...</div>
}));

vi.mock('@/components/Admin/ErrorDisplay/AdminSectionErrorDisplay', () => ({
  AdminSectionErrorDisplay: ({ errorState }: any) => (
    <div data-testid="section-error">Error: {errorState?.message || 'Unknown error'}</div>
  ),
  AdminSectionGracefulDegradation: ({ sectionName, fallbackContent }: any) => (
    <div data-testid="graceful-degradation">
      <span>Section: {sectionName}</span>
      {fallbackContent}
    </div>
  )
}));

describe('Admin Navigation Stability Tests', () => {
  const mockSupabaseFrom = vi.fn();
  const mockGetRecentActivities = vi.fn();
  const mockExecute = vi.fn();
  const mockExecuteWithErrorHandling = vi.fn();
  const mockRetryOperation = vi.fn();

  const setupMocks = (options: {
    loading?: boolean;
    error?: boolean;
  } = {}) => {
    const { loading = false, error = false } = options;

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
        isLoading: loading,
        error: error ? 'Test error' : null,
        shouldShowSkeleton: loading
      },
      execute: mockExecute
    });

    // Mock error handling hooks
    const { useAdminActivityErrorHandling, useAdminMetricsErrorHandling } = require('@/hooks/useAdminErrorHandling');
    const errorHandlingReturn = {
      executeWithErrorHandling: mockExecuteWithErrorHandling,
      retryOperation: mockRetryOperation,
      canRetry: false,
      hasError: error,
      isRetrying: false,
      errorState: error ? { message: 'Test error', retryCount: 0 } : null
    };
    
    vi.mocked(useAdminActivityErrorHandling).mockReturnValue(errorHandlingReturn);
    vi.mocked(useAdminMetricsErrorHandling).mockReturnValue(errorHandlingReturn);

    if (!error) {
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
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderAdminApp = (initialRoute = '/admin/dashboard') => {
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/articles" element={<MockArticlesPage />} />
          <Route path="/admin/comments" element={<MockCommentsPage />} />
          <Route path="/admin/invitations" element={<MockInvitationsPage />} />
        </Routes>
      </BrowserRouter>
    );
  };

  it('should navigate between admin pages without interference', async () => {
    renderAdminApp();

    // Start on dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // Metrics loaded
    });

    // Navigate to articles page
    fireEvent.click(screen.getByTestId('nav-articles'));

    await waitFor(() => {
      expect(screen.getByTestId('articles-page')).toBeInTheDocument();
      expect(screen.getByText('Articles Management')).toBeInTheDocument();
    });

    // Navigate back to dashboard
    fireEvent.click(screen.getByTestId('nav-to-dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Dashboard should load fresh data without interference
    expect(mockExecuteWithErrorHandling).toHaveBeenCalledTimes(4); // 2 initial + 2 after navigation back
  });

  it('should handle quick action navigation correctly', async () => {
    renderAdminApp();

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    });

    // Click quick action for articles
    fireEvent.click(screen.getByTestId('quick-action-articles'));

    await waitFor(() => {
      expect(screen.getByTestId('articles-page')).toBeInTheDocument();
    });

    // Navigate back to dashboard
    fireEvent.click(screen.getByTestId('nav-to-dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Quick actions should still work
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
  });

  it('should maintain dashboard state during navigation', async () => {
    renderAdminApp();

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    const initialCallCount = mockExecuteWithErrorHandling.mock.calls.length;

    // Navigate to comments page
    fireEvent.click(screen.getByTestId('nav-comments'));

    await waitFor(() => {
      expect(screen.getByTestId('comments-page')).toBeInTheDocument();
    });

    // Navigate back to dashboard
    fireEvent.click(screen.getByTestId('nav-to-dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Should reload dashboard data
    expect(mockExecuteWithErrorHandling.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('should handle navigation during loading states', async () => {
    setupMocks({ loading: true });

    renderAdminApp();

    // Should show loading state
    expect(screen.getByTestId('quick-actions-skeleton')).toBeInTheDocument();

    // Navigate away during loading
    fireEvent.click(screen.getByTestId('nav-articles'));

    await waitFor(() => {
      expect(screen.getByTestId('articles-page')).toBeInTheDocument();
    });

    // Navigate back
    fireEvent.click(screen.getByTestId('nav-to-dashboard'));

    // Should start fresh loading
    setupMocks({ loading: false });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('should handle navigation during error states', async () => {
    setupMocks({ error: true });

    renderAdminApp();

    // Should show error state
    await waitFor(() => {
      expect(screen.getByTestId('graceful-degradation')).toBeInTheDocument();
    });

    // Navigate away during error
    fireEvent.click(screen.getByTestId('nav-invitations'));

    await waitFor(() => {
      expect(screen.getByTestId('invitations-page')).toBeInTheDocument();
    });

    // Navigate back
    fireEvent.click(screen.getByTestId('nav-to-dashboard'));

    // Should attempt to load fresh data
    setupMocks({ error: false });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('should prevent data loading interference between pages', async () => {
    renderAdminApp();

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    // Clear call counts
    vi.clearAllMocks();

    // Navigate to articles
    fireEvent.click(screen.getByTestId('nav-articles'));

    await waitFor(() => {
      expect(screen.getByTestId('articles-page')).toBeInTheDocument();
    });

    // Should not trigger dashboard data loading while on articles page
    expect(mockExecuteWithErrorHandling).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();

    // Navigate to comments
    fireEvent.click(screen.getByTestId('nav-comments'));

    await waitFor(() => {
      expect(screen.getByTestId('comments-page')).toBeInTheDocument();
    });

    // Still should not trigger dashboard data loading
    expect(mockExecuteWithErrorHandling).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('should handle rapid navigation without creating loops', async () => {
    renderAdminApp();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Perform rapid navigation
    fireEvent.click(screen.getByTestId('nav-articles'));
    fireEvent.click(screen.getByTestId('nav-comments'));
    fireEvent.click(screen.getByTestId('nav-invitations'));
    fireEvent.click(screen.getByTestId('nav-dashboard'));

    // Should end up on dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Should not create excessive API calls
    const totalCalls = mockExecuteWithErrorHandling.mock.calls.length;
    expect(totalCalls).toBeLessThan(10); // Reasonable limit for rapid navigation
  });

  it('should maintain error boundaries during navigation', async () => {
    renderAdminApp();

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getAllByTestId('error-boundary')).toHaveLength(4);
    });

    // Navigate away
    fireEvent.click(screen.getByTestId('nav-articles'));

    await waitFor(() => {
      expect(screen.getByTestId('articles-page')).toBeInTheDocument();
    });

    // Navigate back
    fireEvent.click(screen.getByTestId('nav-to-dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Error boundaries should be restored
    expect(screen.getAllByTestId('error-boundary')).toHaveLength(4);
  });

  it('should handle browser back/forward navigation', async () => {
    renderAdminApp();

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Navigate to articles
    fireEvent.click(screen.getByTestId('nav-articles'));

    await waitFor(() => {
      expect(screen.getByTestId('articles-page')).toBeInTheDocument();
    });

    // Simulate browser back button
    window.history.back();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Should reload dashboard properly
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });

  it('should clean up resources when navigating away from dashboard', async () => {
    renderAdminApp();

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    const initialCallCount = mockExecuteWithErrorHandling.mock.calls.length;

    // Navigate away
    fireEvent.click(screen.getByTestId('nav-articles'));

    await waitFor(() => {
      expect(screen.getByTestId('articles-page')).toBeInTheDocument();
    });

    // Wait to ensure no additional calls after navigation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not continue making calls after navigation
    expect(mockExecuteWithErrorHandling.mock.calls.length).toBe(initialCallCount);
  });

  it('should handle navigation with pending requests', async () => {
    // Setup slow loading
    mockExecute.mockImplementation(async (fn) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return await fn();
    });

    renderAdminApp();

    // Start loading dashboard
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();

    // Navigate away before loading completes
    fireEvent.click(screen.getByTestId('nav-articles'));

    await waitFor(() => {
      expect(screen.getByTestId('articles-page')).toBeInTheDocument();
    });

    // Navigate back
    fireEvent.click(screen.getByTestId('nav-to-dashboard'));

    // Should handle the navigation gracefully
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('should preserve navigation state across page reloads', async () => {
    renderAdminApp('/admin/articles');

    // Should start on articles page
    await waitFor(() => {
      expect(screen.getByTestId('articles-page')).toBeInTheDocument();
    });

    // Navigate to dashboard
    fireEvent.click(screen.getByTestId('nav-to-dashboard'));

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    // Dashboard should load normally
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });
});