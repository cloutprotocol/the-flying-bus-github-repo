import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '@/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { fetchUserProfile } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { inAppWallet } from 'thirdweb/wallets';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/services/authService');
vi.mock('@/hooks/use-toast');
vi.mock('thirdweb/wallets');
vi.mock('@/utils/logger');

const mockSupabase = supabase as any;
const mockFetchUserProfile = vi.mocked(fetchUserProfile);

// Test component that uses multiple auth hooks to test synchronization
const MultipleAuthConsumers = () => {
  const auth1 = useAuth();
  const auth2 = useAuth();
  
  return (
    <div>
      <div data-testid="auth1-user">{auth1.currentUser?.display_name || 'null'}</div>
      <div data-testid="auth2-user">{auth2.currentUser?.display_name || 'null'}</div>
      <div data-testid="auth1-logged-in">{auth1.isLoggedIn.toString()}</div>
      <div data-testid="auth2-logged-in">{auth2.isLoggedIn.toString()}</div>
      <div data-testid="auth1-loading">{auth1.isLoading.toString()}</div>
      <div data-testid="auth2-loading">{auth2.isLoading.toString()}</div>
      <button onClick={() => auth1.syncAuthState()}>Sync Auth State</button>
      <button onClick={() => auth1.refreshUserProfile()}>Refresh Profile</button>
    </div>
  );
};

describe('Authentication Context Synchronization', () => {
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
    vi.mocked(useToast).mockReturnValue({ toast: vi.fn() });
    vi.mocked(inAppWallet).mockReturnValue({ disconnect: vi.fn() });
    
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('State Synchronization Across Components', () => {
    it('should synchronize authentication state across multiple consumers', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('auth2-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('auth1-logged-in')).toHaveTextContent('true');
        expect(screen.getByTestId('auth2-logged-in')).toHaveTextContent('true');
        expect(screen.getByTestId('auth1-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth2-loading')).toHaveTextContent('false');
      });
    });

    it('should synchronize loading states during authentication operations', async () => {
      let resolveSession: any;
      const sessionPromise = new Promise(resolve => {
        resolveSession = resolve;
      });
      
      mockSupabase.auth.getSession.mockReturnValue(sessionPromise);

      render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      // Initially loading
      expect(screen.getByTestId('auth1-loading')).toHaveTextContent('true');
      expect(screen.getByTestId('auth2-loading')).toHaveTextContent('true');

      // Resolve session
      await act(async () => {
        resolveSession({ data: { session: mockSession } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth1-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth2-loading')).toHaveTextContent('false');
      });
    });

    it('should synchronize auth state changes from Supabase listener', async () => {
      let authStateCallback: any;
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      // Initially no user
      expect(screen.getByTestId('auth1-user')).toHaveTextContent('null');
      expect(screen.getByTestId('auth2-user')).toHaveTextContent('null');

      // Simulate auth state change
      await act(async () => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('auth2-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('auth1-logged-in')).toHaveTextContent('true');
        expect(screen.getByTestId('auth2-logged-in')).toHaveTextContent('true');
      });
    });
  });

  describe('Manual State Synchronization', () => {
    it('should manually sync auth state when requested', async () => {
      // Start with no session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('null');
        expect(screen.getByTestId('auth2-user')).toHaveTextContent('null');
      });

      // Change mock to return session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Trigger manual sync
      await act(async () => {
        screen.getByText('Sync Auth State').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('auth2-user')).toHaveTextContent('Test User');
      });
    });

    it('should refresh user profile across all consumers', async () => {
      // Start with logged in state
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('Test User');
      });

      // Update mock to return updated user
      const updatedUser = { ...mockUser, display_name: 'Updated User' };
      mockFetchUserProfile.mockResolvedValue(updatedUser);

      // Trigger profile refresh
      await act(async () => {
        screen.getByText('Refresh Profile').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('Updated User');
        expect(screen.getByTestId('auth2-user')).toHaveTextContent('Updated User');
      });
    });
  });

  describe('Session Persistence', () => {
    it('should persist session across page reloads', async () => {
      // Simulate page reload by creating new provider instance
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      const { unmount } = render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('Test User');
      });

      // Unmount and remount to simulate page reload
      unmount();

      render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('Test User');
        expect(screen.getByTestId('auth2-user')).toHaveTextContent('Test User');
      });

      // Should have called getSession again
      expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(2);
    });

    it('should handle session expiration gracefully', async () => {
      let authStateCallback: any;
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      // Start with valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth1-logged-in')).toHaveTextContent('true');
      });

      // Simulate session expiration
      await act(async () => {
        authStateCallback('TOKEN_REFRESHED', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('auth1-logged-in')).toHaveTextContent('false');
        expect(screen.getByTestId('auth2-logged-in')).toHaveTextContent('false');
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('null');
        expect(screen.getByTestId('auth2-user')).toHaveTextContent('null');
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary network errors during sync', async () => {
      // Start with successful session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('Test User');
      });

      // Simulate network error on next sync
      mockSupabase.auth.getSession.mockRejectedValueOnce(new Error('Network error'));
      
      // Then return to normal
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Trigger sync - should handle error gracefully
      await act(async () => {
        screen.getByText('Sync Auth State').click();
      });

      // Should still maintain state or recover
      await waitFor(() => {
        expect(screen.getByTestId('auth1-loading')).toHaveTextContent('false');
        expect(screen.getByTestId('auth2-loading')).toHaveTextContent('false');
      });
    });

    it('should handle profile loading failures during sync', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      render(
        <AuthProvider>
          <MultipleAuthConsumers />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth1-user')).toHaveTextContent('Test User');
      });

      // Simulate profile loading failure
      mockFetchUserProfile.mockRejectedValueOnce(new Error('Profile error'));

      await act(async () => {
        screen.getByText('Refresh Profile').click();
      });

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(screen.getByTestId('auth1-loading')).toHaveTextContent('false');
      });
    });
  });
});