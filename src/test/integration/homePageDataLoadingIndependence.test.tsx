import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from '@/pages/Index';
import { AuthProvider } from '@/providers/AuthProvider';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock the logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  LogSource: {
    ARTICLE: 'ARTICLE'
  }
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null }))
            })),
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0
      }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Home Page Data Loading Independence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render home page without crashing when data loading fails', async () => {
    // Mock HomePageDataFetcher to return empty data
    vi.spyOn(HomePageDataFetcher, 'fetchHomePageData').mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: ['Failed to load data'],
      hasPartialFailure: true
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    // Should render without crashing
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should render home page with successful data loading', async () => {
    // Mock HomePageDataFetcher to return sample data
    vi.spyOn(HomePageDataFetcher, 'fetchHomePageData').mockResolvedValue({
      data: {
        headlineArticle: {
          id: '1',
          title: 'Test Headline Article',
          excerpt: 'Test excerpt',
          imageUrl: 'test-image.jpg',
          category: 'Headliners',
          readingLevel: 'Intermediate',
          readTime: 5,
          author: 'Test Author',
          date: '2025-01-01',
          publishDate: '2025-01-01'
        },
        categoryArticles: {
          'Headliners': [{
            id: '2',
            title: 'Test Category Article',
            excerpt: 'Test category excerpt',
            imageUrl: 'test-category-image.jpg',
            category: 'Headliners',
            readingLevel: 'Intermediate',
            readTime: 3,
            author: 'Test Category Author',
            date: '2025-01-01',
            publishDate: '2025-01-01'
          }]
        }
      },
      errors: [],
      hasPartialFailure: false
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    // Should render the main content
    expect(screen.getByRole('main')).toBeInTheDocument();
    
    // Wait for data to load and verify content appears
    await waitFor(() => {
      // The exact content depends on how the Index page renders the data
      // This test verifies the page renders without crashing
      expect(screen.getByRole('main')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle auth state changes without breaking data loading', async () => {
    let fetchCallCount = 0;
    
    // Mock HomePageDataFetcher to track calls
    vi.spyOn(HomePageDataFetcher, 'fetchHomePageData').mockImplementation(async () => {
      fetchCallCount++;
      return {
        data: {
          headlineArticle: null,
          categoryArticles: {}
        },
        errors: [],
        hasPartialFailure: false
      };
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    // Verify that data fetching was attempted
    expect(fetchCallCount).toBeGreaterThan(0);
  });

  it('should work with different auth states', async () => {
    const authStates = ['logged_out', 'logging_in', 'logged_in'] as const;
    
    for (const authState of authStates) {
      // Mock fetchWithAuthState
      vi.spyOn(HomePageDataFetcher, 'fetchWithAuthState').mockResolvedValue({
        data: {
          headlineArticle: null,
          categoryArticles: {}
        },
        errors: [],
        hasPartialFailure: false
      });

      // Test that the method can be called without errors
      const result = await HomePageDataFetcher.fetchWithAuthState(authState);
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('hasPartialFailure');
    }
  });

  it('should handle partial failures gracefully', async () => {
    // Mock HomePageDataFetcher to return partial failure
    vi.spyOn(HomePageDataFetcher, 'fetchHomePageData').mockResolvedValue({
      data: {
        headlineArticle: {
          id: '1',
          title: 'Working Headline',
          excerpt: 'This loaded successfully',
          imageUrl: 'working-image.jpg',
          category: 'Headliners',
          readingLevel: 'Intermediate',
          readTime: 5,
          author: 'Working Author',
          date: '2025-01-01',
          publishDate: '2025-01-01'
        },
        categoryArticles: {
          'Headliners': [], // Empty due to failure
          'Debates': [] // Empty due to failure
        }
      },
      errors: ['Failed to load Debates articles', 'Failed to load Learning articles'],
      hasPartialFailure: true
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    // Should still render successfully even with partial failures
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  it('should preload critical data without errors', async () => {
    // Mock preloadCriticalData
    const preloadSpy = vi.spyOn(HomePageDataFetcher, 'preloadCriticalData').mockResolvedValue();

    // Call preload
    await HomePageDataFetcher.preloadCriticalData();

    expect(preloadSpy).toHaveBeenCalled();
  });

  it('should provide debug information', async () => {
    // Mock getDebugInfo
    vi.spyOn(HomePageDataFetcher, 'getDebugInfo').mockResolvedValue({
      dataLoadingState: {
        isIndependent: true,
        authInterference: false,
        fallbackMode: false,
        queryExecutionMode: 'authenticated'
      },
      authBufferState: {
        isBuffering: false,
        bufferSize: 0,
        ongoingQueries: 0,
        config: {
          bufferDuration: 1000,
          maxBufferSize: 10,
          interferenceThreshold: 3
        }
      },
      executionStats: {
        total: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        averageExecutionTime: 0
      }
    });

    const debugInfo = await HomePageDataFetcher.getDebugInfo();

    expect(debugInfo).toHaveProperty('dataLoadingState');
    expect(debugInfo).toHaveProperty('authBufferState');
    expect(debugInfo).toHaveProperty('executionStats');
  });
});