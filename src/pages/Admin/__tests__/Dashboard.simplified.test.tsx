import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';

// Mock the simplified hooks
vi.mock('@/hooks/useSimpleDashboardMetrics', () => ({
  useSimpleDashboardMetrics: vi.fn()
}));

vi.mock('@/hooks/useSimpleActivityFeed', () => ({
  useSimpleActivityFeed: vi.fn()
}));

// Mock other components
vi.mock('@/components/Layout/AdminPortalLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>
}));

vi.mock('@/components/ErrorBoundary/AdminErrorBoundary', () => ({
  AdminErrorBoundary: ({ children, section }: { children: React.ReactNode; section: string }) => (
    <div data-testid={`error-boundary-${section}`}>{children}</div>
  )
}));

vi.mock('@/components/Admin/Dashboard/DashboardPreferences', () => ({
  default: () => <div data-testid="dashboard-preferences">Preferences</div>,
  defaultPreferences: [
    { id: 'metrics', enabled: true },
    { id: 'totalArticles', enabled: true },
    { id: 'articleViews', enabled: true },
    { id: 'comments', enabled: true },
    { id: 'engagementRate', enabled: true },
    { id: 'activityFeed', enabled: true },
    { id: 'recentArticles', enabled: true }
  ]
}));

vi.mock('@/components/Admin/Dashboard/QuickActions', () => ({
  default: ({ pendingArticles, pendingComments, pendingInvitations }: any) => (
    <div data-testid="quick-actions">
      Quick Actions: {pendingArticles} articles, {pendingComments} comments, {pendingInvitations} invitations
    </div>
  )
}));

describe('Dashboard - Simplified Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useSimpleDashboardMetrics } = await import('@/hooks/useSimpleDashboardMetrics');
    const { useSimpleActivityFeed } = await import('@/hooks/useSimpleActivityFeed');
    
    vi.mocked(useSimpleDashboardMetrics).mockReturnValue({
      metrics: {
        totalArticles: 10,
        articleViews: 150,
        commentCount: 25,
        pendingArticles: 2,
        pendingComments: 1,
        pendingInvitations: 3,
        recentArticles: [
          { id: '1', title: 'Test Article 1', status: 'published', lastEdited: '2024-01-01' },
          { id: '2', title: 'Test Article 2', status: 'draft', lastEdited: '2024-01-02' }
        ]
      },
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    vi.mocked(useSimpleActivityFeed).mockReturnValue({
      activities: [
        { id: '1', type: 'article', description: 'New article published', timestamp: '2024-01-01T10:00:00Z' },
        { id: '2', type: 'comment', description: 'New comment added', timestamp: '2024-01-01T11:00:00Z' }
      ],
      loading: false,
      error: null,
      refresh: vi.fn()
    });
  });

  it('renders dashboard with simplified structure', async () => {
    render(<Dashboard />);

    // Check main dashboard elements
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to The Flying Bus author portal/)).toBeInTheDocument();
    
    // Check that error boundaries are present
    expect(screen.getByTestId('error-boundary-quick actions')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-dashboard metrics')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-activity feed')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-recent articles')).toBeInTheDocument();
  });

  it('uses simplified hooks without circular dependencies', async () => {
    render(<Dashboard />);

    const { useSimpleDashboardMetrics } = await import('@/hooks/useSimpleDashboardMetrics');
    const { useSimpleActivityFeed } = await import('@/hooks/useSimpleActivityFeed');

    // Verify the simplified hooks are called
    expect(vi.mocked(useSimpleDashboardMetrics)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(useSimpleActivityFeed)).toHaveBeenCalledWith(10);
  });

  it('renders without infinite loops', () => {
    // This test verifies that the component can render without causing infinite loops
    const { container } = render(<Dashboard />);
    expect(container).toBeInTheDocument();
  });
});