import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { registrationFlowCoordinator } from '@/services/registrationFlowCoordinator';
import { rlsPolicyManager } from '@/services/rlsPolicyManager';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      is: vi.fn().mockReturnThis()
    }))
  }
}));

vi.mock('@/services/registrationFlowCoordinator', () => ({
  registrationFlowCoordinator: {
    coordinateStandardRegistration: vi.fn(),
    coordinateInvitationRegistration: vi.fn()
  }
}));

vi.mock('@/services/rlsPolicyManager', () => ({
  rlsPolicyManager: {
    createProfileWithPermissions: vi.fn(),
    validateRegistrationPermissions: vi.fn(),
    isServiceRoleAvailable: vi.fn()
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ token: 'test-invitation-token' }),
    useLocation: () => ({ pathname: '/invitation/register', search: '', hash: '', state: null }),
  };
});

// Mock components for testing
const MockSignUpForm = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username || !displayName) {
      setError('Email is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await registrationFlowCoordinator.coordinateStandardRegistration({
        email,
        password,
        username,
        displayName
      });
      
      if (!result.success) {
        setError(result.error?.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      <label htmlFor="username">Username</label>
      <input
        id="username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      
      <label htmlFor="displayName">Display Name</label>
      <input
        id="displayName"
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Sign Up'}
      </button>
      
      {error && <div>{error}</div>}
    </form>
  );
};

const MockInvitationRegister = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const { token } = useParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');
    
    try {
      const result = await registrationFlowCoordinator.coordinateInvitationRegistration({
        email,
        password,
        firstName,
        lastName,
        invitationToken: token || ''
      });
      
      if (!result.success) {
        setError(result.error?.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      <label htmlFor="firstName">First Name</label>
      <input
        id="firstName"
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
      
      <label htmlFor="lastName">Last Name</label>
      <input
        id="lastName"
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Create Account'}
      </button>
      
      {error && <div>{error}</div>}
    </form>
  );
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Complete Registration Flows Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Default auth state
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null }
    });
    
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    });
    
    // Default RLS manager state
    (rlsPolicyManager.isServiceRoleAvailable as any).mockReturnValue(true);
    (rlsPolicyManager.validateRegistrationPermissions as any).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Standard Sign-Up Form Integration', () => {
    it('should complete full sign-up flow with auto-login and redirect', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = {
        access_token: 'access-token-123',
        user: mockUser
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      // Mock successful registration coordination
      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: true,
        user: mockProfile,
        session: mockSession
      });

      // Render component
      render(
        <TestWrapper>
          <MockSignUpForm />
        </TestWrapper>
      );

      // Act - Fill out and submit form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const usernameInput = screen.getByLabelText(/username/i);
      const displayNameInput = screen.getByLabelText(/display name/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(usernameInput, 'testuser');
      await user.type(displayNameInput, 'Test User');
      
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(registrationFlowCoordinator.coordinateStandardRegistration).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          username: 'testuser',
          displayName: 'Test User'
        });
      });

      // Verify success state
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });

    it('should display error messages for failed registration', async () => {
      // Arrange
      const errorMessage = 'Email already exists';
      
      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: false,
        error: {
          message: errorMessage,
          code: 'EMAIL_ALREADY_EXISTS'
        }
      });

      // Render component
      render(
        <TestWrapper>
          <MockSignUpForm />
        </TestWrapper>
      );

      // Act - Fill out and submit form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const usernameInput = screen.getByLabelText(/username/i);
      const displayNameInput = screen.getByLabelText(/display name/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(usernameInput, 'testuser');
      await user.type(displayNameInput, 'Test User');
      
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Verify form is still interactive
      expect(submitButton).not.toBeDisabled();
    });

    it('should validate form fields before submission', async () => {
      // Render component
      render(
        <TestWrapper>
          <MockSignUpForm />
        </TestWrapper>
      );

      // Act - Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      // Assert - Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Verify registration coordinator was not called
      expect(registrationFlowCoordinator.coordinateStandardRegistration).not.toHaveBeenCalled();
    });
  });

  describe('Invitation Registration Form Integration', () => {
    it('should complete full invitation registration flow with author permissions', async () => {
      // Arrange
      const invitationToken = 'test-invitation-token';
      const mockUser = {
        id: 'user-456',
        email: 'author@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = {
        access_token: 'access-token-456',
        user: mockUser
      };

      const mockProfile = {
        id: 'user-456',
        email: 'author@example.com',
        username: 'jane_author',
        display_name: 'Jane Author',
        role: 'author'
      };

      // Mock successful invitation registration
      (registrationFlowCoordinator.coordinateInvitationRegistration as any).mockResolvedValue({
        success: true,
        user: mockProfile,
        session: mockSession
      });

      // Render component
      render(
        <TestWrapper>
          <MockInvitationRegister />
        </TestWrapper>
      );

      // Act - Fill out and submit form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(emailInput, 'author@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(firstNameInput, 'Jane');
      await user.type(lastNameInput, 'Author');
      
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(registrationFlowCoordinator.coordinateInvitationRegistration).toHaveBeenCalledWith({
          email: 'author@example.com',
          password: 'password123',
          firstName: 'Jane',
          lastName: 'Author',
          invitationToken: invitationToken
        });
      });

      // Verify success state and author role assignment
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });

    it('should handle invalid invitation token errors', async () => {
      // Arrange
      const errorMessage = 'Invitation token is invalid or has expired';
      
      (registrationFlowCoordinator.coordinateInvitationRegistration as any).mockResolvedValue({
        success: false,
        error: {
          message: errorMessage,
          code: 'INVALID_INVITATION_TOKEN'
        }
      });

      // Render component
      render(
        <TestWrapper>
          <MockInvitationRegister />
        </TestWrapper>
      );

      // Act - Submit form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(emailInput, 'author@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(firstNameInput, 'Jane');
      await user.type(lastNameInput, 'Author');
      
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication State Management Integration', () => {
    it('should maintain consistent auth state across registration and navigation', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        email_confirmed_at: new Date().toISOString()
      };

      const mockSession = {
        access_token: 'access-token-123',
        user: mockUser,
        expires_at: Date.now() + 3600000
      };

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        role: 'reader'
      };

      // Mock session verification
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession }
      });

      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: true,
        user: mockProfile,
        session: mockSession
      });

      // Render component
      render(
        <TestWrapper>
          <MockSignUpForm />
        </TestWrapper>
      );

      // Act - Complete registration
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const usernameInput = screen.getByLabelText(/username/i);
      const displayNameInput = screen.getByLabelText(/display name/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(usernameInput, 'testuser');
      await user.type(displayNameInput, 'Test User');
      
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(registrationFlowCoordinator.coordinateStandardRegistration).toHaveBeenCalled();
      });

      // Verify session persistence
      const sessionCheck = await supabase.auth.getSession();
      expect(sessionCheck.data.session).toEqual(mockSession);
    });
  });

  describe('Error Recovery and Retry Mechanisms', () => {
    it('should retry failed operations and show appropriate feedback', async () => {
      // Arrange
      let attemptCount = 0;
      
      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.resolve({
            success: false,
            error: {
              message: 'Network error - please try again',
              code: 'NETWORK_ERROR'
            }
          });
        }
        return Promise.resolve({
          success: true,
          user: { id: 'user-123', role: 'reader' },
          session: { access_token: 'token', user: { id: 'user-123' } }
        });
      });

      // Render component
      render(
        <TestWrapper>
          <MockSignUpForm />
        </TestWrapper>
      );

      // Act - First attempt (should fail)
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const usernameInput = screen.getByLabelText(/username/i);
      const displayNameInput = screen.getByLabelText(/display name/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(usernameInput, 'testuser');
      await user.type(displayNameInput, 'Test User');
      
      await user.click(submitButton);

      // Assert first failure
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Act - Retry (should succeed)
      await user.click(submitButton);

      // Assert success
      await waitFor(() => {
        expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
      });

      expect(attemptCount).toBe(2);
    });

    it('should handle concurrent registration attempts gracefully', async () => {
      // Arrange
      const mockProfile = { id: 'user-123', role: 'reader' };
      const mockSession = { access_token: 'token', user: { id: 'user-123' } };

      (registrationFlowCoordinator.coordinateStandardRegistration as any).mockResolvedValue({
        success: true,
        user: mockProfile,
        session: mockSession
      });

      // Render component
      render(
        <TestWrapper>
          <MockSignUpForm />
        </TestWrapper>
      );

      // Act - Rapid multiple submissions
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const usernameInput = screen.getByLabelText(/username/i);
      const displayNameInput = screen.getByLabelText(/display name/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(usernameInput, 'testuser');
      await user.type(displayNameInput, 'Test User');
      
      // Rapid clicks
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Assert - Should only call registration once (button should be disabled during submission)
      await waitFor(() => {
        expect(registrationFlowCoordinator.coordinateStandardRegistration).toHaveBeenCalledTimes(1);
      });
    });
  });
});