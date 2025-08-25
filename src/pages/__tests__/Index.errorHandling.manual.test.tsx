import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock the dependencies
vi.mock('@/utils/homePageDataFetcher');
vi.mock('@/utils/logger');
vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>
}));

const mockHomePageDataFetcher = vi.mocked(HomePageDataFetcher);

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Index Component - Manual Error Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock default categories
    mockHomePageDataFetcher.getDefaultCategories.mockReturnValue([
      { title: 'Headliners', slug: 'headliners', color: 'red' },
      { title: 'Debates', slug: 'debates', color: 'orange' }
    ]);
  });

  it('should handle complete error flow with retry', async () => {
    // First call fails with network error
    mockHomePageDataFetcher.fetchHomePageData.mockRejectedValueOnce(
      new Error('fetch failed - network error')
    );

    renderWithRouter(<Index />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
    });

    // Verify error UI elements
    expect(screen.getByText('📡')).toBeInTheDocument();
    expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();

    // Mock successful retry
    mockHomePageDataFetcher.fetchHomePageData.mockResolvedValueOnce({
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
          'Headliners': [{
            id: '2',
            title: 'Category Article',
            excerpt: 'Category excerpt',
            category: 'Headliners',
            author: 'Test Author',
            date: '2024-01-01',
            readTime: '3 min',
            image: '/test2.jpg'
          }]
        }
      },
      errors: [],
      hasPartialFailure: false
    });

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    // Should eventually show content
    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify retry was called
    expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(2);
  });

  it('should handle partial failure with notification', async () => {
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
          'Headliners': [{
            id: '2',
            title: 'Category Article',
            excerpt: 'Category excerpt',
            category: 'Headliners',
            author: 'Test Author',
            date: '2024-01-01',
            readTime: '3 min',
            image: '/test2.jpg'
          }],
          'Debates': [] // Empty due to error
        }
      },
      errors: ['Failed to load Debates: timeout'],
      hasPartialFailure: true
    });

    renderWithRouter(<Index />);

    // Should show content with partial failure notification
    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument();
      expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
    });

    // Should have retry button in notification
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Should be able to dismiss notification
    const dismissButton = screen.getByTitle('Dismiss notification');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Partial Content Loading')).not.toBeInTheDocument();
    });
  });

  it('should show different error types correctly', async () => {
    const errorTypes = [
      {
        error: new Error('Request timeout after 5 seconds'),
        expectedTitle: 'Request Timed Out',
        expectedIcon: '⏱️',
        expectedTip: 'The server might be busy'
      },
      {
        error: new Error('Server error 500 - database connection failed'),
        expectedTitle: 'Server Issues',
        expectedIcon: '🔧',
        expectedTip: 'Our team is working on it'
      },
      {
        error: new Error('Unknown error occurred'),
        expectedTitle: 'Something Went Wrong',
        expectedIcon: '⚠️',
        expectedTip: 'This is usually temporary'
      }
    ];

    for (const { error, expectedTitle, expectedIcon, expectedTip } of errorTypes) {
      // Clear previous renders
      vi.clearAllMocks();
      mockHomePageDataFetcher.getDefaultCategories.mockReturnValue([
        { title: 'Headliners', slug: 'headliners', color: 'red' }
      ]);
      
      mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(error);

      const { unmount } = renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        expect(screen.getByText(expectedIcon)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(expectedTip))).toBeInTheDocument();
      });

      unmount();
    }
  });
});