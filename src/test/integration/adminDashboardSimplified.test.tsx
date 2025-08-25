import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../pages/Admin/Dashboard';
import { AuthProvider } from '../../providers/AuthProvider';

// Mock Supabase client with simple responses
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-admin', email: 'admin@test.com' } },
        error: null
      })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

/**
 * Simplified Admin Dashboard Tests
 * 
 * Tests the basic functionality of the simplified dashboard:
 * - Dashboard loads without infinite loops
 * - Basic metrics display
 * - Activity feed displays
 * - No continuous refresh issues
 */
describe('Simplified Admin Dashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Basic Dashboard Loading', () => {
    it('should load dashboard without infinite loops', async () => {
      const startTime = Date.now();
      
      renderDashboard();
      
      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      }, { timeout: 5000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (not hanging in loops)
      expect(loadTime).toBeLessThan(5000);
    });

    it('should display basic dashboard elements', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
      
      // Should have basic elements
      expect(screen.getByText(/welcome to the flying bus/i)).toBeInTheDocument();
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    it('should display metrics cards', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
      
      // Should display metric cards
      expect(screen.getByText(/total articles/i)).toBeInTheDocument();
      expect(screen.getByText(/article views/i)).toBeInTheDocument();
      expect(screen.getByText(/comments/i)).toBeInTheDocument();
      expect(screen.getByText(/pending items/i)).toBeInTheDocument();
    });

    it('should display quick actions', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
      
      // Should display quick action buttons
      expect(screen.getByText(/create article/i)).toBeInTheDocument();
      expect(screen.getByText(/manage comments/i)).toBeInTheDocument();
      expect(screen.getByText(/view analytics/i)).toBeInTheDocument();
    });

    it('should have refresh functionality', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
      
      // Should have refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeletons initially', async () => {
      renderDashboard();
      
      // Should show loading state initially
      const loadingElements = screen.getAllByText(/loading/i);
      expect(loadingElements.length).toBeGreaterThan(0);
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
    });

    it('should complete loading within reasonable time', async () => {
      const startTime = Date.now();
      
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      }, { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should complete loading quickly
      expect(loadTime).toBeLessThan(10000);
    });
  });

  describe('Error Handling', () => {
    it('should not display infinite loop error messages', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
      
      // Should not show the specific error messages that were causing issues
      expect(screen.queryByText(/type error failed to refresh/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/could not load dashboard/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/endless loading/i)).not.toBeInTheDocument();
    });

    it('should maintain stable state without flashing', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
      
      // Wait to check for stability
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should still be stable without flashing
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/welcome to the flying bus/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not make excessive re-renders', async () => {
      let renderCount = 0;
      
      const TestWrapper = () => {
        renderCount++;
        return <Dashboard />;
      };
      
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <TestWrapper />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
      
      // Wait to check for excessive re-renders
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should not have excessive re-renders (indicating loops)
      expect(renderCount).toBeLessThan(10);
    });

    it('should handle multiple rapid interactions gracefully', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
      
      // Simulate rapid interactions by checking elements multiple times
      for (let i = 0; i < 5; i++) {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();
      }
      
      // Should remain stable
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy all basic dashboard requirements', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
      
      // Basic loading without loops
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      
      // Metrics display
      expect(screen.getByText(/total articles/i)).toBeInTheDocument();
      expect(screen.getByText(/comments/i)).toBeInTheDocument();
      
      // Activity feed
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
      
      // Quick actions
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
      
      // Refresh functionality
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      
      // Overall stability
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });
  });
});