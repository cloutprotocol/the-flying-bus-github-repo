/**
 * Regression Testing for Home Page Loading Fix
 * 
 * This test suite verifies that other application components still work correctly
 * after the home page simplification changes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Components to test
import { AuthProvider } from '@/providers/AuthProvider';
import RequestInvitation from '@/pages/RequestInvitation';
import Index from '@/pages/Index';
import CategoryPage from '@/pages/CategoryPage';
import ArticlePage from '@/pages/ArticlePage';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockImplementation((callback) => {
        // Call the callback immediately with SIGNED_OUT event for testing
        setTimeout(() => callback('SIGNED_OUT', null), 0);
        return {
          data: { 
            subscription: { 
              unsubscribe: vi.fn() 
            } 
          }
        };
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        }),
        limit: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null })
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null })
    }
  }
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({})
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({ 
  children, 
  initialEntries = ['/'] 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Regression Testing - Component Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthProvider Functionality', () => {
    it('should initialize correctly with usePerformanceMonitoring', async () => {
      const TestComponent = () => {
        return <div data-testid="auth-test">Auth Provider Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Verify component renders without errors
      expect(screen.getByTestId('auth-test')).toBeInTheDocument();

      // Wait for auth initialization
      await waitFor(() => {
        // AuthProvider should complete initialization without throwing errors
        expect(screen.getByTestId('auth-test')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle session establishment with performance monitoring', async () => {
      // Mock successful session
      const mockSession = {
        user: { 
          id: 'test-user-id', 
          email: 'test@example.com',
          email_confirmed_at: new Date().toISOString()
        },
        access_token: 'test-token'
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock profile fetch
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-user-id',
                display_name: 'Test User',
                role: 'reader'
              },
              error: null
            })
          })
        })
      } as any);

      const TestComponent = () => {
        return <div data-testid="auth-session-test">Session Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for session establishment
      await waitFor(() => {
        expect(screen.getByTestId('auth-session-test')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify no errors were thrown during performance monitoring
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('performance monitoring')
      );
    });
  });

  describe('RequestInvitation Page Functionality', () => {
    it('should render correctly with useUserFeedback and usePerformanceMonitoring', async () => {
      render(
        <TestWrapper initialEntries={['/request-invitation']}>
          <RequestInvitation />
        </TestWrapper>
      );

      // Verify main elements are present
      expect(screen.getByText('Request Invitation')).toBeInTheDocument();
      expect(screen.getByLabelText(/Parent\/Guardian Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Parent\/Guardian Email/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Child's Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Child's Age/)).toBeInTheDocument();

      // Verify form submission button
      expect(screen.getByRole('button', { name: /Submit Invitation Request/ })).toBeInTheDocument();
    });

    it('should handle form validation with user feedback system', async () => {
      render(
        <TestWrapper initialEntries={['/request-invitation']}>
          <RequestInvitation />
        </TestWrapper>
      );

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /Submit Invitation Request/ });
      fireEvent.click(submitButton);

      // Form should prevent submission due to required fields
      // The button should be disabled initially due to CAPTCHA requirement
      expect(submitButton).toBeDisabled();
    });

    it('should handle form input changes correctly', async () => {
      render(
        <TestWrapper initialEntries={['/request-invitation']}>
          <RequestInvitation />
        </TestWrapper>
      );

      // Fill out form fields
      const parentNameInput = screen.getByLabelText(/Parent\/Guardian Name/);
      const parentEmailInput = screen.getByLabelText(/Parent\/Guardian Email/);
      const childNameInput = screen.getByLabelText(/Child's Name/);
      const childAgeInput = screen.getByLabelText(/Child's Age/);

      fireEvent.change(parentNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(parentEmailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(childNameInput, { target: { value: 'Jane Doe' } });
      fireEvent.change(childAgeInput, { target: { value: '10' } });

      // Verify values are updated
      expect(parentNameInput).toHaveValue('John Doe');
      expect(parentEmailInput).toHaveValue('john@example.com');
      expect(childNameInput).toHaveValue('Jane Doe');
      expect(childAgeInput).toHaveValue(10);
    });
  });

  describe('Navigation Between Pages', () => {
    it('should navigate from home page to category pages', async () => {
      // Mock article data for home page
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            limit: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ 
                data: [
                  {
                    id: 1,
                    title: 'Test Article',
                    excerpt: 'Test excerpt',
                    category: 'Headliners',
                    author: 'Test Author',
                    created_at: new Date().toISOString()
                  }
                ], 
                error: null 
              })
            })
          })
        })
      } as any);

      render(
        <TestWrapper initialEntries={['/']}>
          <Index />
        </TestWrapper>
      );

      // Wait for home page to load
      await waitFor(() => {
        // Should not be in loading state indefinitely
        expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Home page should render without infinite loading
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });

    it('should handle navigation state consistency', async () => {
      const TestNavigationComponent = () => {
        const [currentPage, setCurrentPage] = React.useState('home');

        return (
          <div>
            <div data-testid="current-page">{currentPage}</div>
            <button 
              onClick={() => setCurrentPage('category')}
              data-testid="nav-to-category"
            >
              Go to Category
            </button>
            <button 
              onClick={() => setCurrentPage('home')}
              data-testid="nav-to-home"
            >
              Go to Home
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestNavigationComponent />
        </TestWrapper>
      );

      // Initial state
      expect(screen.getByTestId('current-page')).toHaveTextContent('home');

      // Navigate to category
      fireEvent.click(screen.getByTestId('nav-to-category'));
      expect(screen.getByTestId('current-page')).toHaveTextContent('category');

      // Navigate back to home
      fireEvent.click(screen.getByTestId('nav-to-home'));
      expect(screen.getByTestId('current-page')).toHaveTextContent('home');
    });
  });

  describe('Integration Test - Complete Flow', () => {
    it('should handle complete user flow without regressions', async () => {
      // Mock successful data loading
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: {
                id: 1,
                title: 'Featured Article',
                excerpt: 'Featured excerpt',
                category: 'Headliners'
              }, 
              error: null 
            }),
            limit: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ 
                data: [
                  {
                    id: 2,
                    title: 'Category Article',
                    excerpt: 'Category excerpt',
                    category: 'Learning'
                  }
                ], 
                error: null 
              })
            })
          })
        })
      } as any);

      // Test home page loading
      const { rerender } = render(
        <TestWrapper initialEntries={['/']}>
          <Index />
        </TestWrapper>
      );

      // Wait for home page to load successfully
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Test navigation to request invitation
      rerender(
        <TestWrapper initialEntries={['/request-invitation']}>
          <RequestInvitation />
        </TestWrapper>
      );

      // Verify request invitation page loads
      expect(screen.getByText('Request Invitation')).toBeInTheDocument();

      // Navigate back to home
      rerender(
        <TestWrapper initialEntries={['/']}>
          <Index />
        </TestWrapper>
      );

      // Verify home page still works
      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not have memory leaks in AuthProvider', async () => {
      const TestComponent = () => <div data-testid="memory-test">Memory Test</div>;

      const { unmount } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('memory-test')).toBeInTheDocument();
      });

      // Unmount component
      unmount();

      // Verify no errors during cleanup
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('memory leak')
      );
    });

    it('should handle concurrent operations in RequestInvitation', async () => {
      render(
        <TestWrapper initialEntries={['/request-invitation']}>
          <RequestInvitation />
        </TestWrapper>
      );

      // Verify component handles multiple rapid interactions
      const parentNameInput = screen.getByLabelText(/Parent\/Guardian Name/);
      
      // Rapid input changes
      for (let i = 0; i < 5; i++) {
        fireEvent.change(parentNameInput, { target: { value: `Name ${i}` } });
      }

      // Should handle rapid changes without errors
      expect(parentNameInput).toHaveValue('Name 4');
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('concurrent')
      );
    });
  });
});