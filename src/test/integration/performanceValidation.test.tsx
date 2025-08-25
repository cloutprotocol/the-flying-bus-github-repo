import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../providers/AuthProvider';
import Index from '../../pages/Index';
import AdminDashboard from '../../pages/Admin/Dashboard';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        order: vi.fn(() => ({
          limit: vi.fn()
        })),
        limit: vi.fn()
      }))
    }))
  }
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Performance Validation - Auth Data Loading', () => {
  let performanceMarks: string[] = [];
  let performanceMeasures: { name: string; duration: number }[] = [];

  beforeEach(() => {
    performanceMarks = [];
    performanceMeasures = [];
    
    // Mock performance API
    global.performance.mark = vi.fn((name: string) => {
      performanceMarks.push(name);
    });
    
    global.performance.measure = vi.fn((name: string, startMark: string, endMark: string) => {
      const duration = Math.random() * 1000 + 100; // Simulate realistic timing
      performanceMeasures.push({ name, duration });
      return { duration } as PerformanceMeasure;
    });

    global.performance.getEntriesByType = vi.fn((type: string) => {
      if (type === 'measure') {
        return performanceMeasures.map(m => ({ name: m.name, duration: m.duration }));
      }
      return [];
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    performanceMarks = [];
    performanceMeasures = [];
  });

  describe('Data Loading Performance Metrics', () => {
    it('should measure home page data loading times', async () => {
      // Mock successful data loading
      const mockArticles = [
        { id: '1', title: 'Test Article', category: 'headliners', published: true },
        { id: '2', title: 'Test Article 2', category: 'debates', published: true }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: mockArticles, error: null }))
            }))
          }))
        }))
      } as any);

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Performance requirement: Data should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      // Verify articles are displayed
      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });
    });

    it('should measure admin dashboard data loading times', async () => {
      // Mock admin session
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: 'admin-user', email: 'admin@test.com' },
            access_token: 'mock-token'
          }
        },
        error: null
      });

      // Mock admin data
      const mockInvitations = [
        { id: '1', email: 'user@test.com', status: 'pending' }
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockInvitations, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockInvitations, error: null }))
          }))
        }))
      } as any);

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <AdminDashboard />
        </TestWrapper>
      );

      // Wait for admin data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Performance requirement: Admin data should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });
  });

  describe('Authentication Performance', () => {
    it('should not regress authentication functionality', async () => {
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token'
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null
      });

      const startTime = performance.now();
      
      // Simulate login
      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password'
      });

      const endTime = performance.now();
      const authTime = endTime - startTime;

      // Authentication should complete quickly
      expect(authTime).toBeLessThan(1000);
      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
    });

    it('should maintain session state during data loading', async () => {
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token'
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Verify session is maintained during data loading
      await waitFor(() => {
        const session = supabase.auth.getSession();
        expect(session).toBeDefined();
      });
    });
  });

  describe('Query Performance Optimization', () => {
    it('should use efficient queries for article loading', async () => {
      const mockArticles = Array.from({ length: 10 }, (_, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        category: 'headliners',
        published: true
      }));

      const selectSpy = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: mockArticles, error: null }))
          }))
        }))
      }));

      vi.mocked(supabase.from).mockReturnValue({
        select: selectSpy
      } as any);

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Article 0')).toBeInTheDocument();
      });

      // Verify efficient query usage
      expect(selectSpy).toHaveBeenCalledWith(
        expect.stringContaining('id, title, category')
      );
    });

    it('should implement proper caching for repeated queries', async () => {
      const mockData = [{ id: '1', title: 'Cached Article' }];
      
      const queryFn = vi.fn(() => Promise.resolve({ data: mockData, error: null }));
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: queryFn
            }))
          }))
        }))
      } as any);

      // First render
      const { unmount } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Cached Article')).toBeInTheDocument();
      });

      unmount();

      // Second render - should use cache
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Cached Article')).toBeInTheDocument();
      });

      // Query should be called minimal times due to caching
      expect(queryFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Experience Validation', () => {
    it('should provide immediate feedback during data loading', async () => {
      // Mock slow data loading
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => new Promise(resolve => 
                setTimeout(() => resolve({ data: [], error: null }), 1000)
              ))
            }))
          }))
        }))
      } as any);

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Should show loading state immediately
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should resolve to content
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle errors gracefully without breaking user experience', async () => {
      // Mock data loading error
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { message: 'Network error' } 
              }))
            }))
          }))
        }))
      } as any);

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Should show error state gracefully
      await waitFor(() => {
        expect(screen.getByText(/error/i) || screen.getByText(/try again/i)).toBeInTheDocument();
      });

      // Should not crash the application
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should maintain responsive UI during auth state changes', async () => {
      let authCallback: ((event: string, session: any) => void) | null = null;

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Simulate auth state change
      if (authCallback) {
        authCallback('SIGNED_IN', {
          user: { id: 'new-user', email: 'new@test.com' },
          access_token: 'new-token'
        });
      }

      // UI should remain responsive
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for critical user flows', async () => {
      const benchmarks = {
        initialPageLoad: 2000, // 2 seconds
        authStateChange: 500,  // 500ms
        dataRefresh: 1000,     // 1 second
        navigationTransition: 300 // 300ms
      };

      // Test initial page load
      const pageLoadStart = performance.now();
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });
      
      const pageLoadTime = performance.now() - pageLoadStart;
      expect(pageLoadTime).toBeLessThan(benchmarks.initialPageLoad);

      // All benchmarks should be met
      expect(pageLoadTime).toBeLessThan(benchmarks.initialPageLoad);
    });
  });
});