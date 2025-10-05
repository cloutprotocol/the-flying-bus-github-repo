import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '@/pages/Admin/Dashboard';
import { adminErrorHandler } from '@/services/adminErrorHandlingService';

// Mock the hooks
vi.mock('@/hooks/useSimpleDashboardMetrics', () => ({
  useSimpleDashboardMetrics: () => ({
    metrics: null,
    loading: false,
    error: 'Failed to load metrics',
    refresh: vi.fn(),
    shouldShowSkeleton: false,
    canRetry: true,
    retryCount: 1,
    hasError: true,
    isRetrying: false,
    errorState: {
      hasError: true,
      error: {
        title: 'Metrics Unavailable',
        message: 'Unable to load dashboard metrics at this time.',
        details: 'Network connection failed',
        nextSteps: [
          'Try refreshing the metrics section',
          'Check back in a few minutes',
          'Other dashboard sections may still work'
        ],
        retryable: true,
        retryLabel: 'Reload Metrics'
      },
      section: 'dashboard-metrics',
      timestamp: Date.now(),
      retryCount: 1,
      canRetry: true,
      isRetrying: false
    },
    manualRefresh: vi.fn()
  })
}));

vi.mock('@/hooks/useSimpleActivityFeed', () => ({
  useSimpleActivityFeed: () => ({
    activities: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    shouldShowSkeleton: false,
    canRetry: false,
    retryCount: 0,
    hasError: false,
    isRetrying: false,
    errorState: null,
    manualRefresh: vi.fn()
  })
}));

// Mock admin portal layout
vi.mock('@/components/Layout/AdminPortalLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>
}));

// Mock dashboard preferences
vi.mock('@/components/Admin/Dashboard/DashboardPreferences', () => ({
  default: () => <div data-testid="dashboard-preferences">Preferences</div>,
  defaultPreferences: [
    { id: 'metrics', label: 'Metrics', enabled: true },
    { id: 'activityFeed', label: 'Activity Feed', enabled: true },
    { id: 'recentArticles', label: 'Recent Articles', enabled: true }
  ]
}));

// Mock quick actions
vi.mock('@/components/Admin/Dashboard/QuickActions', () => ({
  default: () => <div data-testid="quick-actions">Quick Actions</div>
}));

describe('Admin Dashboard Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display user-friendly error messages', async () => {
    render(<Dashboard />);

    // Should show the error message for metrics section
    expect(screen.getByText('Metrics Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Unable to load dashboard metrics at this time.')).toBeInTheDocument();
  });

  it('should show graceful degradation when section fails', async () => {
    render(<Dashboard />);

    // Should show graceful degradation message
    expect(screen.getByText('Dashboard Metrics Unavailable')).toBeInTheDocument();
    expect(screen.getByText('This section is temporarily unavailable, but other parts of the dashboard are still working.')).toBeInTheDocument();
  });

  it('should provide retry functionality', async () => {
    render(<Dashboard />);

    // Should show retry button
    const retryButton = screen.getByText('Reload Metrics');
    expect(retryButton).toBeInTheDocument();
    
    // Should be clickable
    expect(retryButton).not.toBeDisabled();
  });

  it('should show next steps for error recovery', async () => {
    render(<Dashboard />);

    // Should show next steps
    expect(screen.getByText('Try refreshing the metrics section')).toBeInTheDocument();
    expect(screen.getByText('Check back in a few minutes')).toBeInTheDocument();
    expect(screen.getByText('Other dashboard sections may still work')).toBeInTheDocument();
  });

  it('should display retry count', async () => {
    render(<Dashboard />);

    // Should show retry count in button
    const retryButton = screen.getByText(/Retry.*\(1\)/);
    expect(retryButton).toBeInTheDocument();
  });

  it('should provide manual refresh functionality', async () => {
    render(<Dashboard />);

    // Should show refresh button
    const refreshButton = screen.getByText('Refresh Section');
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  it('should show fallback content for failed sections', async () => {
    render(<Dashboard />);

    // Should show fallback content
    expect(screen.getByText('Basic metrics may be available in other sections.')).toBeInTheDocument();
  });

  it('should not show errors repeatedly', async () => {
    render(<Dashboard />);

    // Error should be displayed once, not multiple times
    const errorMessages = screen.getAllByText('Metrics Unavailable');
    expect(errorMessages).toHaveLength(1);
  });

  it('should allow working sections to function normally', async () => {
    render(<Dashboard />);

    // Activity feed section should work normally (no error in mock)
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    
    // Should show normal refresh button for working sections
    const activityRefreshButtons = screen.getAllByText('Refresh');
    expect(activityRefreshButtons.length).toBeGreaterThan(0);
  });

  it('should handle error state management correctly', () => {
    // Test the error handler service directly
    const errorState = adminErrorHandler.handleError(
      'test-section',
      new Error('Test error'),
      {
        operation: 'test_operation',
        component: 'test-component'
      }
    );

    expect(errorState.hasError).toBe(true);
    expect(errorState.section).toBe('test-section');
    expect(errorState.canRetry).toBe(true);
    expect(errorState.retryCount).toBe(0);
  });

  it('should clear errors when requested', () => {
    // Set an error
    adminErrorHandler.handleError(
      'test-section',
      new Error('Test error'),
      { operation: 'test' }
    );

    // Clear the error
    adminErrorHandler.clearError('test-section');

    // Error should be cleared
    const errorState = adminErrorHandler.getErrorState('test-section');
    expect(errorState).toBeNull();
  });

  it('should prevent excessive retries', () => {
    const errorState1 = adminErrorHandler.handleError(
      'test-section',
      new Error('Test error'),
      { operation: 'test' },
      { maxRetries: 2 }
    );

    const errorState2 = adminErrorHandler.handleError(
      'test-section',
      new Error('Test error'),
      { operation: 'test' },
      { maxRetries: 2 }
    );

    const errorState3 = adminErrorHandler.handleError(
      'test-section',
      new Error('Test error'),
      { operation: 'test' },
      { maxRetries: 2 }
    );

    // After max retries, should not be able to retry
    expect(errorState3.canRetry).toBe(false);
    expect(errorState3.retryCount).toBe(2);
  });
});

describe('Admin Error Display Components', () => {
  it('should show technical details when requested', async () => {
    const mockErrorState = {
      hasError: true,
      error: {
        title: 'Test Error',
        message: 'Test error message',
        details: 'Technical error details',
        nextSteps: ['Step 1', 'Step 2'],
        retryable: true,
        retryLabel: 'Try Again'
      },
      section: 'test-section',
      timestamp: Date.now(),
      retryCount: 0,
      canRetry: true,
      isRetrying: false
    };

    const { AdminSectionErrorDisplay } = await import('@/components/Admin/ErrorDisplay/AdminSectionErrorDisplay');
    
    render(
      <AdminSectionErrorDisplay
        errorState={mockErrorState}
        showTechnicalDetails={true}
      />
    );

    // Should show technical details toggle
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    // Click to expand technical details
    fireEvent.click(screen.getByText('Technical Details'));
    
    // Should show technical details
    await waitFor(() => {
      expect(screen.getByText('Technical error details')).toBeInTheDocument();
    });
  });
});