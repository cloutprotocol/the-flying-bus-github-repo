import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RequestInvitation from '../../pages/RequestInvitation';
import Index from '../../pages/Index';
import { AuthProvider } from '../../providers/AuthProvider';
import NavigationContext, { NavigationProvider } from '../../contexts/NavigationContext';
import { supabase } from '../../integrations/supabase/client';
import { AsyncOperationManager } from '../../utils/asyncOperationManager';

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

vi.mock('../../services/invitationService', () => ({
  createInvitationRequest: vi.fn()
}));

describe('Error Recovery and Retry Mechanism Integration Tests', () => {
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

  describe('Form Submission Error Recovery', () => {
    it('should implement exponential backoff for form submission retries', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      const startTime = Date.now();

      // Fail first two attempts, succeed on third
      mockInvoke
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
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
      }, { timeout: 15000 });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take time due to exponential backoff (500ms + 1000ms + processing)
      expect(duration).toBeGreaterThan(1500);
      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });

    it('should handle maximum retry attempts gracefully', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);

      // Always fail
      mockInvoke.mockRejectedValue(new Error('Persistent error'));

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
        expect(screen.getByText(/maximum retry attempts reached/i)).toBeInTheDocument();
      }, { timeout: 20000 });

      // Should attempt maximum retries (3 attempts)
      expect(mockInvoke).toHaveBeenCalledTimes(3);
      expect(submitButton).not.toBeDisabled();
    });

    it('should provide manual retry option after automatic retries fail', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);

      // Fail automatic retries, succeed on manual retry
      mockInvoke
        .mockRejectedValueOnce(new Error('Auto retry 1'))
        .mockRejectedValueOnce(new Error('Auto retry 2'))
        .mockRejectedValueOnce(new Error('Auto retry 3'))
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

      // Wait for automatic retries to fail
      await waitFor(() => {
        expect(screen.getByText(/maximum retry attempts reached/i)).toBeInTheDocument();
      }, { timeout: 20000 });

      // Manual retry should be available
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });

      expect(mockInvoke).toHaveBeenCalledTimes(4);
    });

    it('should categorize and handle different error types appropriately', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);

      // Test validation error (should not retry)
      mockInvoke.mockRejectedValueOnce({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
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

      // Should not retry validation errors
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(submitButton).not.toBeDisabled();
    });

    it('should handle rate limiting with appropriate backoff', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);

      mockInvoke.mockRejectedValueOnce({
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 5000
      });

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
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      });

      // Should show retry countdown
      expect(screen.getByText(/retry in \d+ seconds/i)).toBeInTheDocument();
    });
  });

  describe('Data Loading Error Recovery', () => {
    it('should provide retry functionality for failed data loads', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);

      // First call fails, second succeeds
      mockGetCategoryArticles
        .mockRejectedValueOnce(new Error('Data loading failed'))
        .mockResolvedValueOnce([
          { id: '1', title: 'Test Article', category: 'headliners' }
        ]);

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/error loading articles/i)).toBeInTheDocument();
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

    it('should implement graceful degradation for partial data failures', async () => {
      const { getCategoryArticles, getHeadlineArticle } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);
      const mockGetHeadlineArticle = vi.mocked(getHeadlineArticle);

      // Category articles succeed, headline fails
      mockGetCategoryArticles.mockResolvedValue([
        { id: '1', title: 'Category Article', category: 'headliners' }
      ]);
      mockGetHeadlineArticle.mockRejectedValue(new Error('Headline fetch failed'));

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Should show category articles even if headline fails
      await waitFor(() => {
        expect(screen.getByText(/category article/i)).toBeInTheDocument();
      });

      // Should show error for headline section with retry option
      expect(screen.getByText(/error loading headline/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry headline/i })).toBeInTheDocument();
    });

    it('should handle timeout scenarios with appropriate recovery', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);

      // Simulate timeout
      mockGetCategoryArticles.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 11000)
        )
      );

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Should show timeout error after 10 seconds
      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
      }, { timeout: 12000 });

      // Should provide retry option
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should cache successful data to prevent unnecessary refetches', async () => {
      const { getCategoryArticles } = await import('../../data/articles');
      const mockGetCategoryArticles = vi.mocked(getCategoryArticles);

      mockGetCategoryArticles.mockResolvedValue([
        { id: '1', title: 'Cached Article', category: 'headliners' }
      ]);

      const { rerender } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/cached article/i)).toBeInTheDocument();
      });

      // Navigate away and back
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

      // Should use cached data, not refetch
      expect(screen.getByText(/cached article/i)).toBeInTheDocument();
      expect(mockGetCategoryArticles).toHaveBeenCalledTimes(1);
    });
  });

  describe('AsyncOperationManager Integration', () => {
    it('should use AsyncOperationManager for reliable operations', async () => {
      const mockExecuteWithRetry = vi.spyOn(AsyncOperationManager, 'executeWithRetry');
      mockExecuteWithRetry.mockResolvedValue({ success: true });

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
        expect(mockExecuteWithRetry).toHaveBeenCalled();
      });

      mockExecuteWithRetry.mockRestore();
    });

    it('should handle AsyncOperationManager timeout scenarios', async () => {
      const mockExecuteWithRetry = vi.spyOn(AsyncOperationManager, 'executeWithRetry');
      mockExecuteWithRetry.mockRejectedValue(new Error('Operation timeout'));

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
        expect(screen.getByText(/operation timeout/i)).toBeInTheDocument();
      });

      mockExecuteWithRetry.mockRestore();
    });

    it('should provide progress feedback during retry operations', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);
      
      // Fail first attempt, succeed on second
      mockInvoke
        .mockRejectedValueOnce(new Error('First attempt failed'))
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

      // Should show retry progress
      await waitFor(() => {
        expect(screen.getByText(/retrying/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Condition Simulation', () => {
    it('should handle intermittent connectivity', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);

      // Simulate intermittent network issues
      mockInvoke
        .mockRejectedValueOnce(new Error('Network unavailable'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
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
      }, { timeout: 15000 });

      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });

    it('should handle slow network conditions', async () => {
      const mockInvoke = vi.mocked(supabase.functions.invoke);

      // Simulate slow network
      mockInvoke.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: { success: true }, error: null }), 5000)
        )
      );

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Should show loading state during slow operation
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      }, { timeout: 6000 });
    });

    it('should provide offline detection and handling', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /submit request/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Should detect offline state
      await waitFor(() => {
        expect(screen.getByText(/you appear to be offline/i)).toBeInTheDocument();
      });

      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Dispatch online event
      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(screen.getByText(/connection restored/i)).toBeInTheDocument();
      });
    });
  });
});