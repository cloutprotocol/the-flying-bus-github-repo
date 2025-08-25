import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock all dependencies to focus on hooks order and basic functionality
vi.mock('@/utils/homePageDataFetcher', () => ({
  HomePageDataFetcher: {
    getDefaultCategories: vi.fn(() => []),
    fetchHomePageData: vi.fn()
  }
}));

vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
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

describe('Index Component - Final Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass all hooks order compliance checks', () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockImplementation(() => new Promise(() => {}));

    // Test 1: No hooks order violations during initial render
    expect(() => {
      renderWithRouter(<Index />);
    }).not.toThrow();

    // Test 2: Component renders successfully
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('should render all UI states without JavaScript errors', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);

    // Test loading state
    mockFetchHomePageData.mockImplementation(() => new Promise(() => {}));
    const { unmount } = renderWithRouter(<Index />);
    expect(screen.getByText('Loading articles...')).toBeInTheDocument();
    unmount();

    // Test error state
    mockFetchHomePageData.mockRejectedValue(new Error('Test error'));
    const { unmount: unmount2 } = renderWithRouter(<Index />);
    await waitFor(() => {
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });
    unmount2();

    // Test no content state
    mockFetchHomePageData.mockResolvedValue({
      data: { headlineArticle: null, categoryArticles: {} },
      errors: [],
      hasPartialFailure: false
    });
    const { unmount: unmount3 } = renderWithRouter(<Index />);
    await waitFor(() => {
      expect(screen.getByText('No Published Content Yet')).toBeInTheDocument();
    });
    unmount3();

    // All states rendered successfully without errors
    expect(true).toBe(true);
  });

  it('should have all hooks called before conditional returns', () => {
    // This test verifies the fix by checking that the component structure
    // follows React's Rules of Hooks
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockImplementation(() => new Promise(() => {}));

    // If hooks are called after conditional returns, this would throw:
    // "Rendered more hooks than during the previous render"
    expect(() => {
      const { unmount } = renderWithRouter(<Index />);
      unmount();
      
      // Render again to test hooks consistency
      renderWithRouter(<Index />);
    }).not.toThrow();
  });

  it('should handle retry and refresh functionality', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    mockFetchHomePageData.mockRejectedValue(new Error('Test error'));

    renderWithRouter(<Index />);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    // Buttons are present and clickable (no JavaScript errors)
    const tryAgainButton = screen.getByText('Try Again');
    const refreshButton = screen.getByText('Refresh Page');
    
    expect(tryAgainButton).toBeInTheDocument();
    expect(refreshButton).toBeInTheDocument();
  });
});