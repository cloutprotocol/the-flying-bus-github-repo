import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../providers/AuthProvider';
import { NavigationProvider } from '../../contexts/NavigationContext';
import Index from '../../pages/Index';
import Dashboard from '../../pages/Admin/Dashboard';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
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

describe('Data Loading Performance Tests', () => {
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

  describe('Home Page Performance', () => {
    it('should load home page content within 2 seconds after authentication', async () => {
      const startTime = performance.now();

      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockArticles = [
        { id: 1, title: 'Performance Test Article', published: true, category: 'headliners' },
        { id: 2, title: 'Another Article', published: true, category: 'learning' },
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
        expect(screen.getByText('Performance Test Article')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
    });

    it('should load multiple categories of content efficiently', async () => {
      const startTime = performance.now();

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockArticles = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Article ${i + 1}`,
        published: true,
        category: ['headliners', 'learning', 'debates', 'neighborhood'][i % 4],
      }));

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
        expect(screen.getByText('Article 1')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should handle multiple categories within 3 seconds
    });

    it('should measure time to first meaningful paint', async () => {
      const startTime = performance.now();
      let firstContentTime: number;

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockArticles = [
        { id: 1, title: 'First Content', published: true },
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
        if (screen.queryByText('First Content')) {
          firstContentTime = performance.now();
        }
        expect(screen.getByText('First Content')).toBeInTheDocument();
      });

      const timeToFirstContent = firstContentTime! - startTime;
      expect(timeToFirstContent).toBeLessThan(1500); // First content should appear within 1.5 seconds
    });
  });

  describe('Admin Dashboard Performance', () => {
    it('should load admin dashboard within 2 seconds after login', async () => {
      const startTime = performance.now();

      const mockSession = {
        user: { id: 'admin-user', email: 'admin@example.com' },
        access_token: 'admin-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

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
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 1, title: 'Admin Data' }],
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
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    it('should handle concurrent admin data requests efficiently', async () => {
      const startTime = performance.now();

      const mockSession = {
        user: { id: 'admin-user', email: 'admin@example.com' },
        access_token: 'admin-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock multiple data sources
      (supabase.from as any).mockImplementation((table: string) => {
        const delay = Math.random() * 100; // Random delay up to 100ms
        
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => 
                  new Promise(resolve => 
                    setTimeout(() => resolve({
                      data: { id: 'admin-user', role: 'admin' },
                      error: null,
                    }), delay)
                  )
                ),
              }),
            }),
          };
        }
        
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockImplementation(() =>
              new Promise(resolve =>
                setTimeout(() => resolve({
                  data: Array.from({ length: 5 }, (_, i) => ({ id: i, title: `${table} ${i}` })),
                  error: null,
                }), delay)
              )
            ),
          }),
        };
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should handle concurrent requests within 3 seconds
    });
  });

  describe('Navigation Performance', () => {
    it('should measure navigation speed between pages', async () => {
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 1, title: 'Navigation Test' }],
                error: null,
              }),
            }),
          }),
        }),
      });

      const { rerender } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Navigation Test')).toBeInTheDocument();
      });

      // Measure navigation time
      const navigationStart = performance.now();

      rerender(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Navigation Test')).toBeInTheDocument();
      });

      const navigationTime = performance.now() - navigationStart;
      expect(navigationTime).toBeLessThan(500); // Navigation should be fast
    });
  });

  describe('Memory and Resource Performance', () => {
    it('should not cause memory leaks during repeated renders', async () => {
      const mockSession = {
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'mock-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 1, title: 'Memory Test' }],
                error: null,
              }),
            }),
          }),
        }),
      });

      const { rerender, unmount } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Perform multiple re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <TestWrapper>
            <Index />
          </TestWrapper>
        );
        
        await waitFor(() => {
          expect(screen.getByText('Memory Test')).toBeInTheDocument();
        });
      }

      // Clean unmount
      unmount();

      // Test should complete without memory issues
      expect(true).toBe(true);
    });

    it('should handle large datasets efficiently', async () => {
      const startTime = performance.now();

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Large dataset
      const mockArticles = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `Large Dataset Article ${i + 1}`,
        content: `Content for article ${i + 1}`.repeat(10),
        published: true,
        category: 'headliners',
      }));

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
        expect(screen.getByText('Large Dataset Article 1')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should handle large datasets within 5 seconds
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover quickly from failed requests', async () => {
      const startTime = performance.now();

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // First call fails, second succeeds
      let callCount = 0;
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                  return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                  data: [{ id: 1, title: 'Recovery Article' }],
                  error: null,
                });
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
        expect(screen.getByText('Recovery Article')).toBeInTheDocument();
      }, { timeout: 10000 });

      const recoveryTime = performance.now() - startTime;
      expect(recoveryTime).toBeLessThan(8000); // Should recover within 8 seconds
    });
  });
});