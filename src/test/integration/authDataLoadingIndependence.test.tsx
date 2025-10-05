import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

vi.mock('@/services/authService', () => ({
  fetchUserProfile: vi.fn().mockImplementation(() => 
    new Promise(resolve => setTimeout(() => resolve({
      id: 'test-user-id',
      username: 'testuser',
      display_name: 'Test User',
      email: 'test@example.com',
      role: 'reader'
    }), 100)) // Simulate slow profile loading
  ),
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

describe('Auth Data Loading Independence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow data loading to proceed while profile is loading in background', async () => {
    const mockSession = {
      user: { id: 'test-user-id', email_confirmed_at: new Date().toISOString() },
      access_token: 'test-token'
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });

    // Mock data loading query
    const mockDataQuery = vi.fn().mockResolvedValue({
      data: [{ id: 1, title: 'Test Article' }],
      error: null
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockDataQuery
        })
      })
    });

    const DataLoadingComponent = () => {
      const [data, setData] = React.useState(null);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        // Simulate data loading that should work independently of auth
        const loadData = async () => {
          try {
            const result = await supabase
              .from('articles')
              .select('*')
              .eq('published', true)
              .single();
            
            setData(result.data);
          } catch (error) {
            console.error('Data loading error:', error);
          } finally {
            setLoading(false);
          }
        };

        loadData();
      }, []);

      return (
        <div>
          <div data-testid="data-loading">{loading ? 'loading' : 'loaded'}</div>
          <div data-testid="data-content">{data ? 'has-data' : 'no-data'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <DataLoadingComponent />
      </AuthProvider>
    );

    // Data loading should complete quickly, independent of auth profile loading
    await waitFor(() => {
      expect(screen.getByTestId('data-loading')).toHaveTextContent('loaded');
      expect(screen.getByTestId('data-content')).toHaveTextContent('has-data');
    }, { timeout: 500 });

    // Verify that data query was called (not blocked by auth)
    expect(mockDataQuery).toHaveBeenCalled();
  });

  it('should not cancel data requests when auth state changes', async () => {
    const mockSession = {
      user: { id: 'test-user-id', email_confirmed_at: new Date().toISOString() },
      access_token: 'test-token'
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockSession }
    });

    let authStateChangeCallback: any;
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // Mock data loading query
    const mockDataQuery = vi.fn().mockResolvedValue({
      data: [{ id: 1, title: 'Test Article' }],
      error: null
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: mockDataQuery
        })
      })
    });

    const DataLoadingComponent = () => {
      const [requestCount, setRequestCount] = React.useState(0);
      const [data, setData] = React.useState(null);

      React.useEffect(() => {
        const loadData = async () => {
          setRequestCount(prev => prev + 1);
          try {
            const result = await supabase
              .from('articles')
              .select('*')
              .eq('published', true)
              .single();
            
            setData(result.data);
          } catch (error) {
            console.error('Data loading error:', error);
          }
        };

        loadData();
      }, []);

      return (
        <div>
          <div data-testid="request-count">{requestCount}</div>
          <div data-testid="data-content">{data ? 'has-data' : 'no-data'}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <DataLoadingComponent />
      </AuthProvider>
    );

    // Wait for initial data loading
    await waitFor(() => {
      expect(screen.getByTestId('data-content')).toHaveTextContent('has-data');
    });

    const initialRequestCount = parseInt(screen.getByTestId('request-count').textContent || '0');

    // Simulate auth state change (token refresh)
    if (authStateChangeCallback) {
      authStateChangeCallback('TOKEN_REFRESHED', {
        ...mockSession,
        access_token: 'new-token'
      });
    }

    // Wait a bit to see if any additional requests are made
    await new Promise(resolve => setTimeout(resolve, 100));

    // Request count should not increase due to auth state change
    const finalRequestCount = parseInt(screen.getByTestId('request-count').textContent || '0');
    expect(finalRequestCount).toBe(initialRequestCount);
  });
});