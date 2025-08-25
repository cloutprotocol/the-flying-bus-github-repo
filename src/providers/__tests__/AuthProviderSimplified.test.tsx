import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, AuthContext } from '../AuthProvider';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
}));

vi.mock('@/services/authService', () => ({
  fetchUserProfile: vi.fn().mockResolvedValue({
    id: 'test-user-id',
    username: 'testuser',
    display_name: 'Test User',
    email: 'test@example.com',
    role: 'reader'
  }),
  loginWithEmailPassword: vi.fn(),
  logoutUser: vi.fn()
}));

vi.mock('@/services/auth/authService', () => ({
  registerUser: vi.fn(),
  registerUserWithInvitation: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('thirdweb/wallets', () => ({
  inAppWallet: () => ({ disconnect: vi.fn() })
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('AuthProvider Simplified', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with minimal session setup', async () => {
    const mockSession = {
      user: { id: 'test-user-id', email_confirmed_at: new Date().toISOString() },
      access_token: 'test-token'
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });

    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      return (
        <div>
          <div data-testid="loading">{auth?.isLoading ? 'loading' : 'not-loading'}</div>
          <div data-testid="initialized">{auth?.isInitialized ? 'initialized' : 'not-initialized'}</div>
          <div data-testid="session">{auth?.session ? 'has-session' : 'no-session'}</div>
          <div data-testid="profile-status">{auth?.profileLoadingStatus}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should complete initialization quickly without waiting for profile
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('initialized')).toHaveTextContent('initialized');
      expect(screen.getByTestId('session')).toHaveTextContent('has-session');
    }, { timeout: 1000 });

    // Profile loading should be in background (may be loading or loaded by now)
    const profileStatus = screen.getByTestId('profile-status').textContent;
    expect(['loading', 'loaded']).toContain(profileStatus);
  });

  it('should handle no session without blocking', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null }
    });

    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      return (
        <div>
          <div data-testid="loading">{auth?.isLoading ? 'loading' : 'not-loading'}</div>
          <div data-testid="initialized">{auth?.isInitialized ? 'initialized' : 'not-initialized'}</div>
          <div data-testid="session">{auth?.session ? 'has-session' : 'no-session'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should complete initialization quickly
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('initialized')).toHaveTextContent('initialized');
      expect(screen.getByTestId('session')).toHaveTextContent('no-session');
    }, { timeout: 500 });
  });

  it('should handle session establishment errors gracefully', async () => {
    (supabase.auth.getSession as any).mockRejectedValue(new Error('Session error'));

    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      return (
        <div>
          <div data-testid="loading">{auth?.isLoading ? 'loading' : 'not-loading'}</div>
          <div data-testid="initialized">{auth?.isInitialized ? 'initialized' : 'not-initialized'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should still complete initialization even on error
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('initialized')).toHaveTextContent('initialized');
    }, { timeout: 1000 });
  });
});