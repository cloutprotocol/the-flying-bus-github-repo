import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../providers/AuthProvider';
import { NavigationProvider } from '../../contexts/NavigationContext';
import Index from '../../pages/Index';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NavigationProvider>
            {children}
          </NavigationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Public Content Access During Auth State Changes', () => {
  let queryClient: QueryClient;
  let authStateChangeCallback: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
      authStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Requirement 3.1: Public Content Access When Not Logged In', () => {
    it('should load published articles when user is not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockArticles = [
        { 
          id: 1, 
          title: 'Public Article 1', 
          content: 'Public content', 
          published: true,
          category: 'headliners',
        },
        { 
          id: 2, 
          title: 'Public Article 2', 
          content: 'More public content', 
          published: true,
          category: 'learning',
        },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockArticles,
                error: null,
              }),
            }),
          }),
        }),
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Article 1')).toBeInTheDocument();
        expect(screen.getByText('Public Article 2')).toBeInTheDocument();
      });
    });

    it('should not show private content when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockArticles = [
        { 
          id: 1, 
          title: 'Public Article', 
          published: true,
        },
        // Private article should not be returned by query
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockArticles,
                error: null,
              }),
            }),
          }),
        }),
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Article')).toBeInTheDocument();
      });

      // Should not show any private content indicators
      expect(screen.queryByText('Private')).not.toBeInTheDocument();
      expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.2: Content Access During Session Establishment', () => {
    it('should maintain content access while session is being established', async () => {
      // Start with no session
      (supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const mockArticles = [
        { id: 1, title: 'Persistent Article', published: true },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockArticles,
                error: null,
              }),
            }),
          }),
        }),
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Content should load initially
      await waitFor(() => {
        expect(screen.getByText('Persistent Article')).toBeInTheDocument();
      });

      // Simulate session establishment
      if (authStateChangeCallback) {
        authStateChangeCallback('SIGNED_IN', {
          user: { id: 'test-user', email: 'test@example.com' },
          access_token: 'new-token',
        });
      }

      // Content should remain visible during auth state change
      expect(screen.getByText('Persistent Article')).toBeInTheDocument();

      // Wait for any potential re-renders
      await waitFor(() => {
        expect(screen.getByText('Persistent Article')).toBeInTheDocument();
      });
    });

    it('should handle multiple rapid auth state changes without losing content', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockArticles = [
        { id: 1, title: 'Stable Article', published: true },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockArticles,
                error: null,
              }),
            }),
          }),
        }),
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Stable Article')).toBeInTheDocument();
      });

      // Simulate rapid auth state changes
      if (authStateChangeCallback) {
        authStateChangeCallback('SIGNED_IN', { user: { id: '1' } });
        authStateChangeCallback('TOKEN_REFRESHED', { user: { id: '1' } });
        authStateChangeCallback('SIGNED_OUT', null);
        authStateChangeCallback('SIGNED_IN', { user: { id: '1' } });
      }

      // Content should remain stable
      await waitFor(() => {
        expect(screen.getByText('Stable Article')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.3: Content Access During Authentication Errors', () => {
    it('should maintain public content access when authentication fails', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: { message: 'Authentication failed' },
      });

      const mockArticles = [
        { id: 1, title: 'Fallback Article', published: true },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockArticles,
                error: null,
              }),
            }),
          }),
        }),
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Fallback Article')).toBeInTheDocument();
      });

      // Should not show authentication error to user in content area
      expect(screen.queryByText('Authentication failed')).not.toBeInTheDocument();
    });

    it('should handle profile loading errors gracefully while maintaining content', async () => {
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockArticles = [
        { id: 1, title: 'Content Despite Profile Error', published: true },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockRejectedValue(new Error('Profile loading failed')),
              }),
            }),
          };
        }
        // Articles should still load
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockArticles,
                  error: null,
                }),
              }),
            }),
          }),
        };
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Content Despite Profile Error')).toBeInTheDocument();
      });
    });
  });

  describe('Auth State Transition Scenarios', () => {
    it('should handle login → logout → login cycle while maintaining content access', async () => {
      const mockArticles = [
        { id: 1, title: 'Cycle Test Article', published: true },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockArticles,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Start logged out
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Cycle Test Article')).toBeInTheDocument();
      });

      // Simulate login
      if (authStateChangeCallback) {
        authStateChangeCallback('SIGNED_IN', {
          user: { id: 'test-user' },
          access_token: 'token',
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Cycle Test Article')).toBeInTheDocument();
      });

      // Simulate logout
      if (authStateChangeCallback) {
        authStateChangeCallback('SIGNED_OUT', null);
      }

      await waitFor(() => {
        expect(screen.getByText('Cycle Test Article')).toBeInTheDocument();
      });

      // Simulate login again
      if (authStateChangeCallback) {
        authStateChangeCallback('SIGNED_IN', {
          user: { id: 'test-user-2' },
          access_token: 'token-2',
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Cycle Test Article')).toBeInTheDocument();
      });
    });

    it('should handle token refresh without interrupting content display', async () => {
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'initial-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockArticles = [
        { id: 1, title: 'Token Refresh Article', published: true },
      ];

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockArticles,
                error: null,
              }),
            }),
          }),
        }),
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Token Refresh Article')).toBeInTheDocument();
      });

      // Simulate token refresh
      if (authStateChangeCallback) {
        authStateChangeCallback('TOKEN_REFRESHED', {
          user: { id: 'test-user', email: 'test@example.com' },
          access_token: 'refreshed-token',
        });
      }

      // Content should remain visible during token refresh
      expect(screen.getByText('Token Refresh Article')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Token Refresh Article')).toBeInTheDocument();
      });
    });
  });
});