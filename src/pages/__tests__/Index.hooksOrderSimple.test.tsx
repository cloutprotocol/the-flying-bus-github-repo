import { render } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock all dependencies to avoid complex setup
vi.mock('@/utils/homePageDataFetcher', () => ({
  HomePageDataFetcher: {
    getDefaultCategories: vi.fn(() => []),
    fetchHomePageData: vi.fn(() => new Promise(() => {})) // Never resolves to keep loading
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

describe('Index Component - Hooks Order Compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not throw hooks order violations during render', () => {
    // This test specifically checks that no "Rendered more hooks than during the previous render" error occurs
    expect(() => {
      renderWithRouter(<Index />);
    }).not.toThrow();
  });

  it('should not throw hooks order violations during multiple renders', () => {
    // Render the component multiple times to ensure hooks are called in consistent order
    expect(() => {
      const { unmount } = renderWithRouter(<Index />);
      unmount();
    }).not.toThrow();

    expect(() => {
      const { unmount } = renderWithRouter(<Index />);
      unmount();
    }).not.toThrow();

    expect(() => {
      renderWithRouter(<Index />);
    }).not.toThrow();
  });

  it('should handle state changes without hooks order violations', async () => {
    const mockFetchHomePageData = vi.mocked(HomePageDataFetcher.fetchHomePageData);
    
    // First render with loading state
    mockFetchHomePageData.mockImplementation(() => new Promise(() => {}));
    const { unmount } = renderWithRouter(<Index />);
    unmount();

    // Second render with error state
    mockFetchHomePageData.mockRejectedValue(new Error('Test error'));
    expect(() => {
      renderWithRouter(<Index />);
    }).not.toThrow();
  });
});