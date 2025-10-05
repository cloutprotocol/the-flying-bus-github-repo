import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../providers/AuthProvider';
import { NavigationProvider } from '../../contexts/NavigationContext';
import App from '../../App';
import Index from '../../pages/Index';
import Dashboard from '../../pages/Admin/Dashboard';
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
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
    })),
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

describe('Authentication Data Loading Comprehensive Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Requirement 1.1: Immediate Data Loading After Authentication', () => {
    it('should load content immediately after successful login', async () => {
      // Mock successful login
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock article data
      const mockArticles = [
        { id: 1, title: 'Test Article', content: 'Test content', published: true },
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

      // Wait for content to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify content is displayed
      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });
    });

    it('should handle navigation from admin dashboard to home page with immediate content loading', async () => {
      const mockSession = {
        user: { id: 'admin-user', email: 'admin@example.com' },
        access_token: 'admin-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock admin profile
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'admin-user', role: 'admin' },
                  error: null,
                }),
              }),
            }),
          };
        }
        // Mock articles
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 1, title: 'Home Article', published: true }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      });

      const { rerender } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Wait for admin dashboard to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Navigate to home page
      rerender(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Verify immediate content loading
      await waitFor(() => {
        expect(screen.getByText('Home Article')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Requirement 1.2: Page Refresh Content Loading', () => {
    it('should load content after page refresh when authenticated', async () => {
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockArticles = [
        { id: 1, title: 'Refreshed Article', content: 'Content after refresh', published: true },
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
        expect(screen.getByText('Refreshed Article')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 2.1: Authentication State Independence', () => {
    it('should execute data queries successfully during auth state establishment', async () => {
      let authStateChangeCallback: any;
      
      (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
        authStateChangeCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const mockArticles = [
        { id: 1, title: 'Independent Article', published: true },
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

      // Simulate auth state change during data loading
      if (authStateChangeCallback) {
        authStateChangeCallback('SIGNED_IN', {
          user: { id: 'test-user' },
          access_token: 'token',
        });
      }

      await waitFor(() => {
        expect(screen.getByText('Independent Article')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.1-3.3: Data Loading Independence', () => {
    it('should load published content when not logged in', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockArticles = [
        { id: 1, title: 'Public Article', published: true },
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
    });

    it('should maintain content access during session establishment', async () => {
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

      // Content should load even without session
      await waitFor(() => {
        expect(screen.getByText('Persistent Article')).toBeInTheDocument();
      });

      // Simulate session establishment
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { 
          session: { 
            user: { id: 'test-user' }, 
            access_token: 'token' 
          } 
        },
        error: null,
      });

      // Content should remain accessible
      expect(screen.getByText('Persistent Article')).toBeInTheDocument();
    });
  });

  describe('Requirement 4.1-4.4: Admin Dashboard Data Loading', () => {
    it('should load admin dashboard data immediately after login', async () => {
      const mockSession = {
        user: { id: 'admin-user', email: 'admin@example.com' },
        access_token: 'admin-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock admin data
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'admin-user', role: 'admin' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'invitation_tokens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 1, email: 'test@example.com', status: 'pending' }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        };
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Performance Requirements', () => {
    it('should load data within 2 seconds after authentication', async () => {
      const startTime = Date.now();

      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockArticles = [
        { id: 1, title: 'Performance Article', published: true },
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
        expect(screen.getByText('Performance Article')).toBeInTheDocument();
      });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });
  });
});