import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';
import { logger } from '@/utils/logger';

// Mock the dependencies
vi.mock('@/utils/homePageDataFetcher', () => ({
  HomePageDataFetcher: {
    fetchHomePageData: vi.fn(),
    getDefaultCategories: vi.fn()
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

// Mock components to avoid browser API issues in tests
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

const mockHomePageDataFetcher = vi.mocked(HomePageDataFetcher);
const mockLogger = vi.mocked(logger);

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
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock default categories
    mockHomePageDataFetcher.getDefaultCategories.mockReturnValue([
      { title: 'Headliners', slug: 'headliners', color: 'red' },
      { title: 'Debates', slug: 'debates', color: 'orange' },
      { title: 'Learning', slug: 'learning', color: 'purple' },
      { title: 'Neighborhood', slug: 'neighborhood', color: 'green' }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Network Failure Scenarios', () => {
    it('should handle complete network failure gracefully', async () => {
      // Simulate complete network failure
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('NetworkError: fetch failed - no internet connection')
      );

      renderWithRouter(<Index />);

      // Should show network error UI
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
        expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
        expect(screen.getByText('📡')).toBeInTheDocument();
      });

      // Should provide helpful recovery options
      expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();

      // Should log the error
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        'Complete failure fetching articles for Index page',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should handle DNS resolution failures', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('fetch failed - DNS resolution failed')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
        expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
      });
    });

    it('should handle connection timeout errors', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('Request timeout after 5 seconds')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
        expect(screen.getByText(/The request took too long to complete/)).toBeInTheDocument();
        expect(screen.getByText('⏱️')).toBeInTheDocument();
      });

      expect(screen.getByText(/server might be busy/)).toBeInTheDocument();
    });

    it('should handle network recovery after failure', async () => {
      // First call fails, second succeeds
      mockHomePageDataFetcher.fetchHomePageData
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

      expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Partial Data Loading Scenarios', () => {
    it('should handle some categories failing while others succeed', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue({
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
            ],
            'Neighborhood': [] // Failed to load
          }
        },
        errors: [
          'Failed to load Debates: timeout',
          'Failed to load Neighborhood: server error'
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

      // Should have retry option in notification
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should handle headline failing but categories succeeding', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue({
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

    it('should handle categories failing but headline succeeding', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue({
        data: {
          headlineArticle: createMockArticle('1', 'Featured Story'),
          categoryArticles: {
            'Headliners': [], // All categories failed
            'Debates': [],
            'Learning': [],
            'Neighborhood': []
          }
        },
        errors: [
          'Failed to load Headliners: timeout',
          'Failed to load Debates: server error',
          'Failed to load Learning: network error',
          'Failed to load Neighborhood: database error'
        ],
        hasPartialFailure: true
      });

      renderWithRouter(<Index />);

      // Should show featured article
      await waitFor(() => {
        expect(screen.getByText('Featured Story')).toBeInTheDocument();
      });

      // Should show partial failure notification
      expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();

      // Should show fallback message for missing categories
      expect(screen.getByText(/More Content Coming Soon/)).toBeInTheDocument();
    });

    it('should allow retry from partial failure notification', async () => {
      // First call has partial failure
      mockHomePageDataFetcher.fetchHomePageData
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

      expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Database Connection Issues', () => {
    it('should handle database connection failures', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('database connection failed - server error 500')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Server Issues')).toBeInTheDocument();
        expect(screen.getByText(/Our servers are experiencing issues/)).toBeInTheDocument();
        expect(screen.getByText('🔧')).toBeInTheDocument();
      });

      expect(screen.getByText(/Our team is working on it/)).toBeInTheDocument();
    });

    it('should handle database timeout errors', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('database query timeout - operation took too long')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
        expect(screen.getByText(/The request took too long to complete/)).toBeInTheDocument();
      });
    });

    it('should handle database authentication errors', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('authentication failed - invalid credentials')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
        expect(screen.getByText(/There was an authentication issue/)).toBeInTheDocument();
      });
    });

    it('should handle rate limiting from database', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('rate limit exceeded - too many requests')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
        expect(screen.getByText(/Too many requests/)).toBeInTheDocument();
      });
    });
  });

  describe('Component Unmounting During Data Fetch', () => {
    it('should handle component unmounting during initial fetch', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockHomePageDataFetcher.fetchHomePageData.mockReturnValue(pendingPromise);

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
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        'Aborting article fetch due to component cleanup'
      );
    });

    it('should handle component unmounting during retry', async () => {
      // First call fails
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValueOnce(
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
      mockHomePageDataFetcher.fetchHomePageData.mockReturnValue(retryPromise);

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
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        'Aborting article fetch due to component cleanup'
      );
    });

    it('should handle abort controller cleanup properly', async () => {
      let abortSignal: AbortSignal | undefined;
      
      mockHomePageDataFetcher.fetchHomePageData.mockImplementation((signal) => {
        abortSignal = signal;
        return new Promise((resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new Error('Request was aborted'));
          });
        });
      });

      const { unmount } = renderWithRouter(<Index />);

      // Wait for fetch to start
      await waitFor(() => {
        expect(abortSignal).toBeDefined();
      });

      // Unmount should abort the request
      unmount();

      // Verify abort signal was triggered
      expect(abortSignal?.aborted).toBe(true);
    });

    it('should not update state after component unmount', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockHomePageDataFetcher.fetchHomePageData.mockReturnValue(pendingPromise);

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
      mockHomePageDataFetcher.fetchHomePageData
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

      expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(4);
    });

    it('should handle error during partial failure retry', async () => {
      // First call has partial failure
      mockHomePageDataFetcher.fetchHomePageData
        .mockResolvedValueOnce({
          data: {
            headlineArticle: createMockArticle('1', 'Featured Article'),
            categoryArticles: {
              'Headliners': [createMockArticle('2', 'Headline Article')],
              'Debates': []
            }
          },
          errors: ['Failed to load Debates: timeout'],
          hasPartialFailure: true
        })
        .mockRejectedValueOnce(new Error('Complete failure on retry'));

      renderWithRouter(<Index />);

      // Wait for partial failure
      await waitFor(() => {
        expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
      });

      // Retry fails completely
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should show complete error
      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
        expect(screen.queryByText('Partial Content Loading')).not.toBeInTheDocument();
      });
    });

    it('should maintain error state consistency during rapid retries', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
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

      // Should not have excessive API calls
      expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log all error types appropriately', async () => {
      const testErrors = [
        { error: new Error('NetworkError: fetch failed'), logLevel: 'error' },
        { error: new Error('Request timeout'), logLevel: 'error' },
        { error: new Error('Server error 500'), logLevel: 'error' },
        { error: new Error('Database connection failed'), logLevel: 'error' }
      ];

      for (const { error } of testErrors) {
        vi.clearAllMocks();
        mockHomePageDataFetcher.getDefaultCategories.mockReturnValue([
          { title: 'Headliners', slug: 'headliners', color: 'red' }
        ]);
        
        mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(error);

        const { unmount } = renderWithRouter(<Index />);

        await waitFor(() => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.any(String),
            'Complete failure fetching articles for Index page',
            expect.objectContaining({ error })
          );
        });

        unmount();
      }
    });

    it('should log retry attempts and outcomes', async () => {
      mockHomePageDataFetcher.fetchHomePageData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { headlineArticle: null, categoryArticles: {} },
          errors: [],
          hasPartialFailure: false
        });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.any(String),
          'User initiated retry for Index page'
        );
      });
    });
  });
});