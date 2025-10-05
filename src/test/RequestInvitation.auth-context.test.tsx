import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RequestInvitation from '@/pages/RequestInvitation';
import { AuthProvider } from '@/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth');

// Mock other dependencies
vi.mock('@/services/invitationService', () => ({
  createInvitationRequest: vi.fn()
}));

// Mock MainLayout to avoid navigation issues
vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>
}));

// Mock UserMenu to avoid checkRoleAccess issues
vi.mock('@/components/Auth/UserMenu', () => ({
  default: () => <div data-testid="user-menu">User Menu</div>
}));

vi.mock('@/hooks/usePerformanceMonitoring', () => ({
  usePerformanceMonitoring: () => ({
    startFormSubmission: vi.fn(),
    endFormSubmission: vi.fn(),
    recordMemoryUsage: vi.fn()
  }),
  useRequestDeduplication: () => ({
    executeWithDeduplication: vi.fn()
  })
}));

vi.mock('@/hooks/useUserFeedback', () => ({
  useUserFeedback: () => ({
    feedback: null,
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showLoading: vi.fn(),
    updateProgress: vi.fn(),
    clearFeedback: vi.fn(),
    retry: vi.fn(),
    setRetryHandler: vi.fn()
  })
}));

vi.mock('@/components/Common/CaptchaChallenge', () => ({
  default: ({ onVerified }: { onVerified: (verified: boolean) => void }) => (
    <div data-testid="captcha-challenge">
      <button onClick={() => onVerified(true)}>Verify Captcha</button>
    </div>
  )
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('RequestInvitation Authentication Context', () => {
  const mockUseAuth = useAuth as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display anonymous user status when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      isLoggedIn: false,
      session: null,
      isLoading: false,
      isInitialized: true
    });

    render(
      <TestWrapper>
        <RequestInvitation />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Submitting as: Anonymous User/)).toBeInTheDocument();
      expect(screen.getByText(/You are not logged in/)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Submit Invitation Request \(Anonymous\)/ });
    expect(submitButton).toBeInTheDocument();
  });

  it('should display authenticated user status when logged in', async () => {
    const mockUser = {
      id: 'user-123',
      display_name: 'John Doe',
      email: 'john@example.com'
    };

    mockUseAuth.mockReturnValue({
      currentUser: mockUser,
      isLoggedIn: true,
      session: { user: mockUser },
      isLoading: false,
      isInitialized: true
    });

    render(
      <TestWrapper>
        <RequestInvitation />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Submitting as: John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/You are logged in/)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Submit Invitation Request \(Authenticated\)/ });
    expect(submitButton).toBeInTheDocument();
  });

  it('should show loading state while authentication is initializing', async () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      isLoggedIn: false,
      session: null,
      isLoading: true,
      isInitialized: false
    });

    render(
      <TestWrapper>
        <RequestInvitation />
      </TestWrapper>
    );

    expect(screen.getByText(/Initializing.../)).toBeInTheDocument();
    expect(screen.queryByText(/Get your child started/)).not.toBeInTheDocument();
  });

  it('should handle form submission for anonymous users', async () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      isLoggedIn: false,
      session: null,
      isLoading: false,
      isInitialized: true
    });

    render(
      <TestWrapper>
        <RequestInvitation />
      </TestWrapper>
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
      target: { value: 'Jane Doe' }
    });
    fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
      target: { value: 'jane@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/Child's Name/), {
      target: { value: 'Little Jane' }
    });
    fireEvent.change(screen.getByLabelText(/Child's Age/), {
      target: { value: '10' }
    });

    // Verify captcha
    fireEvent.click(screen.getByText('Verify Captcha'));

    // Check that the form can be submitted
    const submitButton = screen.getByRole('button', { name: /Submit Invitation Request \(Anonymous\)/ });
    expect(submitButton).not.toBeDisabled();
  });

  it('should handle form submission for authenticated users', async () => {
    const mockUser = {
      id: 'user-123',
      display_name: 'John Doe',
      email: 'john@example.com'
    };

    mockUseAuth.mockReturnValue({
      currentUser: mockUser,
      isLoggedIn: true,
      session: { user: mockUser },
      isLoading: false,
      isInitialized: true
    });

    render(
      <TestWrapper>
        <RequestInvitation />
      </TestWrapper>
    );

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
      target: { value: 'John Doe' }
    });
    fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
      target: { value: 'john@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/Child's Name/), {
      target: { value: 'Little John' }
    });
    fireEvent.change(screen.getByLabelText(/Child's Age/), {
      target: { value: '12' }
    });

    // Verify captcha
    fireEvent.click(screen.getByText('Verify Captcha'));

    // Check that the form can be submitted
    const submitButton = screen.getByRole('button', { name: /Submit Invitation Request \(Authenticated\)/ });
    expect(submitButton).not.toBeDisabled();
  });
});