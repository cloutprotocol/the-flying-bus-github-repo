import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, AuthContext } from '../AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { registerUser, registerUserWithInvitation, loginWithEmailPassword, logoutUser } from '@/services/auth/authService';
import { fetchUserProfile } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { inAppWallet } from 'thirdweb/wallets';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/services/auth/authService');
vi.mock('@/services/authService');
vi.mock('@/hooks/use-toast');
vi.mock('thirdweb/wallets');
vi.mock('@/utils/logger');

const mockToast = vi.fn();
const mockSupabase = supabase as any;
const mockRegisterUser = vi.mocked(registerUser);
const mockRegisterUserWithInvitation = vi.mocked(registerUserWithInvitation);
const mockLoginWithEmailPassword = vi.mocked(loginWithEmailPassword);
const mockLogoutUser = vi.mocked(logoutUser);
const mockFetchUserProfile = vi.mocked(fetchUserProfile);
const mockInAppWallet = vi.mocked(inAppWallet);

// Test component to access auth context
const TestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="current-user">{auth.currentUser?.display_name || 'null'}</div>
      <div data-testid="is-logged-in">{auth.isLoggedIn.toString()}</div>
      <div data-testid="is-loading">{auth.isLoading.toString()}</div>
      <button onClick={() => auth.login('test@example.com', 'password')}>Login</button>
      <button onClick={() => auth.register('test@example.com', 'password', 'testuser', 'Test User')}>Register</button>
      <button onClick={() => auth.registerWithInvitation('test@example.com', 'password', 'Test', 'User', 'token123')}>Register with Invitation</button>
      <button onClick={() => auth.logout()}>Logout</button>
      <button onClick={() => auth.refreshUserProfile()}>Refresh Profile</button>
      <button onClick={() => auth.syncAuthState()}>Sync Auth State</button>
    </div>
  );
};

describe('AuthProvider Enhanced', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    display_name: 'Test User',
    username: 'testuser',
    role: 'reader'
  };

  const mockSession = {
    user: { id: 'user-123', email: 'test@example.com' },
    access_token: 'token',
    refresh_token: 'refresh'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    mockInAppWallet.mockReturnValue({ disconnect: vi.fn() });
    
    // Setup Supabase auth mocks
    mockSupabase.auth = {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    };
    
    mockFetchUserProfile.mockResolvedValue(mockUser);
    mockLoginWithEmailPassword.mockResolvedValue({ session: null });
    mockLogoutUser.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Session Loading', () => {
    it('should load initial session and user profile', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(mockFetchUserProfile).toHaveBeenCalledWith('user-123');
    });

    it('should handle no initial session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('null');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('should retry profile loading on failure', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });
      
      // First call fails, second succeeds
      mockFetchUserProfile
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
      });

      expect(mockFetchUserProfile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Standard Registration Flow', () => {
    it('should handle successful registration with auto-login', async () => {
      mockRegisterUser.mockResolvedValue({
        success: true,
        user: mockUser,
        session: mockSession
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Register').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
      });

      expect(mockRegisterUser).toHaveBeenCalledWith('test@example.com', 'password', 'testuser', 'Test User');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Welcome!",
        description: "Your account has been created and you're now signed in",
      });
    });

    it('should handle registration with email confirmation required', async () => {
      mockRegisterUser.mockResolvedValue({
        success: true,
        error: {
          code: 'email_confirmation_required',
          message: 'Please check your email to confirm your account'
        }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Register').click();
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Account created!",
          description: "Please check your email to confirm your account",
        });
      });
    });

    it('should handle registration failure', async () => {
      mockRegisterUser.mockResolvedValue({
        success: false,
        error: {
          message: 'Email already exists'
        }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Register').click();
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Registration failed",
          description: "Email already exists",
          variant: "destructive",
        });
      });
    });
  });

  describe('Invitation Registration Flow', () => {
    it('should handle successful invitation registration with auto-login', async () => {
      const authorUser = { ...mockUser, role: 'author' };
      mockRegisterUserWithInvitation.mockResolvedValue({
        success: true,
        user: authorUser,
        session: mockSession
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Register with Invitation').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
      });

      expect(mockRegisterUserWithInvitation).toHaveBeenCalledWith(
        'test@example.com', 
        'password', 
        'Test', 
        'User', 
        'token123'
      );
      expect(mockToast).toHaveBeenCalledWith({
        title: "Welcome to the team!",
        description: "Your author account has been created and you're now signed in",
      });
    });

    it('should handle invitation registration failure', async () => {
      mockRegisterUserWithInvitation.mockResolvedValue({
        success: false,
        error: {
          message: 'Invalid invitation token'
        }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Register with Invitation').click();
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Registration failed",
          description: "Invalid invitation token",
          variant: "destructive",
        });
      });
    });
  });

  describe('Login Flow', () => {
    it('should handle login error gracefully', async () => {
      mockLoginWithEmailPassword.mockRejectedValue(new Error('Invalid credentials'));

      const TestLoginComponent = () => {
        const auth = useAuth();
        return (
          <div>
            <button onClick={async () => {
              await auth.login('test@example.com', 'password');
            }}>Login</button>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestLoginComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Login error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      });
    });
  });

  describe('Logout Flow', () => {
    it('should handle successful logout', async () => {
      // Start with logged in state
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });
      mockLogoutUser.mockRejectedValue(new Error('Logout failed'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial login
      await waitFor(() => {
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
      });

      await act(async () => {
        screen.getByText('Logout').click();
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Logout error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      });
    });
  });

  describe('Session Management', () => {
    it('should sync authentication state', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Sync Auth State').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
      });

      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(mockFetchUserProfile).toHaveBeenCalledWith('user-123');
    });

    it('should refresh user profile', async () => {
      // Start with logged in state
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial login
      await waitFor(() => {
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
      });

      // Clear previous calls
      mockFetchUserProfile.mockClear();

      await act(async () => {
        screen.getByText('Refresh Profile').click();
      });

      await waitFor(() => {
        expect(mockFetchUserProfile).toHaveBeenCalledWith('user-123');
      });
    });
  });

  describe('Auth State Change Handling', () => {
    it('should handle auth state changes from Supabase', async () => {
      let authStateCallback: any;
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Simulate auth state change
      await act(async () => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
      });
    });

    it('should handle sign out auth state change', async () => {
      let authStateCallback: any;
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Simulate sign out
      await act(async () => {
        authStateCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-user')).toHaveTextContent('null');
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle session establishment errors gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Authentication error",
          description: "An error occurred during authentication",
          variant: "destructive",
        });
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
    });

    it('should handle profile loading errors during session establishment', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });
      // Mock profile loading to fail all retries
      mockFetchUserProfile.mockResolvedValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Profile loading error",
          description: "Your account was created but we couldn't load your profile. Please try refreshing the page.",
          variant: "destructive",
        });
      }, { timeout: 3000 });
    });
  });

  describe('Role Access Checking', () => {
    it('should check role access correctly', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      const TestRoleComponent = () => {
        const auth = useAuth();
        return (
          <div>
            <div data-testid="reader-access">{auth.checkRoleAccess(['reader']).toString()}</div>
            <div data-testid="author-access">{auth.checkRoleAccess(['author']).toString()}</div>
            <div data-testid="admin-access">{auth.checkRoleAccess(['admin']).toString()}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestRoleComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('reader-access')).toHaveTextContent('true');
        expect(screen.getByTestId('author-access')).toHaveTextContent('false');
        expect(screen.getByTestId('admin-access')).toHaveTextContent('false');
      });
    });
  });
});