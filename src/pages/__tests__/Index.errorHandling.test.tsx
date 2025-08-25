import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';
import { logger } from '@/utils/logger';

// Mock the dependencies
vi.mock('@/utils/homePageDataFetcher');
vi.mock('@/utils/logger');
vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>
}));

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

const mockHomePageDataFetcher = vi.mocked(HomePageDataFetcher);
const mockLogger = vi.mocked(logger);

describe('Index Component - Error Handling and Retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock default categories
    mockHomePageDataFetcher.getDefaultCategories.mockReturnValue([
      { title: 'Headliners', slug: 'headliners', color: 'red' },
      { title: 'Debates', slug: 'debates', color: 'orange' }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Network Error Handling', () => {
    it('should display user-friendly network error message', async () => {
      // Mock network error
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('fetch failed - network error')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
        expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
        expect(screen.getByText('📡')).toBeInTheDocument();
      });

      // Should show helpful tip
      expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
    });

    it('should allow retry after network error', async () => {
      // First call fails, second succeeds
      mockHomePageDataFetcher.fetchHomePageData
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({
          data: {
            headlineArticle: null,
            categoryArticles: {}
          },
          errors: [],
          hasPartialFailure: false
        });

      renderWithRouter(<Index />);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Retrying...')).toBeInTheDocument();
      });

      // Should eventually show no content message (since we returned empty data)
      await waitFor(() => {
        expect(screen.getByText('No Published Content Yet')).toBeInTheDocument();
      });

      // Verify retry was called
      expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Timeout Error Handling', () => {
    it('should display user-friendly timeout error message', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('Request timeout after 5 seconds')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
        expect(screen.getByText(/The request took too long to complete/)).toBeInTheDocument();
        expect(screen.getByText('⏱️')).toBeInTheDocument();
      });

      // Should show helpful tip
      expect(screen.getByText(/server might be busy/)).toBeInTheDocument();
    });
  });

  describe('Server Error Handling', () => {
    it('should display user-friendly server error message', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('Server error 500 - database connection failed')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Server Issues')).toBeInTheDocument();
        expect(screen.getByText(/Our servers are experiencing issues/)).toBeInTheDocument();
        expect(screen.getByText('🔧')).toBeInTheDocument();
      });

      // Should show helpful tip
      expect(screen.getByText(/Our team is working on it/)).toBeInTheDocument();
    });
  });

  describe('Generic Error Handling', () => {
    it('should display generic error message for unknown errors', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('Unknown error occurred')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
        expect(screen.getByText(/Unable to load articles/)).toBeInTheDocument();
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });

      // Should show helpful tip
      expect(screen.getByText(/This is usually temporary/)).toBeInTheDocument();
    });
  });

  describe('Partial Failure Handling', () => {
    it('should display partial failure notification', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue({
        data: {
          headlineArticle: {
            id: '1',
            title: 'Test Article',
            excerpt: 'Test excerpt',
            category: 'Headliners',
            author: 'Test Author',
            date: '2024-01-01',
            readTime: '5 min',
            image: '/test.jpg'
          },
          categoryArticles: {
            'Headliners': []
          }
        },
        errors: ['Failed to load Debates: timeout'],
        hasPartialFailure: true
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
        expect(screen.getByText(/Some sections couldn't be loaded/)).toBeInTheDocument();
      });

      // Should have retry button in notification
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should allow dismissing partial failure notification', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue({
        data: {
          headlineArticle: null,
          categoryArticles: {}
        },
        errors: ['Failed to load Debates: timeout'],
        hasPartialFailure: true
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
      });

      // Click dismiss button (×)
      const dismissButton = screen.getByTitle('Dismiss notification');
      fireEvent.click(dismissButton);

      // Notification should be gone
      await waitFor(() => {
        expect(screen.queryByText('Partial Content Loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('should handle retry with loading state', async () => {
      // First call fails
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValueOnce(
        new Error('Network error')
      );

      renderWithRouter(<Index />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Mock successful retry
      mockHomePageDataFetcher.fetchHomePageData.mockResolvedValueOnce({
        data: {
          headlineArticle: null,
          categoryArticles: {}
        },
        errors: [],
        hasPartialFailure: false
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should show loading state
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(retryButton).toBeDisabled();

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByText('No Published Content Yet')).toBeInTheDocument();
      });
    });

    it('should handle retry failure', async () => {
      // Both calls fail
      mockHomePageDataFetcher.fetchHomePageData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Still failing'));

      renderWithRouter(<Index />);

      // Wait for first error
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should show new error
      await waitFor(() => {
        expect(screen.getByText(/Unable to load articles/)).toBeInTheDocument();
      });
    });
  });

  describe('Page Refresh Functionality', () => {
    it('should provide refresh page option', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
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

  describe('Error Recovery Tips', () => {
    it('should show troubleshooting tips for persistent issues', async () => {
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
        new Error('Network error')
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
  });

  describe('Logging', () => {
    it('should log retry attempts', async () => {
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

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.any(String),
          'User initiated retry for Index page'
        );
      });
    });

    it('should log retry failures', async () => {
      mockHomePageDataFetcher.fetchHomePageData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Retry failed'));

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.any(String),
          'Retry failed',
          expect.objectContaining({ error: expect.any(Error) })
        );
      });
    });
  });
});