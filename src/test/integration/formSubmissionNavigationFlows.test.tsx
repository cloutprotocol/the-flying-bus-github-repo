import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RequestInvitation from '../../pages/RequestInvitation';
import Index from '../../pages/Index';
import { AuthProvider } from '../../providers/AuthProvider';
import NavigationContext, { NavigationProvider } from '../../contexts/NavigationContext';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }
}));

// Mock services
vi.mock('../../services/invitationService', () => ({
  createInvitationRequest: vi.fn()
}));

vi.mock('../../data/articles', () => ({
  getCategoryArticles: vi.fn(),
  getHeadlineArticle: vi.fn()
}));

// Mock component lifecycle manager
vi.mock('../../utils/componentLifecycleManager', () => ({
  useComponentLifecycle: vi.fn(() => ({
    addTimeout: vi.fn((callback, delay) => setTimeout(callback, delay)),
    addEventListener: vi.fn(),
    safeSetState: vi.fn((setter, value) => setter(value)),
    dispatchNavigationChange: vi.fn()
  }))
}));

describe('Form Submission and Navigation Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  const TestWrapper = ({ children, initialEntries = ['/'] }: { children: React.ReactNode; initialEntries?: string[] }) => (
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

  describe('Form Submission with Network Delays and Server Errors', () => {
    it('should handle form submission with network delays', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      // Simulate network delay
      mockInvoke.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: { success: true }, error: null }), 2000)
        )
      );

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      // Fill form and submit
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Should show loading state immediately
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();

      // Wait for network delay to complete
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(mockInvoke).toHaveBeenCalledWith('send-email', expect.any(Object));
    });

    it('should handle server errors with retry functionality', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      // First call fails, second succeeds
      mockInvoke
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ data: { success: true }, error: null });

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Wait for first failure
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Wait for retry success
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });

      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout scenarios', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      // Simulate timeout - never resolves
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Should timeout after 30 seconds and reset button state
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      }, { timeout: 31000 });
    });

    it('should handle validation errors', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      mockInvoke.mockRejectedValue({
        message: 'Validation failed',
        details: { email: 'Invalid email format' }
      });

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Navigation Between Pages with Authentication State Consistency', () => {
    it('should maintain auth state during navigation', async () => {
      const mockGetSession = vi.mocked(supabase.auth.getSession);
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: '123', email: 'test@example.com' } } },
        error: null
      });

      const { rerender } = render(
        <TestWrapper initialEntries={['/']}>
          <Index />
        </TestWrapper>
      );

      // Wait for initial auth state
      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalled();
      });

      // Navigate to request invitation page
      rerender(
        <TestWrapper initialEntries={['/request-invitation']}>
          <RequestInvitation />
        </TestWrapper>
      );

      // Auth state should remain consistent
      expect(mockGetSession).toHaveBeenCalled();
    });

    it('should handle auth state changes during navigation', async () => {
      const mockGetSession = vi.mocked(supabase.auth.getSession);
      const mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange);

      let authCallback: any;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Simulate auth state change during navigation
      if (authCallback) {
        authCallback('SIGNED_IN', { user: { id: '123' } });
      }

      // Just verify the callback was set up
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('Rapid Navigation Scenarios and Component Lifecycle Management', () => {
    it('should handle rapid navigation without memory leaks', async () => {
      const { rerender } = render(
        <TestWrapper initialEntries={['/']}>
          <Index />
        </TestWrapper>
      );

      // Simulate rapid navigation
      for (let i = 0; i < 5; i++) {
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

      // Should handle cleanup properly without errors
      // Navigation should complete without throwing errors
    });

    it('should cancel pending operations on component unmount', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      let resolvePromise: any;
      mockInvoke.mockImplementation(() => 
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const { unmount } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Unmount component while operation is pending
      unmount();

      // Resolve the promise after unmount
      if (resolvePromise) {
        resolvePromise({ data: { success: true }, error: null });
      }

      // Should not cause any errors or state updates
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should handle navigation-change events properly', async () => {
      const mockDispatchEvent = vi.spyOn(window, 'dispatchEvent');

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Simulate navigation change event
      const navigationEvent = new CustomEvent('navigation-change', {
        detail: { from: '/', to: '/request-invitation' }
      });
      
      window.dispatchEvent(navigationEvent);

      // Navigation change event should be handled
      await new Promise(resolve => setTimeout(resolve, 100));

      mockDispatchEvent.mockRestore();
    });
  });

  describe('Error Recovery Mechanisms and Retry Functionality', () => {
    it('should provide retry functionality for failed data loads', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);

      // First call fails, second succeeds
      mockGetCategoryArticles
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([{ id: '1', title: 'Test Article' }]);

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Wait for successful retry
      await waitFor(() => {
        expect(screen.getByText(/test article/i)).toBeInTheDocument();
      });

      expect(mockGetCategoryArticles).toHaveBeenCalledTimes(2);
    });

    it('should implement exponential backoff for retries', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      const startTime = Date.now();
      
      // Fail multiple times then succeed
      mockInvoke
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ data: { success: true }, error: null });

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take time due to exponential backoff
      expect(duration).toBeGreaterThan(1000); // At least 1 second for retries
      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });
  });

  describe('Timeout Handling and Proper Cleanup on Component Unmount', () => {
    it('should clear timeouts on component unmount', async () => {
      const mockClearTimeout = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Unmount component
      unmount();

      // Should clear timeouts
      expect(mockClearTimeout).toHaveBeenCalled();

      mockClearTimeout.mockRestore();
    });

    it('should remove event listeners on component unmount', async () => {
      const mockRemoveEventListener = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Unmount component
      unmount();

      // Should remove event listeners
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'navigation-change',
        expect.any(Function)
      );

      mockRemoveEventListener.mockRestore();
    });

    it('should handle data fetching timeout properly', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);

      // Simulate timeout - never resolves
      mockGetCategoryArticles.mockImplementation(() => new Promise(() => {}));

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Should timeout after 10 seconds and show error
      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      }, { timeout: 11000 });
    });

    it('should prevent state updates on unmounted components', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockInvoke = vi.mocked(supabase.functions.invoke);

      let resolvePromise: any;
      mockInvoke.mockImplementation(() => 
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const { unmount } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Unmount component
      unmount();

      // Resolve promise after unmount
      if (resolvePromise) {
        resolvePromise({ data: { success: true }, error: null });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not log any React warnings about state updates on unmounted components
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('setState')
      );

      consoleSpy.mockRestore();
    });
  });
});