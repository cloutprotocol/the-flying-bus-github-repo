import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';

// Mock all dependencies to focus on error boundary testing
vi.mock('@/utils/homePageDataFetcher', () => ({
  HomePageDataFetcher: {
    fetchHomePageData: vi.fn(),
    getDefaultCategories: vi.fn(() => [
      { title: 'Headliners', slug: 'headliners', color: 'red' },
      { title: 'Debates', slug: 'debates', color: 'orange' },
      { title: 'Learning', slug: 'learning', color: 'purple' }
    ])
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  LogSource: {
    ARTICLE: 'ARTICLE'
  }
}));

vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/components/Articles/FeatureArticle', () => ({
  default: ({ title }: { title: string }) => <div data-testid="feature-article">{title}</div>
}));

vi.mock('@/components/Articles/CategorySection', () => ({
  default: ({ title, articles }: { title: string; articles: any[] }) => (
    <div data-testid="category-section">
      <h3>{title}</h3>
      {articles.map((article, index) => (
        <div key={index} data-testid="article">{article.title}</div>
      ))}
    </div>
  )
}));

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Helper to create mock article data
const createMockArticle = (id: string, title: string, category: string = 'Headliners') => ({
  id,
  title,
  excerpt: `${title} excerpt`,
  category,
  author: 'Test Author',
  date: '2024-01-01',
  readTime: '5 min',
  image: `/test-${id}.jpg`
});

describe('Index Component - Comprehensive Error Boundary Testing', () => {
  const mockFetchHomePageData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup the mock using vi.mocked
    const { HomePageDataFetcher } = vi.mocked(await import('@/utils/homePageDataFetcher'));
    HomePageDataFetcher.fetchHomePageData = mockFetchHomePageData;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Network Failure Scenarios', () => {
    it('should handle complete network failure gracefully', async () => {
      // Simulate complete network failure
      mockFetchHomePageData.mockRejectedValue(
        new Error('NetworkError: fetch failed - no internet connection')
      );

      renderWithRouter(<Index />);

      // Should show network error UI
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
      expect(screen.getByText('📡')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should handle DNS resolution failures', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('ENOTFOUND: DNS lookup failed')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });
    });

    it('should handle connection timeout errors', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('Request timeout after 5 seconds')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
        expect(screen.getByText('⏱️')).toBeInTheDocument();
      });
    });

    it('should handle network recovery after failure', async () => {
      // First call fails, second succeeds
      mockFetchHomePageData
        .mockRejectedValueOnce(new Error('NetworkError: fetch failed'))
        .mockResolvedValueOnce({
          data: {
            headlineArticle: createMockArticle('1', 'Recovered Article'),
            categoryArticles: {
              'Headliners': [createMockArticle('2', 'Category Article')]
            }
          },
          errors: [],
          hasPartialFailure: false
        });

      renderWithRouter(<Index />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Retry should work
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Recovered Article')).toBeInTheDocument();
      });

      expect(mockFetchHomePageData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Partial Data Loading Scenarios', () => {
    it('should handle some categories failing while others succeed', async () => {
      mockFetchHomePageData.mockResolvedValue({
        data: {
          headlineArticle: createMockArticle('1', 'Featured Article'),
          categoryArticles: {
            'Headliners': [
              createMockArticle('2', 'Headline 1'),
              createMockArticle('3', 'Headline 2')
            ],
            'Debates': [], // Failed to load
            'Learning': [
              createMockArticle('4', 'Learning Article', 'Learning')
            ]
          }
        },
        errors: [
          'Failed to load Debates: timeout'
        ],
        hasPartialFailure: true
      });

      renderWithRouter(<Index />);

      // Should show successful content
      await waitFor(() => {
        expect(screen.getByText('Featured Article')).toBeInTheDocument();
        expect(screen.getByText('Headline 1')).toBeInTheDocument();
        expect(screen.getByText('Learning Article')).toBeInTheDocument();
      });

      // Should show partial failure notification
      expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
      expect(screen.getByText(/Some sections couldn't be loaded/)).toBeInTheDocument();
    });

    it('should handle headline failing but categories succeeding', async () => {
      mockFetchHomePageData.mockResolvedValue({
        data: {
          headlineArticle: null, // Failed to load
          categoryArticles: {
            'Headliners': [createMockArticle('1', 'Regular Article')],
            'Debates': [createMockArticle('2', 'Debate Article', 'Debates')]
          }
        },
        errors: ['Failed to load featured article: database error'],
        hasPartialFailure: true
      });

      renderWithRouter(<Index />);

      // Should show category content without featured article
      await waitFor(() => {
        expect(screen.getByText('Regular Article')).toBeInTheDocument();
        expect(screen.getByText('Debate Article')).toBeInTheDocument();
      });

      // Should not show featured article section
      expect(screen.queryByTestId('feature-article')).not.toBeInTheDocument();

      // Should show partial failure notification
      expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
    });

    it('should allow retry from partial failure notification', async () => {
      // First call has partial failure
      mockFetchHomePageData
        .mockResolvedValueOnce({
          data: {
            headlineArticle: createMockArticle('1', 'Featured Article'),
            categoryArticles: {
              'Headliners': [createMockArticle('2', 'Headline Article')],
              'Debates': [] // Failed
            }
          },
          errors: ['Failed to load Debates: timeout'],
          hasPartialFailure: true
        })
        .mockResolvedValueOnce({
          data: {
            headlineArticle: createMockArticle('1', 'Featured Article'),
            categoryArticles: {
              'Headliners': [createMockArticle('2', 'Headline Article')],
              'Debates': [createMockArticle('3', 'Debate Article', 'Debates')] // Now succeeds
            }
          },
          errors: [],
          hasPartialFailure: false
        });

      renderWithRouter(<Index />);

      // Wait for partial failure
      await waitFor(() => {
        expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
      });

      // Retry from notification
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should eventually show all content without notification
      await waitFor(() => {
        expect(screen.getByText('Debate Article')).toBeInTheDocument();
        expect(screen.queryByText('Partial Content Loading')).not.toBeInTheDocument();
      });

      expect(mockFetchHomePageData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Database Connection Issues', () => {
    it('should handle database connection failures', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('database connection failed - server error 500')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Server Issues')).toBeInTheDocument();
        expect(screen.getByText('🔧')).toBeInTheDocument();
      });
    });

    it('should handle database timeout errors', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('database query timeout - operation took too long')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
      });
    });

    it('should handle authentication errors', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('authentication failed - invalid credentials')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      });
    });
  });

  describe('Component Unmounting During Data Fetch', () => {
    it('should handle component unmounting during initial fetch', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetchHomePageData.mockReturnValue(pendingPromise);

      const { unmount } = renderWithRouter(<Index />);

      // Should show loading state
      expect(screen.getByText('Loading articles...')).toBeInTheDocument();

      // Unmount component while fetch is pending
      unmount();

      // Resolve the promise after unmount
      resolvePromise!({
        data: {
          headlineArticle: createMockArticle('1', 'Test Article'),
          categoryArticles: {}
        },
        errors: [],
        hasPartialFailure: false
      });

      // Should not cause any errors or warnings
      // The component should have cleaned up properly
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should handle component unmounting during retry', async () => {
      // First call fails
      mockFetchHomePageData.mockRejectedValueOnce(
        new Error('Network error')
      );

      const { unmount } = renderWithRouter(<Index />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Set up pending promise for retry
      let resolveRetry: (value: any) => void;
      const retryPromise = new Promise((resolve) => {
        resolveRetry = resolve;
      });
      mockFetchHomePageData.mockReturnValue(retryPromise);

      // Start retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should show retrying state
      expect(screen.getByText('Retrying...')).toBeInTheDocument();

      // Unmount during retry
      unmount();

      // Resolve retry after unmount
      resolveRetry!({
        data: {
          headlineArticle: createMockArticle('1', 'Test Article'),
          categoryArticles: {}
        },
        errors: [],
        hasPartialFailure: false
      });

      // Should have cleaned up properly
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should not update state after component unmount', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetchHomePageData.mockReturnValue(pendingPromise);

      const { unmount } = renderWithRouter(<Index />);

      // Unmount before promise resolves
      unmount();

      // Resolve promise after unmount
      resolvePromise!({
        data: {
          headlineArticle: createMockArticle('1', 'Test Article'),
          categoryArticles: {}
        },
        errors: [],
        hasPartialFailure: false
      });

      // Wait a bit to ensure no state updates occur
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have any React warnings about setting state on unmounted component
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Warning: Can\'t perform a React state update on an unmounted component')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle multiple consecutive failures gracefully', async () => {
      // Multiple failures followed by success
      mockFetchHomePageData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          data: {
            headlineArticle: createMockArticle('1', 'Finally Loaded'),
            categoryArticles: {}
          },
          errors: [],
          hasPartialFailure: false
        });

      renderWithRouter(<Index />);

      // First failure
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Retry - second failure
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
      });

      // Retry - third failure
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Server Issues')).toBeInTheDocument();
      });

      // Retry - finally succeeds
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Finally Loaded')).toBeInTheDocument();
      });

      expect(mockFetchHomePageData).toHaveBeenCalledTimes(4);
    });

    it('should maintain error state consistency during rapid retries', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('Network error')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });

      // Rapid clicks should not cause issues
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      // Should still show appropriate loading/error state
      await waitFor(() => {
        expect(
          screen.getByText('Retrying...') || screen.getByText('Connection Problem')
        ).toBeInTheDocument();
      });

      // Should not have excessive API calls (due to abort controller)
      expect(mockFetchHomePageData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Types and User Experience', () => {
    it('should display appropriate error icons and messages for different error types', async () => {
      const errorScenarios = [
        {
          error: new Error('NetworkError: fetch failed'),
          expectedTitle: 'Connection Problem',
          expectedIcon: '📡',
          expectedTip: /Check your internet connection/
        },
        {
          error: new Error('Request timeout after 5 seconds'),
          expectedTitle: 'Request Timed Out',
          expectedIcon: '⏱️',
          expectedTip: /server might be busy/
        },
        {
          error: new Error('Server error 500'),
          expectedTitle: 'Server Issues',
          expectedIcon: '🔧',
          expectedTip: /Our team is working on it/
        },
        {
          error: new Error('Unknown error occurred'),
          expectedTitle: 'Something Went Wrong',
          expectedIcon: '⚠️',
          expectedTip: /This is usually temporary/
        }
      ];

      for (const { error, expectedTitle, expectedIcon, expectedTip } of errorScenarios) {
        mockFetchHomePageData.mockRejectedValue(error);

        const { unmount } = renderWithRouter(<Index />);

        await waitFor(() => {
          expect(screen.getByText(expectedTitle)).toBeInTheDocument();
          expect(screen.getByText(expectedIcon)).toBeInTheDocument();
          expect(screen.getByText(expectedTip)).toBeInTheDocument();
        });

        unmount();
        vi.clearAllMocks();
      }
    });

    it('should provide helpful troubleshooting information', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('NetworkError: fetch failed')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Click on "Still having trouble?" details
      const troubleshootingDetails = screen.getByText('Still having trouble?');
      fireEvent.click(troubleshootingDetails);

      // Should show troubleshooting tips
      expect(screen.getByText(/Clear your browser cache/)).toBeInTheDocument();
      expect(screen.getByText(/Try using a different browser/)).toBeInTheDocument();
      expect(screen.getByText(/Check if other websites are working/)).toBeInTheDocument();
    });

    it('should handle page refresh functionality', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('Network error')
      );

      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Click refresh page button
      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      fireEvent.click(refreshButton);

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Performance Under Error Conditions', () => {
    it('should not cause memory leaks during repeated failures', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('Persistent error')
      );

      renderWithRouter(<Index />);

      // Perform multiple retries
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
        });

        const retryButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(retryButton);

        // Brief wait between retries
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Should still be responsive
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });

    it('should handle error state transitions smoothly', async () => {
      // Start with network error
      mockFetchHomePageData.mockRejectedValueOnce(
        new Error('NetworkError: fetch failed')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Change to timeout error on retry
      mockFetchHomePageData.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
      });

      // Finally succeed
      mockFetchHomePageData.mockResolvedValueOnce({
        data: {
          headlineArticle: createMockArticle('1', 'Success Article'),
          categoryArticles: {}
        },
        errors: [],
        hasPartialFailure: false
      });

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText('Success Article')).toBeInTheDocument();
      });
    });
  });
});