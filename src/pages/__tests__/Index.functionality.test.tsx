import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock dependencies
vi.mock('@/utils/homePageDataFetcher', () => ({
  HomePageDataFetcher: {
    getDefaultCategories: vi.fn(() => [
      { title: 'Headliners', slug: 'headliners', color: 'blue' }
    ]),
    fetchHomePageData: vi.fn()
  }
}));

vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  )
}));

vi.mock('@/components/Articles/FeatureArticle', () => ({
  default: () => <div data-testid="feature-article">Feature Article</div>
}));

vi.mock('@/components/Articles/CategorySection', () => ({
  default: () => <div data-testid="category-section">Category Section</div>
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

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Index Component - Functionality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state correctly', () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithRouter(<Index />);

    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('should render error state and handle retry', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockRejectedValue(new Error('Network error'));

    renderWithRouter(<Index />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();

    // Test retry functionality
    const retryButton = screen.getByText('Try Again');
    
    // Mock successful retry
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    });

    fireEvent.click(retryButton);

    // Should show loading state during retry
    await waitFor(() => {
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
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

    expect(screen.getByText('Check for New Content')).toBeInTheDocument();
  });

  it('should render partial failure notification with retry', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {
          'Headliners': [{
            id: '1',
            title: 'Test Article',
            content: 'Test content',
            category: 'Headliners',
            author: 'Test Author',
            publishedAt: new Date().toISOString(),
            slug: 'test-article'
          }]
        }
      },
      errors: ['Some error'],
      hasPartialFailure: true
    });

    renderWithRouter(<Index />);

    await waitFor(() => {
      expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
    });

    // Should have retry button in notification
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeInTheDocument();

    // Should have dismiss button
    const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
    expect(dismissButton).toBeInTheDocument();

    // Test dismiss functionality
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Partial Content Loading')).not.toBeInTheDocument();
    });
  });

  it('should render content state correctly', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: {
          id: '1',
          title: 'Feature Article',
          content: 'Feature content',
          category: 'Headliners',
          author: 'Test Author',
          publishedAt: new Date().toISOString(),
          slug: 'feature-article'
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
    });

    // Should not show loading, error, or no content states
    expect(screen.queryByText('Loading articles...')).not.toBeInTheDocument();
    expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument();
    expect(screen.queryByText('No Published Content Yet')).not.toBeInTheDocument();
  });
});