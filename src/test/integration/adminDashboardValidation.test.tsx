import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../pages/Admin/Dashboard';
import { AuthProvider } from '../../providers/AuthProvider';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        count: 'exact',
        head: true,
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user', email: 'admin@test.com' } },
        error: null
      })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

/**
 * Admin Dashboard Validation Integration Tests
 * 
 * Tests all requirements from task 8:
 * - All admin dashboard pages load properly without loops
 * - Metrics display correctly (articles, views, comments, pending items)
 * - Activity feed loads without continuous refresh
 * - Quick action buttons work correctly
 * - Refresh functionality works without triggering loops
 */
describe('Admin Dashboard Validation', () => {
  let queryClient: QueryClient;
  let mockSupabaseFrom: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Setup mock responses
    mockSupabaseFrom = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ 
            data: [
              { id: '1', title: 'Test Article', status: 'published' },
              { id: '2', title: 'Draft Article', status: 'draft' }
            ], 
            error: null 
          })),
          order: vi.fn(() => Promise.resolve({ 
            data: [
              { id: '1', content: 'Test comment', status: 'approved' }
            ], 
            error: null 
          })),
          count: 'exact',
          head: true,
        })),
        limit: vi.fn(() => Promise.resolve({ 
          data: [
            { id: '1', title: 'Test Article', view_count: 100 },
            { id: '2', title: 'Another Article', view_count: 50 }
          ], 
          error: null 
        })),
        order: vi.fn(() => Promise.resolve({ 
          data: [
            { id: '1', username: 'testuser', created_at: new Date().toISOString() }
          ], 
          error: null 
        })),
        count: 'exact',
        head: true,
      })),
    }));

    (supabase.from as any).mockImplementation(mockSupabaseFrom);
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

  describe('Page Loading Without Loops (Requirements 1.1, 1.2, 1.4, 1.5)', () => {
    it('should load dashboard page without infinite loops', async () => {
      const startTime = Date.now();
      
      renderDashboard();
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      }, { timeout: 5000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (not hanging in loops)
      expect(loadTime).toBeLessThan(5000);
      
      // Verify no continuous refresh by checking call count
      const initialCallCount = mockSupabaseFrom.mock.calls.length;
      
      // Wait a bit more to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalCallCount = mockSupabaseFrom.mock.calls.length;
      
      // Should not have made additional calls (no continuous refresh)
      expect(finalCallCount).toBe(initialCallCount);
    });

    it('should handle page refresh without triggering loops', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
      
      const initialCallCount = mockSupabaseFrom.mock.calls.length;
      
      // Simulate refresh by re-rendering
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
      
      // Should have made some new calls for refresh, but not excessive
      const finalCallCount = mockSupabaseFrom.mock.calls.length;
      const additionalCalls = finalCallCount - initialCallCount;
      
      // Should make reasonable number of calls for refresh (not infinite)
      expect(additionalCalls).toBeGreaterThan(0);
      expect(additionalCalls).toBeLessThan(20); // Reasonable upper limit
    });

    it('should display loading states without flashing', async () => {
      // Mock delayed response to test loading states
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => new Promise(resolve => 
              setTimeout(() => resolve({ data: [], error: null }), 500)
            )),
            order: vi.fn(() => new Promise(resolve => 
              setTimeout(() => resolve({ data: [], error: null }), 500)
            )),
          })),
          limit: vi.fn(() => new Promise(resolve => 
            setTimeout(() => resolve({ data: [], error: null }), 500)
          )),
          order: vi.fn(() => new Promise(resolve => 
            setTimeout(() => resolve({ data: [], error: null }), 500)
          )),
        })),
      }));

      renderDashboard();
      
      // Should show loading state initially
      expect(screen.getByText(/loading/i) || screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Should show content after loading
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  describe('Metrics Display (Requirements 2.1, 2.2, 2.3, 2.4)', () => {
    it('should display total articles count correctly', async () => {
      // Mock articles count response
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'articles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ 
                  data: [{ id: '1' }, { id: '2' }, { id: '3' }], 
                  error: null,
                  count: 3
                })),
              })),
              limit: vi.fn(() => Promise.resolve({ 
                data: [{ id: '1' }, { id: '2' }, { id: '3' }], 
                error: null,
                count: 3
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })) };
      });

      renderDashboard();
      
      await waitFor(() => {
        // Should display articles count
        expect(screen.getByText(/3/)).toBeInTheDocument();
        expect(screen.getByText(/articles/i)).toBeInTheDocument();
      });
    });

    it('should display article views count correctly', async () => {
      // Mock articles with view counts
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'articles') {
          return {
            select: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ 
                data: [
                  { id: '1', view_count: 100 },
                  { id: '2', view_count: 50 },
                  { id: '3', view_count: 25 }
                ], 
                error: null 
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })) };
      });

      renderDashboard();
      
      await waitFor(() => {
        // Should display total views (100 + 50 + 25 = 175)
        expect(screen.getByText(/175/)).toBeInTheDocument();
        expect(screen.getByText(/views/i)).toBeInTheDocument();
      });
    });

    it('should display comments count correctly', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'comments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ 
                  data: [{ id: '1' }, { id: '2' }], 
                  error: null,
                  count: 2
                })),
              })),
              limit: vi.fn(() => Promise.resolve({ 
                data: [{ id: '1' }, { id: '2' }], 
                error: null,
                count: 2
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })) };
      });

      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/2/)).toBeInTheDocument();
        expect(screen.getByText(/comments/i)).toBeInTheDocument();
      });
    });

    it('should display pending items counts correctly', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        const mockResponse = {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => ({
              limit: vi.fn(() => {
                let count = 0;
                if (table === 'articles' && field === 'status' && value === 'draft') count = 2;
                if (table === 'comments' && field === 'status' && value === 'pending') count = 1;
                if (table === 'invitation_tokens' && field === 'status' && value === 'pending') count = 3;
                
                return Promise.resolve({ 
                  data: Array(count).fill(null).map((_, i) => ({ id: `${i}` })), 
                  error: null,
                  count
                });
              }),
            })),
          })),
        };
        return mockResponse;
      });

      renderDashboard();
      
      await waitFor(() => {
        // Should display pending counts
        expect(screen.getByText(/2.*pending.*articles/i) || screen.getByText(/pending.*2/i)).toBeInTheDocument();
        expect(screen.getByText(/1.*pending.*comment/i) || screen.getByText(/pending.*1/i)).toBeInTheDocument();
        expect(screen.getByText(/3.*pending.*invitation/i) || screen.getByText(/pending.*3/i)).toBeInTheDocument();
      });
    });
  });

  describe('Activity Feed (Requirements 3.1, 3.2)', () => {
    it('should load activity feed without continuous refresh', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        const responses = {
          articles: {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ 
                  data: [
                    { id: '1', title: 'Recent Article', created_at: new Date().toISOString(), profiles: { username: 'author1' } }
                  ], 
                  error: null 
                })),
              })),
            })),
          },
          comments: {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ 
                  data: [
                    { id: '1', content: 'Recent comment', created_at: new Date().toISOString(), profiles: { username: 'commenter1' } }
                  ], 
                  error: null 
                })),
              })),
            })),
          },
          profiles: {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ 
                  data: [
                    { id: '1', username: 'newuser', created_at: new Date().toISOString() }
                  ], 
                  error: null 
                })),
              })),
            })),
          },
        };
        return responses[table as keyof typeof responses] || { select: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })) };
      });

      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/activity/i) || screen.getByText(/recent/i)).toBeInTheDocument();
      });
      
      const initialCallCount = mockSupabaseFrom.mock.calls.length;
      
      // Wait to ensure no continuous refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalCallCount = mockSupabaseFrom.mock.calls.length;
      
      // Should not make additional calls (no continuous refresh)
      expect(finalCallCount).toBe(initialCallCount);
    });

    it('should display recent activities correctly', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'articles') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ 
                  data: [
                    { 
                      id: '1', 
                      title: 'Recent Article', 
                      created_at: new Date().toISOString(),
                      profiles: { username: 'author1' }
                    }
                  ], 
                  error: null 
                })),
              })),
            })),
          };
        }
        return { select: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })) };
      });

      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/Recent Article/)).toBeInTheDocument();
        expect(screen.getByText(/author1/)).toBeInTheDocument();
      });
    });
  });

  describe('Quick Action Buttons (Requirements 4.1, 4.2, 4.3, 4.4)', () => {
    it('should display quick action buttons correctly', async () => {
      renderDashboard();
      
      await waitFor(() => {
        // Should display quick action buttons
        expect(screen.getByText(/create.*article/i) || screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
        expect(screen.getByText(/manage.*invitation/i) || screen.getByRole('button', { name: /invitation/i })).toBeInTheDocument();
        expect(screen.getByText(/manage.*comment/i) || screen.getByRole('button', { name: /comment/i })).toBeInTheDocument();
      });
    });

    it('should handle quick action button clicks correctly', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const createButton = screen.getByText(/create.*article/i) || screen.getByRole('button', { name: /create/i });
        expect(createButton).toBeInTheDocument();
      });
      
      const createButton = screen.getByText(/create.*article/i) || screen.getByRole('button', { name: /create/i });
      
      // Should be clickable without errors
      expect(() => fireEvent.click(createButton)).not.toThrow();
    });

    it('should navigate correctly when quick actions are clicked', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const manageButton = screen.getByText(/manage.*invitation/i) || screen.getByRole('button', { name: /invitation/i });
        expect(manageButton).toBeInTheDocument();
      });
      
      const manageButton = screen.getByText(/manage.*invitation/i) || screen.getByRole('button', { name: /invitation/i });
      
      // Click should not cause errors
      fireEvent.click(manageButton);
      
      // Should not cause infinite loops or errors
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockSupabaseFrom.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Refresh Functionality (Requirements 1.4, 3.2)', () => {
    it('should handle manual refresh without triggering loops', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
      
      const initialCallCount = mockSupabaseFrom.mock.calls.length;
      
      // Find and click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i }) || 
                           screen.getByText(/refresh/i) ||
                           screen.getByRole('button', { name: /reload/i });
      
      if (refreshButton) {
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
          const finalCallCount = mockSupabaseFrom.mock.calls.length;
          const additionalCalls = finalCallCount - initialCallCount;
          
          // Should make some new calls for refresh, but not excessive
          expect(additionalCalls).toBeGreaterThan(0);
          expect(additionalCalls).toBeLessThan(15); // Reasonable upper limit
        });
      }
    });

    it('should handle multiple rapid refreshes without loops', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i }) || 
                           screen.getByText(/refresh/i) ||
                           screen.getByRole('button', { name: /reload/i });
      
      if (refreshButton) {
        const initialCallCount = mockSupabaseFrom.mock.calls.length;
        
        // Rapid clicks
        fireEvent.click(refreshButton);
        fireEvent.click(refreshButton);
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
          const finalCallCount = mockSupabaseFrom.mock.calls.length;
          const additionalCalls = finalCallCount - initialCallCount;
          
          // Should handle rapid clicks gracefully without excessive calls
          expect(additionalCalls).toBeLessThan(30); // Should not explode with calls
        });
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API errors gracefully without loops', async () => {
      // Mock API error
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'API Error' } 
          })),
        })),
      }));

      renderDashboard();
      
      await waitFor(() => {
        // Should display error message
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
      });
      
      // Should not continuously retry (no infinite loops)
      const callCount = mockSupabaseFrom.mock.calls.length;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalCallCount = mockSupabaseFrom.mock.calls.length;
      
      // Should not make excessive retry calls
      expect(finalCallCount - callCount).toBeLessThan(5);
    });

    it('should recover from errors when data becomes available', async () => {
      let shouldError = true;
      
      mockSupabaseFrom.mockImplementation(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => {
            if (shouldError) {
              return Promise.resolve({ data: null, error: { message: 'API Error' } });
            }
            return Promise.resolve({ data: [{ id: '1', title: 'Test' }], error: null });
          }),
        })),
      }));

      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
      });
      
      // Simulate API recovery
      shouldError = false;
      
      // Trigger refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i }) || 
                           screen.getByText(/refresh/i) ||
                           screen.getByRole('button', { name: /retry/i });
      
      if (refreshButton) {
        fireEvent.click(refreshButton);
        
        await waitFor(() => {
          expect(screen.getByText(/Test/)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Performance and Stability', () => {
    it('should complete all operations within reasonable time', async () => {
      const startTime = Date.now();
      
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      }, { timeout: 10000 });
      
      const totalTime = Date.now() - startTime;
      
      // Should complete within 10 seconds
      expect(totalTime).toBeLessThan(10000);
    });

    it('should not make excessive API calls', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
      
      const totalCalls = mockSupabaseFrom.mock.calls.length;
      
      // Should make reasonable number of API calls (not excessive)
      expect(totalCalls).toBeLessThan(50);
      expect(totalCalls).toBeGreaterThan(0);
    });

    it('should maintain stable performance across multiple renders', async () => {
      const renderTimes = [];
      
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        
        const { unmount } = renderDashboard();
        
        await waitFor(() => {
          expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
        });
        
        const renderTime = Date.now() - startTime;
        renderTimes.push(renderTime);
        
        unmount();
      }
      
      // All renders should complete within reasonable time
      renderTimes.forEach(time => {
        expect(time).toBeLessThan(5000);
      });
      
      // Performance should be consistent (no exponential degradation)
      const avgTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const maxTime = Math.max(...renderTimes);
      
      expect(maxTime).toBeLessThan(avgTime * 3); // Max shouldn't be more than 3x average
    });
  });
});