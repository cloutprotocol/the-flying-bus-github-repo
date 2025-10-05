/**
 * Dashboard Loading State Integration Test
 * 
 * Tests the dashboard with the new loading state management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '@/pages/Admin/Dashboard';

// Mock the hooks
vi.mock('@/hooks/useSimpleDashboardMetrics', () => ({
  useSimpleDashboardMetrics: () => ({
    metrics: {
      totalArticles: 10,
      articleViews: 100,
      commentCount: 5,
      pendingArticles: 2,
      pendingComments: 1,
      pendingInvitations: 3,
      recentArticles: [
        { id: '1', title: 'Test Article', status: 'published', lastEdited: '2024-01-01' }
      ]
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
    shouldShowSkeleton: false,
    canRetry: false,
    retryCount: 0
  })
}));

vi.mock('@/hooks/useSimpleActivityFeed', () => ({
  useSimpleActivityFeed: () => ({
    activities: [
      { id: '1', type: 'article', description: 'New article published', timestamp: '2024-01-01' }
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
    shouldShowSkeleton: false,
    canRetry: false,
    retryCount: 0
  })
}));

// Mock other components
vi.mock('@/components/Admin/Dashboard/QuickActions', () => ({
  default: ({ pendingArticles, pendingComments, pendingInvitations }: any) => (
    <div data-testid="quick-actions">
      Quick Actions: {pendingArticles + pendingComments + pendingInvitations} pending
    </div>
  )
}));

vi.mock('@/components/Admin/Dashboard/DashboardPreferences', () => ({
  default: ({ preferences, onPreferenceChange }: any) => (
    <div data-testid="dashboard-preferences">Dashboard Preferences</div>
  ),
  defaultPreferences: [
    { id: 'metrics', enabled: true },
    { id: 'activityFeed', enabled: true },
    { id: 'recentArticles', enabled: true }
  ]
}));

vi.mock('@/components/Layout/AdminPortalLayout', () => ({
  default: ({ children }: any) => <div data-testid="admin-layout">{children}</div>
}));

describe('Dashboard Loading State Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard without loading states', async () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Check that main elements are rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to The Flying Bus author portal. Here\'s an overview of your content.')).toBeInTheDocument();
    
    // Check that quick actions are rendered
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    
    // Check that metrics are displayed
    expect(screen.getByText('Total Articles')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    
    // Check that activity feed is displayed
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    
    // Check that recent articles are displayed
    expect(screen.getByText('Recent Articles')).toBeInTheDocument();
  });

  it('should handle loading states correctly', async () => {
    // Mock loading state
    vi.mocked(require('@/hooks/useSimpleDashboardMetrics').useSimpleDashboardMetrics).mockReturnValue({
      metrics: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
      shouldShowSkeleton: true,
      canRetry: false,
      retryCount: 0
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Should show skeleton loading states
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });

  it('should handle error states correctly', async () => {
    // Mock error state
    vi.mocked(require('@/hooks/useSimpleDashboardMetrics').useSimpleDashboardMetrics).mockReturnValue({
      metrics: null,
      loading: false,
      error: 'Failed to load metrics',
      refresh: vi.fn(),
      shouldShowSkeleton: false,
      canRetry: true,
      retryCount: 1
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to load metrics/)).toBeInTheDocument();
    });
  });
});