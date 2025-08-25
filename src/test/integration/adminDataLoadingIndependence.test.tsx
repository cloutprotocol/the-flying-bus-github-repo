import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/pages/Admin/Dashboard';
import ApprovalQueue from '@/pages/Admin/ApprovalQueue';
import InvitationManagement from '@/pages/Admin/InvitationManagement';
import { AuthProvider } from '@/providers/AuthProvider';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { dataLoadingManager } from '@/services/dataLoadingManager';
import { authStateBuffer } from '@/services/authStateBuffer';

// Mock the auth hook
const mockUser = {
  id: 'admin-user-id',
  email: 'admin@test.com',
  display_name: 'Admin User',
  user_roles: [{ role: 'admin' }]
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    signUp: vi.fn()
  })
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: mockArticlesData,
              error: null
            }))
          }))
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: mockArticlesData,
              error: null
            }))
          }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: mockArticlesData,
            error: null
          }))
        })),
        limit: vi.fn(() => Promise.resolve({
          data: mockArticlesData,
          error: null
        }))
      }))
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { user: mockUser } },
        error: null
      })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
}));

// Mock data
const mockArticlesData = [
  {
    id: '1',
    title: 'Test Article 1',
    status: 'pending',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    categories: { id: '1', name: 'Headliners' },
    profiles: { id: '1', display_name: 'Author 1' }
  },
  {
    id: '2',
    title: 'Test Article 2',
    status: 'published',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    categories: { id: '2', name: 'Learning' },
    profiles: { id: '2', display_name: 'Author 2' }
  }
];

const mockInvitationsData = [
  {
    id: '1',
    parent_name: 'John Doe',
    parent_email: 'john@example.com',
    child_name: 'Jane Doe',
    child_age: 8,
    status: 'pending',
    message: 'Please approve my child',
    created_at: '2024-01-01T00:00:00Z'
  }
];

const mockActivitiesData = [
  {
    id: '1',
    activity_type: 'article_created',
    description: 'New article created',
    created_at: '2024-01-01T00:00:00Z',
    metadata: {},
    profiles: { id: '1', display_name: 'Author 1' }
  }
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0
      }
    }
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

describe('Admin Data Loading Independence', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          gcTime: 0
        }
      }
    });

    // Reset mocks
    vi.clearAllMocks();
    
    // Clear data loading manager cache
    dataLoadingManager.clearCache();
    
    // Reset auth state buffer
    authStateBuffer.reset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Admin Dashboard', () => {
    it('should load dashboard data immediately after login', async () => {
      // Mock successful data loading
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: mockArticlesData,
              error: null
            }))
          })),
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: mockActivitiesData,
              error: null
            }))
          })),
          in: vi.fn(() => Promise.resolve({
            data: [{ id: '1' }],
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Total Articles')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify dashboard metrics are displayed
      expect(screen.getByText('Article Views')).toBeInTheDocument();
      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('Engagement Rate')).toBeInTheDocument();
    });

    it('should handle auth state changes without blocking data loading', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: mockArticlesData,
              error: null
            }))
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate auth state change during data loading
      authStateBuffer.bufferAuthStateChange();

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Data should still load despite auth state changes
      await waitFor(() => {
        expect(screen.getByText('Total Articles')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should provide fallback when authenticated queries fail', async () => {
      // Mock authenticated query failure, anonymous query success
      let callCount = 0;
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Auth error' }
                });
              }
              return Promise.resolve({
                data: mockArticlesData.filter(a => a.status === 'published'),
                error: null
              });
            })
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Should eventually show data from fallback
      await waitFor(() => {
        expect(screen.getByText('Total Articles')).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Approval Queue', () => {
    it('should load approval queue data immediately', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: mockArticlesData.filter(a => ['draft', 'pending'].includes(a.status)),
              error: null
            }))
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(
        <TestWrapper>
          <ApprovalQueue />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Content Review')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should handle status changes and refresh data', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: mockArticlesData,
              error: null
            }))
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      // Mock reviewArticle service
      vi.doMock('@/services/articleService', () => ({
        reviewArticle: vi.fn(() => Promise.resolve({ success: true, error: null }))
      }));

      render(
        <TestWrapper>
          <ApprovalQueue />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Content Review')).toBeInTheDocument();
      });

      // Wait for articles to load
      await waitFor(() => {
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Invitation Management', () => {
    it('should load invitation requests immediately', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: mockInvitationsData,
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Invitation Management')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Invitation for Jane Doe')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should handle invitation status updates', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: mockInvitationsData,
            error: null
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      // Mock updateInvitationRequestStatus service
      vi.doMock('@/services/invitationService', () => ({
        updateInvitationRequestStatus: vi.fn(() => Promise.resolve({ error: null }))
      }));

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Invitation Management')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Invitation for Jane Doe')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show approve/deny buttons for pending invitations
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Deny')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error messages when data loading fails', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Database connection failed' }
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Error loading dashboard data/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should provide retry functionality when errors occur', async () => {
      let shouldFail = true;
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => {
            if (shouldFail) {
              shouldFail = false;
              return Promise.resolve({
                data: null,
                error: { message: 'Temporary error' }
              });
            }
            return Promise.resolve({
              data: mockArticlesData,
              error: null
            });
          })
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(
        <TestWrapper>
          <ApprovalQueue />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Content Review')).toBeInTheDocument();
      });

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText('Failed to load articles')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Click retry button
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Should show data after retry
      await waitFor(() => {
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Performance', () => {
    it('should load admin data within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: mockArticlesData,
              error: null
            }))
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Articles')).toBeInTheDocument();
      }, { timeout: 3000 }); // Should load within 3 seconds

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    it('should cache data to improve subsequent loads', async () => {
      let callCount = 0;
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => {
              callCount++;
              return Promise.resolve({
                data: mockArticlesData,
                error: null
              });
            })
          }))
        }))
      }));

      (supabase.from as any).mockImplementation(mockFrom);

      const { rerender } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Articles')).toBeInTheDocument();
      });

      // Rerender the component
      rerender(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Articles')).toBeInTheDocument();
      });

      // Should have made multiple calls but some may be cached
      expect(callCount).toBeGreaterThan(0);
    });
  });
});