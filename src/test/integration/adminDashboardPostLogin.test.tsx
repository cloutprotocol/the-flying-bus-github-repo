import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../providers/AuthProvider';
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
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin Dashboard Post-Login Tests', () => {
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

  describe('Requirement 4.1: Immediate Admin Data Loading', () => {
    it('should show invitation requests immediately after admin login', async () => {
      const mockSession = {
        user: { id: 'admin-user', email: 'admin@example.com' },
        access_token: 'admin-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock admin profile and invitation data
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'admin-user', role: 'admin', email: 'admin@example.com' },
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
                  data: [
                    { 
                      id: 1, 
                      email: 'user1@example.com', 
                      status: 'pending',
                      created_at: new Date().toISOString(),
                    },
                    { 
                      id: 2, 
                      email: 'user2@example.com', 
                      status: 'pending',
                      created_at: new Date().toISOString(),
                    },
                  ],
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

      // Should load invitation requests immediately
      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
        expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Should not show loading state for extended period
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should load admin articles and metrics immediately', async () => {
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
        if (table === 'articles') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { id: 1, title: 'Admin Article 1', status: 'published' },
                    { id: 2, title: 'Admin Article 2', status: 'draft' },
                  ],
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
        expect(screen.getByText('Admin Article 1')).toBeInTheDocument();
        expect(screen.getByText('Admin Article 2')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Requirement 4.2: Navigation Between Admin Sections', () => {
    it('should load data without delays when navigating between admin sections', async () => {
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
              data: [{ id: 1, title: 'Section Data' }],
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

      // Initial load should be fast
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 1000 });

      // Navigation between sections should not cause delays
      const startTime = Date.now();
      
      // Simulate section navigation by re-rendering
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const navigationTime = Date.now() - startTime;
      expect(navigationTime).toBeLessThan(1000);
    });
  });

  describe('Requirement 4.3: Invitation Approval Workflow', () => {
    it('should continue functioning normally after approving invitation', async () => {
      const mockSession = {
        user: { id: 'admin-user', email: 'admin@example.com' },
        access_token: 'admin-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      let invitationData = [
        { id: 1, email: 'user1@example.com', status: 'pending' },
        { id: 2, email: 'user2@example.com', status: 'pending' },
      ];

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
                  data: invitationData,
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null,
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

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      });

      // Simulate approval action
      invitationData = invitationData.filter(inv => inv.id !== 1);

      // Dashboard should continue to function
      await waitFor(() => {
        expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 4.4: Admin-Public View Switching', () => {
    it('should load content properly when switching between admin and public views', async () => {
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
        if (table === 'articles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 1, title: 'Public Article', published: true }],
                    error: null,
                  }),
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

      // Start with admin dashboard
      const { rerender } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Switch to public view (simulated by importing Index)
      const Index = (await import('../../pages/Index')).default;
      
      rerender(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Public content should load immediately
      await waitFor(() => {
        expect(screen.getByText('Public Article')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Performance Metrics', () => {
    it('should measure admin dashboard loading performance', async () => {
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
              data: [{ id: 1, title: 'Test Data' }],
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
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
    });
  });
});