import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock the data fetcher
vi.mock('@/utils/homePageDataFetcher');

// Mock the layout and components
vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/components/Articles/FeatureArticle', () => ({
  default: (props: any) => <div data-testid="feature-article">{props.title}</div>
}));

vi.mock('@/components/Articles/CategorySection', () => ({
  default: (props: any) => <div data-testid="category-section">{props.title}</div>
}));

// Mock logger
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

const mockHomePageDataFetcher = vi.mocked(HomePageDataFetcher);

describe('Index Component Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock default categories
    mockHomePageDataFetcher.getDefaultCategories.mockReturnValue([
      { title: 'Headliners', slug: 'headliners', color: 'red' },
      { title: 'Debates', slug: 'debates', color: 'orange' }
    ]);
  });

  it('should render loading state initially', () => {
    // Mock a pending promise
    mockHomePageDataFetcher.fetchHomePageData.mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    render(<Index />);

    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
  });

  it('should render content successfully after data fetch', async () => {
    const mockData = {
      data: {
        headlineArticle: {
          id: '1',
          title: 'Test Headline',
          excerpt: 'Test excerpt',
          category: 'Headliners',
          author: 'Test Author',
          publishedAt: '2024-01-01',
          imageUrl: 'test.jpg'
        },
        categoryArticles: {
          'Headliners': [
            {
              id: '2',
              title: 'Test Article',
              excerpt: 'Test excerpt',
              category: 'Headliners',
              author: 'Test Author',
              publishedAt: '2024-01-01',
              imageUrl: 'test.jpg'
            }
          ]
        }
      },
      errors: [],
      hasPartialFailure: false
    };

    mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue(mockData);

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByTestId('feature-article')).toBeInTheDocument();
      expect(screen.getByTestId('category-section')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Headline')).toBeInTheDocument();
    expect(screen.getByText('Headliners')).toBeInTheDocument();
  });

  it('should render error state on complete failure', async () => {
    mockHomePageDataFetcher.fetchHomePageData.mockRejectedValue(
      new Error('Network error')
    );

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText('Oops!')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should render partial failure notification', async () => {
    const mockData = {
      data: {
        headlineArticle: null,
        categoryArticles: {
          'Headliners': [
            {
              id: '1',
              title: 'Test Article',
              excerpt: 'Test excerpt',
              category: 'Headliners',
              author: 'Test Author',
              publishedAt: '2024-01-01',
              imageUrl: 'test.jpg'
            }
          ]
        }
      },
      errors: ['Failed to load featured article'],
      hasPartialFailure: true
    };

    mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue(mockData);

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText("Some content couldn't be loaded, but we're showing what's available.")).toBeInTheDocument();
      expect(screen.getByTestId('category-section')).toBeInTheDocument();
    });
  });

  it('should render no content message when no articles available', async () => {
    const mockData = {
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    };

    mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue(mockData);

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByText('No Published Content Yet')).toBeInTheDocument();
      expect(screen.getByText("We're working on creating amazing content for you. Check back soon to see the latest articles from our young journalists!")).toBeInTheDocument();
    });
  });

  it('should call fetchHomePageData with abort signal', async () => {
    const mockData = {
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    };

    mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue(mockData);

    render(<Index />);

    await waitFor(() => {
      expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledWith(
        expect.any(AbortSignal),
        expect.any(Array)
      );
    });
  });
});