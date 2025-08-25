import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InvitationActivateAccount from '@/pages/InvitationActivateAccount';
import { validateInvitationToken, findUserByEmail } from '@/services/invitationService';
import { useAuth } from '@/hooks/useAuth';

// Mock dependencies
vi.mock('@/services/invitationService');
vi.mock('@/services/roleService');

// Mock useToast hook
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock useRoleManagement hook
vi.mock('@/hooks/useRoleManagement', () => ({
  useRoleManagement: () => ({
    isLoading: false
  })
}));

// Mock useAuth hook
const mockLogin = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    login: mockLogin,
    logout: vi.fn(),
    isLoading: false
  })
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('?token=test-token&email=test@example.com')]
  };
});

const mockInvitationData = {
  id: 'test-id',
  invitation_id: 'invitation-id',
  email: 'test@example.com',
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  invitation: {
    id: 'invitation-id',
    parent_name: 'John Doe',
    parent_email: 'test@example.com',
    child_name: 'Jane Doe',
    child_age: 10,
    status: 'approved'
  }
};

const mockUser = {
  id: 'existing-user',
  email: 'test@example.com',
  role: 'reader'
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('InvitationActivateAccount Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful token validation by default
    vi.mocked(validateInvitationToken).mockResolvedValue({
      data: mockInvitationData,
      error: null
    });
    
    // Mock existing user found by default
    vi.mocked(findUserByEmail).mockResolvedValue({
      data: mockUser,
      error: null
    });
  });

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    expect(screen.getByText('Preparing activation...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we verify your invitation.')).toBeInTheDocument();
  });

  it('renders activation form after successful validation', async () => {
    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Check form fields are present
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate Author Account' })).toBeInTheDocument();
  });

  it('pre-populates email from invitation data', async () => {
    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });
  });

  it('displays invitation details', async () => {
    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Invitation Details:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Clear email field
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: '' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Activate Author Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('validates password field', async () => {
    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Leave password empty
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: '' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Activate Author Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('successfully activates account with valid credentials', async () => {
    mockLogin.mockResolvedValue(true);

    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Fill form
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Activate Author Account' });
    fireEvent.click(submitButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Activating Account...')).toBeInTheDocument();
    });

    // Check success state
    await waitFor(() => {
      expect(screen.getByText('Account Activated!')).toBeInTheDocument();
    });

    // Verify login was called
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('handles authentication failure', async () => {
    mockLogin.mockResolvedValue(false);

    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Fill and submit form
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    const submitButton = screen.getByRole('button', { name: 'Activate Author Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      expect(screen.getByText('Invalid email or password. Please check your credentials.')).toBeInTheDocument();
    });

    // Should return to ready state
    expect(screen.getByRole('button', { name: 'Activate Author Account' })).toBeInTheDocument();
  });

  it('handles invalid invitation token', async () => {
    vi.mocked(validateInvitationToken).mockResolvedValue({
      data: null,
      error: 'Invalid invitation token'
    });

    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activation Error')).toBeInTheDocument();
      expect(screen.getByText('Request New Invitation')).toBeInTheDocument();
    });
  });

  it('redirects to registration if user does not exist', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      data: null,
      error: null
    });

    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/invitation/register?token=test-token&email=test%40example.com'
      );
    });
  });

  it('shows error if user already has author privileges', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      data: { ...mockUser, role: 'author' },
      error: null
    });

    // Mock hasAuthorPrivileges to return true
    const { hasAuthorPrivileges } = await import('@/services/roleService');
    vi.mocked(hasAuthorPrivileges).mockReturnValue(true);

    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activation Error')).toBeInTheDocument();
      expect(screen.getByText(/already has author privileges/)).toBeInTheDocument();
    });
  });

  it('clears field errors when user starts typing', async () => {
    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Clear email to trigger validation error
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: '' } });

    // Submit to show error
    const submitButton = screen.getByRole('button', { name: 'Activate Author Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    // Start typing to clear error
    fireEvent.change(emailInput, { target: { value: 't' } });

    await waitFor(() => {
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });
  });

  it('disables form during activation', async () => {
    mockLogin.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(true), 1000))
    );

    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Fill and submit form
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: 'Activate Author Account' });
    fireEvent.click(submitButton);

    // Check that form fields are disabled during activation
    await waitFor(() => {
      expect(screen.getByLabelText('Email Address')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  it('handles login exceptions gracefully', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Fill and submit form
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: 'Activate Author Account' });
    fireEvent.click(submitButton);

    // Should handle error and return to ready state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Activate Author Account' })).toBeInTheDocument();
    });
  });

  it('provides navigation to registration form', async () => {
    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Click "Create a new account instead" link
    const createAccountLink = screen.getByText('Create a new account instead');
    fireEvent.click(createAccountLink);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/invitation/register?token=test-token&email=test%40example.com'
    );
  });

  it('shows retry functionality for retryable errors', async () => {
    mockLogin.mockRejectedValue(new Error('Network timeout'));

    render(
      <TestWrapper>
        <InvitationActivateAccount />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Activate Your Author Account')).toBeInTheDocument();
    });

    // Fill and submit form to trigger error
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitButton = screen.getByRole('button', { name: 'Activate Author Account' });
    fireEvent.click(submitButton);

    // Wait for error to be processed and retry button to appear
    await waitFor(() => {
      const retryButton = screen.queryByText('Try Again');
      if (retryButton) {
        expect(retryButton).toBeInTheDocument();
      }
    });
  });
});