import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MetricsErrorBoundary,
  ActivitiesErrorBoundary,
  ArticlesErrorBoundary
} from '../DashboardSectionErrorBoundary';
import { afterEach } from 'node:test';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Section error');
  }
  return <div>Section loaded</div>;
};

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('Dashboard Section Error Boundaries', () => {
  describe('MetricsErrorBoundary', () => {
    it('renders metrics-specific error fallback', () => {
      render(
        <MetricsErrorBoundary>
          <ThrowError />
        </MetricsErrorBoundary>
      );

      expect(screen.getByText('Dashboard Metrics')).toBeInTheDocument();
      expect(screen.getByText('Unable to load dashboard statistics')).toBeInTheDocument();
      expect(screen.getByText('Error: Section error')).toBeInTheDocument();
    });

    it('shows retry button for metrics section', () => {
      render(
        <MetricsErrorBoundary>
          <ThrowError />
        </MetricsErrorBoundary>
      );

      const retryButton = screen.getByText('Retry Loading');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      // Button should still be there after click (component will re-render)
      expect(screen.getByText('Retry Loading')).toBeInTheDocument();
    });
  });

  describe('ActivitiesErrorBoundary', () => {
    it('renders activities-specific error fallback', () => {
      render(
        <ActivitiesErrorBoundary>
          <ThrowError />
        </ActivitiesErrorBoundary>
      );

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Unable to load activity feed')).toBeInTheDocument();
      expect(screen.getByText('Error: Section error')).toBeInTheDocument();
    });

    it('renders children when no error occurs', () => {
      render(
        <ActivitiesErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ActivitiesErrorBoundary>
      );

      expect(screen.getByText('Section loaded')).toBeInTheDocument();
    });
  });

  describe('ArticlesErrorBoundary', () => {
    it('renders articles-specific error fallback', () => {
      render(
        <ArticlesErrorBoundary>
          <ThrowError />
        </ArticlesErrorBoundary>
      );

      expect(screen.getByText('Recent Articles')).toBeInTheDocument();
      expect(screen.getByText('Unable to load recent articles')).toBeInTheDocument();
      expect(screen.getByText('Error: Section error')).toBeInTheDocument();
    });

    it('has proper styling and layout', () => {
      render(
        <ArticlesErrorBoundary>
          <ThrowError />
        </ArticlesErrorBoundary>
      );

      // Check for proper CSS classes (look for the main container)
      const errorContainer = screen.getByText('Recent Articles').closest('div')?.parentElement;
      expect(errorContainer).toHaveClass('p-6', 'border', 'border-gray-200', 'rounded-lg', 'bg-gray-50');
    });
  });

  describe('Error Recovery', () => {
    it('shows retry button for error recovery', () => {
      render(
        <MetricsErrorBoundary>
          <ThrowError />
        </MetricsErrorBoundary>
      );

      expect(screen.getByText('Dashboard Metrics')).toBeInTheDocument();
      
      // Click retry should not throw
      fireEvent.click(screen.getByText('Retry Loading'));
      
      // Button should still be there after click
      expect(screen.getByText('Retry Loading')).toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    it('logs errors with section context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <MetricsErrorBoundary>
          <ThrowError />
        </MetricsErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Admin Dashboard Error in metrics:'),
        expect.any(Error),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });
});