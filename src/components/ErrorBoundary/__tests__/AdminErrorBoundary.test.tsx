import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminErrorBoundary } from '../AdminErrorBoundary';
import { afterEach } from 'node:test';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('AdminErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AdminErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error fallback when child component throws', () => {
    render(
      <AdminErrorBoundary section="test section">
        <ThrowError />
      </AdminErrorBoundary>
    );

    expect(screen.getByText('Failed to load test section')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('shows retry button', () => {
    render(
      <AdminErrorBoundary>
        <ThrowError />
      </AdminErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
    
    // Click retry button should not throw
    fireEvent.click(screen.getByText('Try Again'));
    
    // Button should still be there after click
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('limits retry attempts', () => {
    render(
      <AdminErrorBoundary>
        <ThrowError />
      </AdminErrorBoundary>
    );

    // Click retry multiple times
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);

    // After max retries, check for retry count display
    expect(screen.getByText((content, element) => {
      return content.includes('Retry attempts:') && content.includes('3');
    })).toBeInTheDocument();
  });

  it('shows refresh page button', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <AdminErrorBoundary>
        <ThrowError />
      </AdminErrorBoundary>
    );

    const refreshButton = screen.getByText('Refresh Page');
    fireEvent.click(refreshButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('uses custom fallback component when provided', () => {
    const CustomFallback: React.FC<{error: Error, retry: () => void}> = ({ error }) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <AdminErrorBoundary fallback={CustomFallback}>
        <ThrowError />
      </AdminErrorBoundary>
    );

    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
  });

  it('logs errors to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AdminErrorBoundary section="test section">
        <ThrowError />
      </AdminErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Admin Dashboard Error in test section:'),
      expect.any(Error),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });

  it('prevents rapid retries with cooldown', async () => {
    vi.useFakeTimers();

    render(
      <AdminErrorBoundary>
        <ThrowError />
      </AdminErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    
    // First retry should work
    fireEvent.click(retryButton);
    
    // Immediate second retry should be ignored (cooldown)
    fireEvent.click(retryButton);
    
    // Should still show retry count as 1
    expect(screen.getByText('Retry attempts: 1/3')).toBeInTheDocument();

    vi.useRealTimers();
  });
});