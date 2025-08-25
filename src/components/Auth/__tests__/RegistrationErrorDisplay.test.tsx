import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegistrationErrorDisplay, FieldErrorDisplay, RegistrationErrorBoundary } from '../RegistrationErrorDisplay';
import { RegistrationErrorDetails } from '@/types/RegistrationErrorTypes';

describe('RegistrationErrorDisplay', () => {
  const mockOnRetry = vi.fn();
  const mockOnContactSupport = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when no error is provided', () => {
    const { container } = render(
      <RegistrationErrorDisplay 
        error={null}
        onRetry={mockOnRetry}
        onContactSupport={mockOnContactSupport}
        onDismiss={mockOnDismiss}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render validation error correctly', () => {
    const error: RegistrationErrorDetails = {
      code: 'EMAIL_INVALID',
      type: 'validation',
      message: 'Invalid email format',
      userMessage: 'Please enter a valid email address.',
      retryable: false
    };

    render(
      <RegistrationErrorDisplay 
        error={error}
        onRetry={mockOnRetry}
        onContactSupport={mockOnContactSupport}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should render retryable error with retry button', () => {
    const error: RegistrationErrorDetails = {
      code: 'NETWORK_ERROR',
      type: 'network',
      message: 'Network connection failed',
      userMessage: 'Connection issue detected. Please check your internet and try again.',
      retryable: true
    };

    render(
      <RegistrationErrorDisplay 
        error={error}
        onRetry={mockOnRetry}
        onContactSupport={mockOnContactSupport}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Connection issue detected. Please check your internet and try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should show contact support button for appropriate error types', () => {
    const error: RegistrationErrorDetails = {
      code: 'RLS_POLICY_VIOLATION',
      type: 'rls',
      message: 'RLS policy violation',
      userMessage: 'There was an issue creating your account. Please try again.',
      retryable: true
    };

    render(
      <RegistrationErrorDisplay 
        error={error}
        onRetry={mockOnRetry}
        onContactSupport={mockOnContactSupport}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  it('should call retry function when retry button is clicked', () => {
    const error: RegistrationErrorDetails = {
      code: 'NETWORK_ERROR',
      type: 'network',
      message: 'Network error',
      userMessage: 'Network error occurred',
      retryable: true
    };

    render(
      <RegistrationErrorDisplay 
        error={error}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.click(screen.getByText('Try Again'));
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should call contact support function when support button is clicked', () => {
    const error: RegistrationErrorDetails = {
      code: 'UNKNOWN_ERROR',
      type: 'unknown',
      message: 'Unknown error',
      userMessage: 'An unexpected error occurred',
      retryable: false
    };

    render(
      <RegistrationErrorDisplay 
        error={error}
        onContactSupport={mockOnContactSupport}
      />
    );

    fireEvent.click(screen.getByText('Contact Support'));
    expect(mockOnContactSupport).toHaveBeenCalledTimes(1);
  });

  it('should call dismiss function when dismiss button is clicked', () => {
    const error: RegistrationErrorDetails = {
      code: 'VALIDATION_FAILED',
      type: 'validation',
      message: 'Validation failed',
      userMessage: 'Please check your input',
      retryable: false
    };

    render(
      <RegistrationErrorDisplay 
        error={error}
        onDismiss={mockOnDismiss}
      />
    );

    fireEvent.click(screen.getByText('Dismiss'));
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('should show help link when helpUrl is provided', () => {
    const error: RegistrationErrorDetails = {
      code: 'INVITATION_EXPIRED',
      type: 'invitation',
      message: 'Invitation expired',
      userMessage: 'This invitation has expired',
      retryable: false,
      helpUrl: 'https://help.example.com/invitation-expired'
    };

    // Mock window.open
    const mockOpen = vi.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });

    render(
      <RegistrationErrorDisplay 
        error={error}
      />
    );

    fireEvent.click(screen.getByText('Help'));
    expect(mockOpen).toHaveBeenCalledWith('https://help.example.com/invitation-expired', '_blank');
  });

  it('should show suggested action when provided', () => {
    const error: RegistrationErrorDetails = {
      code: 'PASSWORD_WEAK',
      type: 'validation',
      message: 'Password too weak',
      userMessage: 'Password must be stronger',
      retryable: false,
      suggestedAction: 'Try using a combination of uppercase, lowercase, numbers, and symbols'
    };

    render(
      <RegistrationErrorDisplay 
        error={error}
      />
    );

    expect(screen.getByText('Try using a combination of uppercase, lowercase, numbers, and symbols')).toBeInTheDocument();
  });

  it('should show technical details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error: RegistrationErrorDetails = {
      code: 'NETWORK_ERROR',
      type: 'network',
      message: 'Network error',
      userMessage: 'Network error occurred',
      retryable: true,
      technicalDetails: 'Connection timeout after 5000ms'
    };

    render(
      <RegistrationErrorDisplay 
        error={error}
      />
    );

    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  it('should not show technical details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error: RegistrationErrorDetails = {
      code: 'NETWORK_ERROR',
      type: 'network',
      message: 'Network error',
      userMessage: 'Network error occurred',
      retryable: true,
      technicalDetails: 'Connection timeout after 5000ms'
    };

    render(
      <RegistrationErrorDisplay 
        error={error}
      />
    );

    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });
});

describe('FieldErrorDisplay', () => {
  it('should render nothing when no error is provided', () => {
    const { container } = render(<FieldErrorDisplay />);
    expect(container.firstChild).toBeNull();
  });

  it('should render field error message', () => {
    render(<FieldErrorDisplay error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <FieldErrorDisplay error="Error message" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('RegistrationErrorBoundary', () => {
  // Mock console.error to avoid noise in tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  it('should render children when no error occurs', () => {
    render(
      <RegistrationErrorBoundary>
        <ThrowError shouldThrow={false} />
      </RegistrationErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render default error UI when error occurs', () => {
    render(
      <RegistrationErrorBoundary>
        <ThrowError shouldThrow={true} />
      </RegistrationErrorBoundary>
    );

    expect(screen.getByText('Registration Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong during registration. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <RegistrationErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </RegistrationErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should render custom fallback component when provided', () => {
    const CustomFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <RegistrationErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </RegistrationErrorBoundary>
    );

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  it('should reset error state when retry is clicked', () => {
    const { rerender } = render(
      <RegistrationErrorBoundary>
        <ThrowError shouldThrow={true} />
      </RegistrationErrorBoundary>
    );

    expect(screen.getByText('Registration Error')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));

    // Re-render with no error
    rerender(
      <RegistrationErrorBoundary>
        <ThrowError shouldThrow={false} />
      </RegistrationErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});