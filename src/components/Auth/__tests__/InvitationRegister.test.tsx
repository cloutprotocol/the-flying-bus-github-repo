import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InvitationRegister from '@/pages/InvitationRegister';
import { registrationFlowCoordinator } from '@/services/registrationFlowCoordinator';
import { validateInvitationToken, findUserByEmail } from '@/services/invitationService';

// Mock dependencies
vi.mock('@/services/registrationFlowCoordinator');
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
  expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
  invitation: {
    id: 'invitation-id',
    parent_name: 'John Doe',
    parent_email: 'test@example.com',
    child_name: 'Jane Doe',
    child_age: 10,
    status: 'approved'
  }
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('InvitationRegister Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful token validation by default
    vi.mocked(validateInvitationToken).mockResolvedValue({
      data: mockInvitationData,
      error: null
    });
    
    // Mock user not found by default (new registration)
    vi.mocked(findUserByEmail).mockResolvedValue({
      data: null,
      error: null
    });
  });

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    expect(screen.getByText('Preparing registration...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we verify your invitation.')).toBeInTheDocument();
  });

  it('renders registration form after successful token validation', async () => {
    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Author Account')).toBeInTheDocument();
    });

    // Check form fields are present
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/I accept the/)).toBeInTheDocument();
  });

  it('pre-populates form with invitation data', async () => {
    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });
  });

  it('displays invitation details', async () => {
    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Invitation Details:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('validates form fields and shows errors', async () => {
    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Author Account')).toBeInTheDocument();
    });

    // Clear required fields
    const firstNameInput = screen.getByLabelText('First Name');
    const lastNameInput = screen.getByLabelText('Last Name');
    
    fireEvent.change(firstNameInput, { target: { value: '' } });
    fireEvent.change(lastNameInput, { target: { value: '' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Author Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });
  });

  it('validates password requirements', async () => {
    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Author Account')).toBeInTheDocument();
    });

    // Enter weak password
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });

    // Check terms
    const termsCheckbox = screen.getByLabelText(/I accept the/);
    fireEvent.click(termsCheckbox);

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Author Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Author Account')).toBeInTheDocument();
    });

    // Enter mismatched passwords
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } });

    // Check terms
    const termsCheckbox = screen.getByLabelText(/I accept the/);
    fireEvent.click(termsCheckbox);

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Author Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('requires terms acceptance', async () => {
    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Author Account')).toBeInTheDocument();
    });

    // Fill valid form but don't check terms
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });

    // Submit form without checking terms
    const submitButton = screen.getByRole('button', { name: 'Create Author Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please accept the terms and conditions')).toBeInTheDocument();
    });
  });

  it('successfully submits registration with valid data', async () => {
    const mockCoordinateInvitationRegistration = vi.fn().mockResolvedValue({
      success: true,
      user: { id: 'user-id', email: 'test@example.com' },
      session: { access_token: 'token' }
    });

    vi.mocked(registrationFlowCoordinator.coordinateInvitationRegistration).mockImplementation(
      mockCoordinateInvitationRegistration
    );

    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Author Account')).toBeInTheDocument();
    });

    // Fill valid form
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const termsCheckbox = screen.getByLabelText(/I accept the/);
    
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.click(termsCheckbox);

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Author Account' });
    fireEvent.click(submitButton);

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Creating Account...')).toBeInTheDocument();
    });

    // Check success state
    await waitFor(() => {
      expect(screen.getByText('Account Created!')).toBeInTheDocument();
    });

    // Verify registration coordinator was called with correct data
    expect(mockCoordinateInvitationRegistration).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      invitationToken: 'test-token'
    });
  });

  it('handles registration errors gracefully', async () => {
    const mockCoordinateInvitationRegistration = vi.fn().mockResolvedValue({
      success: false,
      error: {
        message: 'Registration failed due to RLS policy violation',
        code: 'RLS_POLICY_VIOLATION'
      }
    });

    vi.mocked(registrationFlowCoordinator.coordinateInvitationRegistration).mockImplementation(
      mockCoordinateInvitationRegistration
    );

    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Author Account')).toBeInTheDocument();
    });

    // Fill and submit valid form
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const termsCheckbox = screen.getByLabelText(/I accept the/);
    
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.click(termsCheckbox);

    const submitButton = screen.getByRole('button', { name: 'Create Author Account' });
    fireEvent.click(submitButton);

    // Should show error and return to ready state
    await waitFor(() => {
      expect(screen.getByText('Create Author Account')).toBeInTheDocument();
    });
  });

  it('handles invalid invitation token', async () => {
    vi.mocked(validateInvitationToken).mockResolvedValue({
      data: null,
      error: 'Invalid invitation token'
    });

    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Registration Error')).toBeInTheDocument();
      expect(screen.getByText('Request New Invitation')).toBeInTheDocument();
    });
  });

  it('redirects to activation if user already exists', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      data: { id: 'existing-user', email: 'test@example.com', role: 'reader' },
      error: null
    });

    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/invitation/activate-account?token=test-token&email=test%40example.com'
      );
    });
  });

  it('shows error if user already has author privileges', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      data: { id: 'existing-user', email: 'test@example.com', role: 'author' },
      error: null
    });

    // Mock hasAuthorPrivileges to return true
    const { hasAuthorPrivileges } = await import('@/services/roleService');
    vi.mocked(hasAuthorPrivileges).mockReturnValue(true);

    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Registration Error')).toBeInTheDocument();
      expect(screen.getByText(/already exists for this email/)).toBeInTheDocument();
    });
  });

  it('clears field errors when user starts typing', async () => {
    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Author Account')).toBeInTheDocument();
    });

    // Clear first name to trigger validation error
    const firstNameInput = screen.getByLabelText('First Name');
    fireEvent.change(firstNameInput, { target: { value: '' } });

    // Submit to show error
    const submitButton = screen.getByRole('button', { name: 'Create Author Account' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    // Start typing to clear error
    fireEvent.change(firstNameInput, { target: { value: 'J' } });

    await waitFor(() => {
      expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
    });
  });

  it('disables form during registration', async () => {
    const mockCoordinateInvitationRegistration = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
    );

    vi.mocked(registrationFlowCoordinator.coordinateInvitationRegistration).mockImplementation(
      mockCoordinateInvitationRegistration
    );

    render(
      <TestWrapper>
        <InvitationRegister />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Author Account')).toBeInTheDocument();
    });

    // Fill and submit form
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const termsCheckbox = screen.getByLabelText(/I accept the/);
    
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.click(termsCheckbox);

    const submitButton = screen.getByRole('button', { name: 'Create Author Account' });
    fireEvent.click(submitButton);

    // Check that form fields are disabled during registration
    await waitFor(() => {
      expect(screen.getByLabelText('First Name')).toBeDisabled();
      expect(screen.getByLabelText('Last Name')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
      expect(screen.getByLabelText('Confirm Password')).toBeDisabled();
      expect(screen.getByLabelText(/I accept the/)).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});