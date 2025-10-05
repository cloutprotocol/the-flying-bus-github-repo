import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserFeedback } from '@/components/Common/UserFeedback';
import { useUserFeedback } from '@/hooks/useUserFeedback';
import { UserFriendlyErrorGenerator } from '@/utils/userFriendlyErrors';
import { afterEach } from 'node:test';

// Test component that uses the user feedback system
const TestComponent: React.FC = () => {
  const {
    feedback,
    showError,
    showSuccess,
    showLoading,
    updateProgress,
    clearFeedback,
    retry,
    setRetryHandler
  } = useUserFeedback();

  const handleError = () => {
    const error = { status: 500, message: 'Server error' };
    const userError = UserFriendlyErrorGenerator.generateFormSubmissionError(error, {
      operation: 'form_submission',
      component: 'TestComponent'
    });
    
    showError(userError.message, {
      title: userError.title,
      details: userError.details,
      nextSteps: userError.nextSteps,
      showRetry: userError.retryable,
      retryLabel: userError.retryLabel
    });
  };

  const handleSuccess = () => {
    const successMessage = UserFriendlyErrorGenerator.generateSuccessMessage('form_submission', {
      operation: 'test_operation',
      component: 'TestComponent'
    });
    
    showSuccess(successMessage.message, {
      title: successMessage.title,
      nextSteps: successMessage.nextSteps
    });
  };

  const handleLoading = () => {
    showLoading('Processing request...', {
      showProgress: true,
      progress: 0,
      estimatedTime: '30 seconds'
    });

    // Simulate progress updates
    setTimeout(() => updateProgress(50, '15 seconds'), 100);
    setTimeout(() => updateProgress(100, 'Complete'), 200);
  };

  const handleRetry = () => {
    console.log('Retry called');
  };

  React.useEffect(() => {
    setRetryHandler(handleRetry);
  }, [setRetryHandler]);

  return (
    <div>
      <button onClick={handleError} data-testid="error-button">
        Show Error
      </button>
      <button onClick={handleSuccess} data-testid="success-button">
        Show Success
      </button>
      <button onClick={handleLoading} data-testid="loading-button">
        Show Loading
      </button>
      <button onClick={clearFeedback} data-testid="clear-button">
        Clear Feedback
      </button>

      {feedback && (
        <UserFeedback
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          details={feedback.details}
          showRetry={feedback.showRetry}
          onRetry={retry}
          retryLabel={feedback.retryLabel}
          showProgress={feedback.showProgress}
          progress={feedback.progress}
          estimatedTime={feedback.estimatedTime}
          nextSteps={feedback.nextSteps}
        />
      )}
    </div>
  );
};

describe('User Feedback Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays error feedback with retry functionality', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<TestComponent />);

    // Show error
    fireEvent.click(screen.getByTestId('error-button'));

    // Check error is displayed
    expect(screen.getByText('Server Problem')).toBeInTheDocument();
    expect(screen.getByText('Our servers are experiencing issues. We\'re working to fix this.')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();

    // Test retry functionality
    fireEvent.click(screen.getByText('Retry'));
    expect(consoleSpy).toHaveBeenCalledWith('Retry called');

    consoleSpy.mockRestore();
  });

  it('displays success feedback with next steps', () => {
    render(<TestComponent />);

    // Show success
    fireEvent.click(screen.getByTestId('success-button'));

    // Check success is displayed
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Your request has been submitted successfully.')).toBeInTheDocument();
    expect(screen.getByText('Next steps:')).toBeInTheDocument();
    expect(screen.getByText('Check your email for confirmation')).toBeInTheDocument();
  });

  it('displays loading feedback with progress updates', async () => {
    render(<TestComponent />);

    // Show loading
    fireEvent.click(screen.getByTestId('loading-button'));

    // Check initial loading state
    expect(screen.getByText('Processing request...')).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();
    expect(screen.getByText('Est. 30 seconds')).toBeInTheDocument();

    // Advance timers and check for progress updates
    await vi.runOnlyPendingTimersAsync();
    
    // The progress should have updated
    expect(screen.getByText('100% complete')).toBeInTheDocument();
    expect(screen.getByText('Est. Complete')).toBeInTheDocument();
  });

  it('clears feedback when clear button is clicked', () => {
    render(<TestComponent />);

    // Show error first
    fireEvent.click(screen.getByTestId('error-button'));
    expect(screen.getByText('Server Problem')).toBeInTheDocument();

    // Clear feedback
    fireEvent.click(screen.getByTestId('clear-button'));
    expect(screen.queryByText('Server Problem')).not.toBeInTheDocument();
  });

  it('replaces previous feedback when new feedback is shown', () => {
    render(<TestComponent />);

    // Show error first
    fireEvent.click(screen.getByTestId('error-button'));
    expect(screen.getByText('Server Problem')).toBeInTheDocument();

    // Show success (should replace error)
    fireEvent.click(screen.getByTestId('success-button'));
    expect(screen.queryByText('Server Problem')).not.toBeInTheDocument();
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('generates appropriate error messages for different error types', () => {
    // Test network error
    const networkError = new TypeError('fetch failed');
    const networkResult = UserFriendlyErrorGenerator.generateFormSubmissionError(networkError, {
      operation: 'form_submission',
      component: 'TestComponent'
    });
    
    expect(networkResult.title).toBe('Connection Problem');
    expect(networkResult.retryable).toBe(true);

    // Test timeout error
    const timeoutError = { message: 'Request timeout', code: 'TIMEOUT' };
    const timeoutResult = UserFriendlyErrorGenerator.generateFormSubmissionError(timeoutError, {
      operation: 'form_submission',
      component: 'TestComponent'
    });
    
    expect(timeoutResult.title).toBe('Request Timed Out');
    expect(timeoutResult.retryable).toBe(true);

    // Test validation error
    const validationError = { status: 400, message: 'Validation failed' };
    const validationResult = UserFriendlyErrorGenerator.generateFormSubmissionError(validationError, {
      operation: 'form_submission',
      component: 'TestComponent'
    });
    
    expect(validationResult.title).toBe('Invalid Information');
    expect(validationResult.retryable).toBe(true);
  });
});