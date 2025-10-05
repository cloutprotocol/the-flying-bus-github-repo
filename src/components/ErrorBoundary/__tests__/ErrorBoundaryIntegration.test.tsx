import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  AdminDashboardErrorProvider,
  MetricsErrorBoundary,
  ActivitiesErrorBoundary,
  ArticlesErrorBoundary 
} from '../index';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = true, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Component loaded successfully</div>;
};

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('Error Boundary Integration', () => {
  it('renders multiple error boundaries independently', () => {
    render(
      <AdminDashboardErrorProvider>
        <div>
          <MetricsErrorBoundary>
            <ThrowError message="Metrics error" />
          </MetricsErrorBoundary>
          
          <ActivitiesErrorBoundary>
            <ThrowError message="Activities error" />
          </ActivitiesErrorBoundary>
          
          <div>
            <ThrowError shouldThrow={false} />
          </div>
        </div>
      </AdminDashboardErrorProvider>
    );

    // Metrics section should show error
    expect(screen.getByText('Dashboard Metrics')).toBeInTheDocument();
    expect(screen.getByText('Unable to load dashboard statistics')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return content.includes('Metrics error');
    })).toBeInTheDocument();

    // Activities section should show error
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Unable to load activity feed')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return content.includes('Activities error');
    })).toBeInTheDocument();

    // Articles section should load successfully (no error boundary needed)
    expect(screen.getByText('Component loaded successfully')).toBeInTheDocument();
  });

  it('provides retry functionality for each section', () => {
    render(
      <AdminDashboardErrorProvider>
        <div>
          <MetricsErrorBoundary>
            <ThrowError />
          </MetricsErrorBoundary>
          
          <ActivitiesErrorBoundary>
            <ThrowError />
          </ActivitiesErrorBoundary>
        </div>
      </AdminDashboardErrorProvider>
    );

    // Both sections should have retry buttons
    const retryButtons = screen.getAllByText('Retry Loading');
    expect(retryButtons).toHaveLength(2);

    // Clicking retry buttons should not throw errors
    retryButtons.forEach(button => {
      fireEvent.click(button);
    });

    // Buttons should still be present after clicking
    expect(screen.getAllByText('Retry Loading')).toHaveLength(2);
  });

  it('isolates errors between sections', () => {
    render(
      <AdminDashboardErrorProvider>
        <div>
          <MetricsErrorBoundary>
            <ThrowError />
          </MetricsErrorBoundary>
          
          <ActivitiesErrorBoundary>
            <div>Activities working fine</div>
          </ActivitiesErrorBoundary>
        </div>
      </AdminDashboardErrorProvider>
    );

    // Metrics should show error
    expect(screen.getByText('Dashboard Metrics')).toBeInTheDocument();
    expect(screen.getByText('Unable to load dashboard statistics')).toBeInTheDocument();

    // Activities should work normally
    expect(screen.getByText('Activities working fine')).toBeInTheDocument();
  });

  it('handles nested error boundaries correctly', () => {
    render(
      <AdminDashboardErrorProvider>
        <MetricsErrorBoundary>
          <div>
            <h2>Metrics Section</h2>
            <ActivitiesErrorBoundary>
              <ThrowError message="Nested error" />
            </ActivitiesErrorBoundary>
          </div>
        </MetricsErrorBoundary>
      </AdminDashboardErrorProvider>
    );

    // Inner error boundary should catch the error
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Unable to load activity feed')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return content.includes('Nested error');
    })).toBeInTheDocument();

    // Outer section should still render its non-error content
    expect(screen.getByText('Metrics Section')).toBeInTheDocument();
  });

  it('provides consistent error styling across sections', () => {
    render(
      <AdminDashboardErrorProvider>
        <div>
          <MetricsErrorBoundary>
            <ThrowError />
          </MetricsErrorBoundary>
          
          <ActivitiesErrorBoundary>
            <ThrowError />
          </ActivitiesErrorBoundary>
          
          <ArticlesErrorBoundary>
            <ThrowError />
          </ArticlesErrorBoundary>
        </div>
      </AdminDashboardErrorProvider>
    );

    // All sections should have consistent error container styling
    const errorContainers = screen.getAllByText('Retry Loading').map(
      button => button.closest('.p-6')
    );
    
    expect(errorContainers).toHaveLength(3);
    errorContainers.forEach(container => {
      expect(container).toHaveClass('p-6', 'border', 'border-gray-200', 'rounded-lg', 'bg-gray-50');
    });
  });

  it('logs errors with proper context', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AdminDashboardErrorProvider>
        <MetricsErrorBoundary>
          <ThrowError message="Metrics failure" />
        </MetricsErrorBoundary>
      </AdminDashboardErrorProvider>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Admin Dashboard Error in metrics:'),
      expect.any(Error),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });
});