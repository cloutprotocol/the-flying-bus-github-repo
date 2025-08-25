import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NavigationContext, { NavigationProvider } from '../../contexts/NavigationContext';
import { AuthProvider } from '../../providers/AuthProvider';
import Index from '../../pages/Index';
import RequestInvitation from '../../pages/RequestInvitation';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock data services
vi.mock('../../data/articles', () => ({
  getCategoryArticles: vi.fn(),
  getHeadlineArticle: vi.fn()
}));

describe('Navigation State Consistency Integration Tests', () => {
  let queryClient: QueryClient;
  let mockNavigationContext: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    mockNavigationContext = {
      isNavigating: false,
      setIsNavigating: vi.fn(),
      currentPath: '/',
      previousPath: null,
      loadingStates: new Map(),
      setLoadingState: vi.fn(),
      clearLoadingState: vi.fn(),
      authSyncInProgress: false,
      setAuthSyncInProgress: vi.fn()
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  const TestWrapper = ({ 
    children, 
    initialEntries = ['/']
  }: { 
    children: React.ReactNode; 
    initialEntries?: string[];
  }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <NavigationProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </NavigationProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  describe('Authentication State Synchronization During Navigation', () => {
    it('should maintain consistent auth state across page transitions', async () => {
      const mockGetSession = vi.mocked(supabase.auth.getSession);
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: '123', email: 'test@example.com' } } },
        error: null
      });

      // Start on Index page
      const { rerender } = render(
        <TestWrapper initialEntries={['/']}>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigationContext.setAuthSyncInProgress).toHaveBeenCalledWith(false);
      });

      // Navigate to RequestInvitation page
      rerender(
        <TestWrapper initialEntries={['/request-invitation']}>
          <RequestInvitation />
        </TestWrapper>
      );

      // Auth state should be maintained
      expect(mockGetSession).toHaveBeenCalled();
      expect(mockNavigationContext.setIsNavigating).toHaveBeenCalled();
    });

    it('should handle auth state changes during rapid navigation', async () => {
      const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);
      let authStateCallback: any;

      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const { rerender } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Simulate rapid navigation while auth state changes
      for (let i = 0; i < 3; i++) {
        rerender(
          <TestWrapper initialEntries={['/request-invitation']}>
            <RequestInvitation />
          </TestWrapper>
        );

        // Trigger auth state change during navigation
        if (authStateCallback) {
          authStateCallback('SIGNED_IN', { user: { id: `user-${i}` } });
        }

        rerender(
          <TestWrapper initialEntries={['/']}>
            <Index />
          </TestWrapper>
        );
      }

      await waitFor(() => {
        expect(mockNavigationContext.setAuthSyncInProgress).toHaveBeenCalled();
      });
    });

    it('should prevent auth interference with data loading', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);
      
      mockGetCategoryArticles.mockResolvedValue([
        { id: '1', title: 'Test Article', category: 'headliners' }
      ]);

      const mockGetSession = vi.mocked(supabase.auth.getSession);
      mockGetSession.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: { session: { user: { id: '123' } } },
            error: null
          }), 100)
        )
      );

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Data loading should not be blocked by auth sync
      await waitFor(() => {
        expect(mockGetCategoryArticles).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/test article/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State Management Across Components', () => {
    it('should coordinate loading states between components', async () => {
      const customNavigationContext = {
        ...mockNavigationContext,
        loadingStates: new Map([['articles', true], ['auth', false]])
      };

      render(
        <TestWrapper navigationContextValue={customNavigationContext}>
          <Index />
        </TestWrapper>
      );

      expect(customNavigationContext.setLoadingState).toHaveBeenCalled();
    });

    it('should clear stale loading states on navigation', async () => {
      const customNavigationContext = {
        ...mockNavigationContext,
        loadingStates: new Map([['articles', true], ['form', true]])
      };

      const { rerender } = render(
        <TestWrapper 
          initialEntries={['/']}
          navigationContextValue={customNavigationContext}
        >
          <Index />
        </TestWrapper>
      );

      // Navigate to different page
      rerender(
        <TestWrapper 
          initialEntries={['/request-invitation']}
          navigationContextValue={customNavigationContext}
        >
          <RequestInvitation />
        </TestWrapper>
      );

      expect(customNavigationContext.clearLoadingState).toHaveBeenCalled();
    });

    it('should handle concurrent loading operations', async () => {
      const { getCategoryArticles, getHeadlineArticle } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);
      const mockGetHeadlineArticle = vi.mocked(getHeadlineArticle);

      // Simulate concurrent operations with different delays
      mockGetCategoryArticles.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve([{ id: '1', title: 'Category Article' }]), 200)
        )
      );

      mockGetHeadlineArticle.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ id: '2', title: 'Headline Article' }), 300)
        )
      );

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Both operations should complete without interference
      await waitFor(() => {
        expect(screen.getByText(/category article/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/headline article/i)).toBeInTheDocument();
      });

      expect(mockNavigationContext.setLoadingState).toHaveBeenCalledWith('articles', true);
      expect(mockNavigationContext.setLoadingState).toHaveBeenCalledWith('articles', false);
    });
  });

  describe('Navigation Event Handling', () => {
    it('should dispatch and handle navigation-change events', async () => {
      const mockDispatchEvent = vi.spyOn(window, 'dispatchEvent');
      const mockAddEventListener = vi.spyOn(window, 'addEventListener');

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Should add navigation-change event listener
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'navigation-change',
        expect.any(Function)
      );

      // Simulate navigation change
      const navigationEvent = new CustomEvent('navigation-change', {
        detail: { from: '/', to: '/request-invitation', timestamp: Date.now() }
      });

      window.dispatchEvent(navigationEvent);

      await waitFor(() => {
        expect(mockNavigationContext.clearLoadingState).toHaveBeenCalled();
      });

      mockDispatchEvent.mockRestore();
      mockAddEventListener.mockRestore();
    });

    it('should handle navigation events with proper cleanup', async () => {
      const mockRemoveEventListener = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      unmount();

      // Should remove event listeners on cleanup
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'navigation-change',
        expect.any(Function)
      );

      mockRemoveEventListener.mockRestore();
    });

    it('should debounce rapid navigation events', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Dispatch multiple rapid navigation events
      for (let i = 0; i < 5; i++) {
        const navigationEvent = new CustomEvent('navigation-change', {
          detail: { from: '/', to: `/page-${i}`, timestamp: Date.now() }
        });
        window.dispatchEvent(navigationEvent);
      }

      // Should debounce and only process the last event
      await waitFor(() => {
        expect(mockNavigationContext.clearLoadingState).toHaveBeenCalled();
      });

      // Should not be called excessively
      expect(mockNavigationContext.clearLoadingState).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Lifecycle During Navigation', () => {
    it('should handle component mounting and unmounting during navigation', async () => {
      const { rerender, unmount } = render(
        <TestWrapper initialEntries={['/']}>
          <Index />
        </TestWrapper>
      );

      // Navigate multiple times
      rerender(
        <TestWrapper initialEntries={['/request-invitation']}>
          <RequestInvitation />
        </TestWrapper>
      );

      rerender(
        <TestWrapper initialEntries={['/']}>
          <Index />
        </TestWrapper>
      );

      unmount();

      // Should handle lifecycle properly without errors
      expect(mockNavigationContext.setIsNavigating).toHaveBeenCalled();
    });

    it('should prevent memory leaks during rapid navigation', async () => {
      const mockSetTimeout = vi.spyOn(global, 'setTimeout');
      const mockClearTimeout = vi.spyOn(global, 'clearTimeout');

      const { rerender } = render(
        <TestWrapper initialEntries={['/']}>
          <Index />
        </TestWrapper>
      );

      // Simulate rapid navigation
      for (let i = 0; i < 10; i++) {
        rerender(
          <TestWrapper initialEntries={['/request-invitation']}>
            <RequestInvitation />
          </TestWrapper>
        );

        rerender(
          <TestWrapper initialEntries={['/']}>
            <Index />
          </TestWrapper>
        );
      }

      // Should clear timeouts to prevent memory leaks
      expect(mockClearTimeout).toHaveBeenCalled();

      mockSetTimeout.mockRestore();
      mockClearTimeout.mockRestore();
    });

    it('should handle async operations during component unmounting', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);

      let resolvePromise: any;
      mockGetCategoryArticles.mockImplementation(() => 
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const { unmount } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Unmount while async operation is pending
      unmount();

      // Resolve after unmount
      if (resolvePromise) {
        resolvePromise([{ id: '1', title: 'Test Article' }]);
      }

      // Should not cause errors
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Error Recovery During Navigation', () => {
    it('should recover from navigation errors gracefully', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);

      mockGetCategoryArticles.mockRejectedValue(new Error('Navigation error'));

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Should provide recovery mechanism
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should maintain navigation state during error recovery', async () => {
      const customNavigationContext = {
        ...mockNavigationContext,
        isNavigating: true
      };

      render(
        <TestWrapper navigationContextValue={customNavigationContext}>
          <Index />
        </TestWrapper>
      );

      // Even with errors, navigation state should be managed
      expect(customNavigationContext.setIsNavigating).toHaveBeenCalled();
    });
  });
});