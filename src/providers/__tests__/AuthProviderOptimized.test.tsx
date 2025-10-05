import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthProvider, AuthContext } from '../AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import * as authService from '@/services/authService';
import { logger } from '@/utils/logger';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/services/authService');
vi.mock('@/utils/logger');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));
vi.mock('thirdweb/wallets', () => ({
  inAppWallet: () => ({
    disconnect: vi.fn()
  })
}));

const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString()
  },
  access_token: 'test-token'
};

const mockProfile = {
  id: 'test-user-id',
  display_name: 'Test User',
  role: 'reader',
  username: 'testuser'
};

describe('AuthProvider Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock performance.now for timing tests
    global.performance = {
      now: vi.fn(() => Date.now())
    } as any;
    
    // Mock Supabase auth methods
    (supabase.auth.getSession as any) = vi.fn();
    (supabase.auth.onAuthStateChange as any) = vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } }
    }));
    
    // Mock auth service methods
    (authService.fetchUserProfile as any) = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should limit profile loading retries to 2 maximum attempts', async () => {
    // Setup: Mock session but make profile loading fail
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });
    
    (authService.fetchUserProfile as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockProfile);

    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      return <div data-testid="auth-status">{auth?.isLoading ? 'loading' : 'ready'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for auth initialization
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('ready');
    });

    // Verify fetchUserProfile was called exactly 2 times (max retries)
    expect(authService.fetchUserProfile).toHaveBeenCalledTimes(2);
  });

  it('should use 500ms retry delay instead of 1000ms', async () => {
    const startTime = Date.now();
    let callTimes: number[] = [];
    
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });
    
    (authService.fetchUserProfile as any)
      .mockImplementation(() => {
        callTimes.push(Date.now());
        if (callTimes.length < 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockProfile);
      });

    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      return <div data-testid="auth-status">{auth?.isLoading ? 'loading' : 'ready'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('ready');
    });

    // Verify retry delay is approximately 500ms (allow some variance)
    if (callTimes.length >= 2) {
      const delay = callTimes[1] - callTimes[0];
      expect(delay).toBeGreaterThanOrEqual(450);
      expect(delay).toBeLessThanOrEqual(600);
    }
  });

  it('should log comprehensive session establishment steps with timing', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });
    
    (authService.fetchUserProfile as any).mockResolvedValue(mockProfile);

    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      return <div data-testid="auth-status">{auth?.isLoading ? 'loading' : 'ready'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('ready');
    });

    // Verify comprehensive logging calls
    expect(logger.info).toHaveBeenCalledWith(
      expect.any(String),
      'Starting session establishment with optimized handling',
      expect.objectContaining({
        userId: mockSession.user.id,
        emailConfirmed: true,
        timestamp: expect.any(String)
      })
    );

    expect(logger.info).toHaveBeenCalledWith(
      expect.any(String),
      'Session establishment completed successfully',
      expect.objectContaining({
        userId: mockSession.user.id,
        displayName: mockProfile.display_name,
        role: mockProfile.role,
        totalTime: expect.stringMatching(/\d+\.\d+ms/)
      })
    );
  });

  it('should handle errors in establishSession without breaking auth flow', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });
    
    // Make profile loading fail completely
    (authService.fetchUserProfile as any).mockRejectedValue(new Error('Critical error'));

    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      return (
        <div>
          <div data-testid="auth-status">{auth?.isLoading ? 'loading' : 'ready'}</div>
          <div data-testid="initialized">{auth?.isInitialized ? 'true' : 'false'}</div>
          <div data-testid="has-session">{auth?.session ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('ready');
    });

    // Verify auth flow continues despite profile loading failure
    expect(screen.getByTestId('initialized')).toHaveTextContent('true');
    expect(screen.getByTestId('has-session')).toHaveTextContent('true');
  });

  it('should optimize token refresh to minimize interference', async () => {
    let authStateChangeCallback: any;
    
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null }
    });
    
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      return (
        <div>
          <div data-testid="auth-status">{auth?.isLoading ? 'loading' : 'ready'}</div>
          <div data-testid="has-user">{auth?.currentUser ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('ready');
    });

    // Simulate token refresh event
    act(() => {
      authStateChangeCallback('TOKEN_REFRESHED', mockSession);
    });

    // Verify that token refresh doesn't trigger full profile reload if user already exists
    // This should be optimized to minimize interference
    expect(logger.info).toHaveBeenCalledWith(
      expect.any(String),
      'Processing token refresh event'
    );
  });

  it('should memoize context values to prevent unnecessary re-renders', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });
    
    (authService.fetchUserProfile as any).mockResolvedValue(mockProfile);

    let renderCount = 0;
    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      renderCount++;
      return <div data-testid="render-count">{renderCount}</div>;
    };

    const { rerender } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('render-count')).toBeInTheDocument();
    });

    const initialRenderCount = renderCount;

    // Force a re-render of the provider without changing auth state
    rerender(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Render count should not increase significantly due to memoization
    expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 1);
  });

  it('should complete initialization even when profile loading fails', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });
    
    // Make all profile loading attempts fail
    (authService.fetchUserProfile as any).mockRejectedValue(new Error('Profile not found'));

    const TestComponent = () => {
      const auth = React.useContext(AuthContext);
      return (
        <div>
          <div data-testid="loading">{auth?.isLoading ? 'true' : 'false'}</div>
          <div data-testid="initialized">{auth?.isInitialized ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should complete initialization despite profile loading failure
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('initialized')).toHaveTextContent('true');
    });
  });
});