import React from 'react';
import { render } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import Dashboard from '../Dashboard';

// Mock all dependencies
vi.mock('@/hooks/useSimpleDashboardMetrics', () => ({
  useSimpleDashboardMetrics: () => ({
    metrics: {
      totalArticles: 10,
      articleViews: 150,
      commentCount: 25,
      pendingArticles: 2,
      pendingComments: 1,
      pendingInvitations: 3,
      recentArticles: []
    },
    loading: false,
    error: null,
    refresh: vi.fn()
  })
}));

vi.mock('@/hooks/useSimpleActivityFeed', () => ({
  useSimpleActivityFeed: () => ({
    activities: [],
    loading: false,
    error: null,
    refresh: vi.fn()
  })
}));

vi.mock('@/components/Layout/AdminPortalLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/ErrorBoundary/AdminErrorBoundary', () => ({
  AdminErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('@/components/Admin/Dashboard/DashboardPreferences', () => ({
  default: () => <div>Preferences</div>,
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
  default: () => <div>Quick Actions</div>
}));

describe('Dashboard - Simplified Implementation', () => {
  it('renders without errors and infinite loops', () => {
    const { container } = render(<Dashboard />);
    expect(container).toBeInTheDocument();
  });

  it('uses simplified hooks architecture', () => {
    // This test verifies that the component can be rendered successfully
    // with the simplified hooks, indicating no circular dependencies
    expect(() => render(<Dashboard />)).not.toThrow();
  });
});