import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RequestInvitation from '../../pages/RequestInvitation';
import Index from '../../pages/Index';
import { AuthProvider } from '../../providers/AuthProvider';
import NavigationContext, { NavigationProvider } from '../../contexts/NavigationContext';
import { supabase } from '../../integrations/supabase/client';

// Mock dependencies
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

vi.mock('../../data/articles', () => ({
  getCategoryArticles: vi.fn(),
  getHeadlineArticle: vi.fn()
}));

describe('Timeout Handling and Component Lifecycle Cleanup Integration Tests', () => {
  let queryClient: QueryClient;
  let mockNavigationContext: any;
  let originalSetTimeout: typeof setTimeout;
  let originalClearTimeout: typeof clearTimeout;
  let timeoutIds: Set<NodeJS.Timeout>;

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

    // Track timeouts for cleanup verification
    timeoutIds = new Set();
    originalSetTimeout = global.setTimeout;
    originalClearTimeout = global.clearTimeout;

    global.setTimeout = vi.fn((callback, delay) => {
      const id = originalSetTimeout(callback, delay);
      timeoutIds.add(id);
      return id;
    });

    global.clearTimeout = vi.fn((id) => {
      timeoutIds.delete(id);
      return originalClearTimeout(id);
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    
    // Restore original functions
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
    
    // Clear any remaining timeouts
    timeoutIds.forEach(id => clearTimeout(id));
    timeoutIds.clear();
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

  describe('Form Submission Timeout Handling', () => {
    it('should timeout form submissions after 30 seconds', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      // Never resolve the promise to simulate timeout
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

      // Should be in loading state
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should clear timeout when form submission completes successfully', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

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
      });

      // Timeout should be cleared
      expect(global.clearTimeout).toHaveBeenCalled();
    });

    it('should clear timeout when form submission fails', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      mockInvoke.mockRejectedValue(new Error('Submission failed'));

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
        expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
      });

      // Timeout should be cleared
      expect(global.clearTimeout).toHaveBeenCalled();
    });

    it('should handle multiple concurrent form submissions with separate timeouts', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      // First submission hangs, second completes
      mockInvoke
        .mockImplementationOnce(() => new Promise(() => {}))
        .mockResolvedValueOnce({ data: { success: true }, error: null });

      const { rerender } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      // First submission
      const emailInput1 = screen.getByLabelText(/email/i);
      const submitButton1 = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput1, { target: { value: 'test1@example.com' } });
      fireEvent.click(submitButton1);

      // Render second instance
      rerender(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      // Second submission
      const emailInput2 = screen.getByLabelText(/email/i);
      const submitButton2 = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput2, { target: { value: 'test2@example.com' } });
      fireEvent.click(submitButton2);

      // Second should complete
      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });

      // Should have set multiple timeouts
      expect(global.setTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Loading Timeout Handling', () => {
    it('should timeout data loading operations after 10 seconds', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);

      // Never resolve to simulate timeout
      mockGetCategoryArticles.mockImplementation(() => new Promise(() => {}));

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(screen.getByText(/loading timeout/i)).toBeInTheDocument();
      });

      // Should provide retry option
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should clear data loading timeout when operation completes', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);

      mockGetCategoryArticles.mockResolvedValue([
        { id: '1', title: 'Test Article', category: 'headliners' }
      ]);

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/test article/i)).toBeInTheDocument();
      });

      // Timeout should be cleared
      expect(global.clearTimeout).toHaveBeenCalled();
    });

    it('should handle timeout for individual data operations independently', async () => {
      const { getCategoryArticles, getHeadlineArticle } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);
      const mockGetHeadlineArticle = vi.mocked(getHeadlineArticle);

      // Category articles timeout, headline succeeds
      mockGetCategoryArticles.mockImplementation(() => new Promise(() => {}));
      mockGetHeadlineArticle.mockResolvedValue({
        id: '1',
        title: 'Headline Article',
        category: 'headliners'
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/headline article/i)).toBeInTheDocument();
      });

      // Fast-forward to trigger category timeout
      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(screen.getByText(/error loading categories/i)).toBeInTheDocument();
      });

      // Headline should still be visible
      expect(screen.getByText(/headline article/i)).toBeInTheDocument();
    });
  });

  describe('Component Unmount Cleanup', () => {
    it('should clear all timeouts when component unmounts', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      // Hang the request
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      const { unmount } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Verify timeout was set
      expect(global.setTimeout).toHaveBeenCalled();

      // Unmount component
      unmount();

      // All timeouts should be cleared
      expect(global.clearTimeout).toHaveBeenCalled();
      expect(timeoutIds.size).toBe(0);
    });

    it('should remove event listeners on component unmount', async () => {
      const mockAddEventListener = vi.spyOn(window, 'addEventListener');
      const mockRemoveEventListener = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Should add navigation-change listener
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'navigation-change',
        expect.any(Function)
      );

      unmount();

      // Should remove event listeners
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'navigation-change',
        expect.any(Function)
      );

      mockAddEventListener.mockRestore();
      mockRemoveEventListener.mockRestore();
    });

    it('should cancel pending async operations on unmount', async () => {
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

      // Unmount while operation is pending
      unmount();

      // Resolve after unmount
      if (resolvePromise) {
        resolvePromise([{ id: '1', title: 'Test Article' }]);
      }

      // Should not cause any errors or warnings
      await new Promise(resolve => setTimeout(resolve, 100));
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

      // Should not log React warnings about setState on unmounted components
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('setState')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not accumulate timeouts during rapid component mounting/unmounting', async () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <RequestInvitation />
          </TestWrapper>
        );

        // Trigger timeout creation
        const emailInput = screen.getByLabelText(/email/i);
        const submitButton = screen.getByRole('button', { name: /submit request/i });

        fireEvent.change(emailInput, { target: { value: `test${i}@example.com` } });
        fireEvent.click(submitButton);

        // Immediately unmount
        unmount();
      }

      // No timeouts should remain
      expect(timeoutIds.size).toBe(0);
    });

    it('should clean up intervals and timers properly', async () => {
      const mockSetInterval = vi.spyOn(global, 'setInterval');
      const mockClearInterval = vi.spyOn(global, 'clearInterval');

      const { unmount } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // If component uses intervals, they should be set
      if (mockSetInterval.mock.calls.length > 0) {
        unmount();

        // Intervals should be cleared
        expect(mockClearInterval).toHaveBeenCalled();
      }

      mockSetInterval.mockRestore();
      mockClearInterval.mockRestore();
    });

    it('should handle cleanup during error states', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      mockInvoke.mockRejectedValue(new Error('Submission error'));

      const { unmount } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/submission error/i)).toBeInTheDocument();
      });

      // Unmount during error state
      unmount();

      // Should still clean up properly
      expect(global.clearTimeout).toHaveBeenCalled();
    });
  });

  describe('Concurrent Operation Management', () => {
    it('should handle multiple concurrent timeouts without interference', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      // Multiple hanging requests
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      // Render multiple components
      const { rerender } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      // Start first submission
      const emailInput1 = screen.getByLabelText(/email/i);
      const submitButton1 = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput1, { target: { value: 'test1@example.com' } });
      fireEvent.click(submitButton1);

      // Render second instance
      rerender(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      // Start second submission
      const emailInput2 = screen.getByLabelText(/email/i);
      const submitButton2 = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput2, { target: { value: 'test2@example.com' } });
      fireEvent.click(submitButton2);

      // Should have multiple timeouts
      expect(global.setTimeout).toHaveBeenCalledTimes(2);

      // Fast-forward to trigger timeouts
      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
      });
    });

    it('should prioritize cleanup over timeout execution', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      const { unmount } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Unmount just before timeout would trigger
      vi.advanceTimersByTime(29900);
      unmount();
      vi.advanceTimersByTime(200);

      // Timeout should be cleared, not executed
      expect(global.clearTimeout).toHaveBeenCalled();
    });
  });
});