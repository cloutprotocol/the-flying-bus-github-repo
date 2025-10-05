import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock the HomePageDataFetcher
vi.mock('@/utils/homePageDataFetcher', () => ({
  HomePageDataFetcher: {
    getDefaultCategories: vi.fn(() => [
      { title: 'Headliners', slug: 'headliners', color: 'blue' },
      { title: 'Debates', slug: 'debates', color: 'red' }
    ]),
    fetchHomePageData: vi.fn()
  }
}));

// Mock MainLayout to avoid complex dependencies
vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  )
}));

// Mock logger to avoid console noise
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

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Index Component - Hooks Order Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render without hooks order violations', async () => {
    // Mock successful data fetch
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    });

    // This should not throw any hooks order errors
    expect(() => {
      renderWithRouter(<Index />);
    }).not.toThrow();

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });
  });

  it('should handle multiple renders without hooks order errors', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    });

    // Render multiple times to test hooks consistency
    const { unmount, rerender } = renderWithRouter(<Index />);
    
    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });

    // Unmount and remount to test hooks order consistency
    unmount();
    
    expect(() => {
      rerender(<Index />);
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });
  });

  it('should render loading state correctly', () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    // Mock a slow response to keep loading state
    mockFetchHomePageData.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Index />);

    // Should show loading state
    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('should render error state correctly', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockRejectedValue(new Error('Network error'));

    renderWithRouter(<Index />);

    await waitFor(() => {
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should render no content state correctly', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    });

    renderWithRouter(<Index />);

    await waitFor(() => {
      expect(screen.getByText('No Published Content Yet')).toBeInTheDocument();
    });
  });

  it('should render content state correctly', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: {
          id: '1',
          title: 'Test Article',
          content: 'Test content',
          category: 'Headliners',
          author: 'Test Author',
          publishedAt: new Date().toISOString(),
          slug: 'test-article'
        },
        categoryArticles: {
          'Headliners': [{
            id: '2',
            title: 'Category Article',
            content: 'Category content',
            category: 'Headliners',
            author: 'Test Author',
            publishedAt: new Date().toISOString(),
            slug: 'category-article'
          }]
        }
      },
      errors: [],
      hasPartialFailure: false
    });

    renderWithRouter(<Index />);

    await waitFor(() => {
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
      // Should not show loading or error states
      expect(screen.queryByText('Loading articles...')).not.toBeInTheDocument();
      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument();
      expect(screen.queryByText('No Published Content Yet')).not.toBeInTheDocument();
    });
  });
});