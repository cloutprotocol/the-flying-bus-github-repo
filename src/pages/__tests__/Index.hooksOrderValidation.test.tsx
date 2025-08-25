import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock dependencies to isolate the hooks order testing
vi.mock('@/utils/homePageDataFetcher', () => ({
  HomePageDataFetcher: {
    getDefaultCategories: vi.fn(() => [
      { title: 'Headliners', slug: 'headliners', color: 'blue' },
      { title: 'Debates', slug: 'debates', color: 'red' }
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
  default: (props: any) => (
    <div data-testid="feature-article">Feature Article: {props.title}</div>
  )
}));

vi.mock('@/components/Articles/CategorySection', () => ({
  default: (props: any) => (
    <div data-testid="category-section">Category: {props.title}</div>
  )
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

describe('Index Component - Hooks Order Fix Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render component multiple times without "Rendered more hooks than during the previous render" errors', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    });

    // Render the component multiple times to test hooks consistency
    for (let i = 0; i < 10; i++) {
      expect(() => {
        const { unmount } = renderWithRouter(<Index />);
        unmount();
      }).not.toThrow();
    }
  });

  it('should render successfully in loading state', () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    // Mock a promise that never resolves to keep loading state
    mockFetchHomePageData.mockImplementation(() => new Promise(() => {}));

    expect(() => {
      renderWithRouter(<Index />);
    }).not.toThrow();

    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('should render successfully in error state', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockRejectedValue(new Error('Network error'));

    expect(() => {
      renderWithRouter(<Index />);
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });
  });

  it('should render successfully in no content state', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    });

    expect(() => {
      renderWithRouter(<Index />);
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText('No Published Content Yet')).toBeInTheDocument();
    });
  });

  it('should render successfully with content', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: {
          id: '1',
          title: 'Test Headline',
          content: 'Test content',
          category: 'Headliners',
          author: 'Test Author',
          publishedAt: new Date().toISOString(),
          slug: 'test-headline'
        },
        categoryArticles: {
          'Headliners': [{
            id: '2',
            title: 'Test Article',
            content: 'Test content',
            category: 'Headliners',
            author: 'Test Author',
            publishedAt: new Date().toISOString(),
            slug: 'test-article'
          }]
        }
      },
      errors: [],
      hasPartialFailure: false
    });

    expect(() => {
      renderWithRouter(<Index />);
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId('feature-article')).toBeInTheDocument();
      expect(screen.getByTestId('category-section')).toBeInTheDocument();
    });
  });

  it('should handle state transitions without hooks order violations', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    
    // Start with loading state
    mockFetchHomePageData.mockImplementation(() => new Promise(() => {}));
    const { rerender } = renderWithRouter(<Index />);
    
    expect(screen.getByText('Loading articles...')).toBeInTheDocument();

    // Transition to error state
    mockFetchHomePageData.mockRejectedValue(new Error('Test error'));
    expect(() => {
      rerender(<Index />);
    }).not.toThrow();

    // Transition to success state
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    });
    
    expect(() => {
      rerender(<Index />);
    }).not.toThrow();
  });

  it('should maintain consistent hook call order across multiple re-renders', () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    });

    const { rerender } = renderWithRouter(<Index />);

    // Re-render multiple times to ensure hooks are called in the same order
    for (let i = 0; i < 20; i++) {
      expect(() => {
        rerender(<Index />);
      }).not.toThrow();
    }
  });
});