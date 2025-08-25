import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserFeedback } from '../UserFeedback';

describe('UserFeedback Component', () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    mockOnRetry.mockClear();
  });

  it('renders error feedback correctly', () => {
    render(
      <UserFeedback
        type="error"
        title="Test Error"
        message="Something went wrong"
        details="Error details here"
        showRetry={true}
        onRetry={mockOnRetry}
        retryLabel="Try Again"
        nextSteps={['Step 1', 'Step 2']}
      />
    );

    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Next steps:')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });

  it('renders success feedback correctly', () => {
    render(
      <UserFeedback
        type="success"
        title="Success!"
        message="Operation completed successfully"
        nextSteps={['Continue browsing', 'Check your email']}
      />
    );

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    expect(screen.getByText('Next steps:')).toBeInTheDocument();
  });

  it('renders loading feedback with progress', () => {
    render(
      <UserFeedback
        type="loading"
        message="Loading content..."
        showProgress={true}
        progress={75}
        estimatedTime="5 seconds"
      />
    );

    expect(screen.getByText('Loading content...')).toBeInTheDocument();
    expect(screen.getByText('75% complete')).toBeInTheDocument();
    expect(screen.getByText('Est. 5 seconds')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    render(
      <UserFeedback
        type="error"
        message="Error occurred"
        showRetry={true}
        onRetry={mockOnRetry}
        retryLabel="Retry Now"
      />
    );

    const retryButton = screen.getByText('Retry Now');
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('shows technical details when expanded', () => {
    render(
      <UserFeedback
        type="error"
        message="Error occurred"
        details="Technical error details"
      />
    );

    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    expect(screen.getByText('Technical error details')).toBeInTheDocument();
  });

  it('does not render retry button when showRetry is false', () => {
    render(
      <UserFeedback
        type="error"
        message="Error occurred"
        showRetry={false}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders info feedback correctly', () => {
    render(
      <UserFeedback
        type="info"
        title="Information"
        message="This is an informational message"
      />
    );

    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText('This is an informational message')).toBeInTheDocument();
  });
});