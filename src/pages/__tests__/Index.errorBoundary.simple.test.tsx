import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';

// Simple mocks for testing error boundary functionality
vi.mock('@/utils/homePageDataFetcher', () => ({
  HomePageDataFetcher: {
    fetchHomePageData: vi.fn(),
    getDefaultCategories: vi.fn(() => [
      { title: 'Headliners', slug: 'headliners', color: 'red' },
      { title: 'Debates', slug: 'debates', color: 'orange' }
    ])
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  LogSource: { ARTICLE: 'ARTICLE' }
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

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

const createMockArticle = (id: string, title: string, category: string = 'Headliners') => ({
  id, title, excerpt: `${title} excerpt`, category, author: 'Test Author',
  date: '2024-01-01', readTime: '5 min', image: `/test-${id}.jpg`
});

describe('Index Component - Error Boundary Testing', () => {
  let mockFetchHomePageData: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { HomePageDataFetcher } = require('@/utils/homePageDataFetcher');
    mockFetchHomePageData = HomePageDataFetcher.fetchHomePageData;
  });

  describe('Network Failure Scenarios', () => {
    it('should handle complete network failure gracefully', async () => {
      mockFetchHomePageData.mockRejectedValue(
        new Error('NetworkError: fetch failed - no internet connection')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
      expect(screen.getByText('📡')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should handle timeout errors', async () => {
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
      mockFetchHomePageData
        .mockRejectedValueOnce(new Error('NetworkError: fetch failed'))
        .mockResolvedValueOnce({
          data: {
            headlineArticle: createMockArticle('1', 'Recovered Article'),
            categoryArticles: { 'Headliners': [createMockArticle('2', 'Category Article')] }
          },
          errors: [], hasPartialFailure: false
        });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

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
            'Headliners': [createMockArticle('2', 'Headline 1')],
            'Debates': [] // Failed to load
          }
        },
        errors: ['Failed to load Debates: timeout'],
        hasPartialFailure: true
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Featured Article')).toBeInTheDocument();
        expect(screen.getByText('Headline 1')).toBeInTheDocument();
      });

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

      await waitFor(() => {
        expect(screen.getByText('Regular Article')).toBeInTheDocument();
        expect(screen.getByText('Debate Article')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('feature-article')).not.toBeInTheDocument();
      expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
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
  });

  describe('Component Unmounting During Data Fetch', () => {
    it('should handle component unmounting during initial fetch', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetchHomePageData.mockReturnValue(pendingPromise);

      const { unmount } = renderWithRouter(<Index />);

      expect(screen.getByText('Loading articles...')).toBeInTheDocument();

      unmount();

      resolvePromise!({
        data: { headlineArticle: createMockArticle('1', 'Test Article'), categoryArticles: {} },
        errors: [], hasPartialFailure: false
      });

      // Should not cause any errors
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
      unmount();

      resolvePromise!({
        data: { headlineArticle: createMockArticle('1', 'Test Article'), categoryArticles: {} },
        errors: [], hasPartialFailure: false
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Warning: Can\'t perform a React state update on an unmounted component')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle multiple consecutive failures gracefully', async () => {
      mockFetchHomePageData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout error'))
        .mockResolvedValueOnce({
          data: { headlineArticle: createMockArticle('1', 'Finally Loaded'), categoryArticles: {} },
          errors: [], hasPartialFailure: false
        });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Finally Loaded')).toBeInTheDocument();
      });

      expect(mockFetchHomePageData).toHaveBeenCalledTimes(3);
    });

    it('should maintain error state consistency during rapid retries', async () => {
      mockFetchHomePageData.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });

      // Rapid clicks should not cause issues
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(
          screen.getByText('Retrying...') || screen.getByText('Connection Problem')
        ).toBeInTheDocument();
      });

      // Should not have excessive API calls (due to abort controller)
      expect(mockFetchHomePageData).toHaveBeenCalledTimes(2);
    });
  });

  describe('User Experience During Errors', () => {
    it('should provide helpful troubleshooting information', async () => {
      mockFetchHomePageData.mockRejectedValue(new Error('NetworkError: fetch failed'));

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      const troubleshootingDetails = screen.getByText('Still having trouble?');
      fireEvent.click(troubleshootingDetails);

      expect(screen.getByText(/Clear your browser cache/)).toBeInTheDocument();
      expect(screen.getByText(/Try using a different browser/)).toBeInTheDocument();
      expect(screen.getByText(/Check if other websites are working/)).toBeInTheDocument();
    });

    it('should handle page refresh functionality', async () => {
      mockFetchHomePageData.mockRejectedValue(new Error('Network error'));

      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload }, writable: true
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /refresh page/i }));
      expect(mockReload).toHaveBeenCalled();
    });
  });
});