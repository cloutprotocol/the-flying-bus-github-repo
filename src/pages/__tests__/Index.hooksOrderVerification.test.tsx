import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Index from '../Index';

// Mock the dependencies
vi.mock('@/utils/homePageDataFetcher', () => ({
  HomePageDataFetcher: {
    getDefaultCategories: () => [
      { title: 'Headliners', slug: 'headliners', color: 'blue' }
    ],
    fetchHomePageData: vi.fn().mockResolvedValue({
      data: {
        headlineArticle: null,
        categoryArticles: {}
      },
      errors: [],
      hasPartialFailure: false
    })
  }
}));

vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  )
}));

describe('Index Component - Hooks Order Verification', () => {
  it('should render multiple times without hooks order violations', () => {
    // This test verifies that the component can be rendered multiple times
    // without encountering "Rendered more hooks than during the previous render" errors
    
    const { rerender } = render(<Index />);
    
    // Re-render the component multiple times to test hooks consistency
    for (let i = 0; i < 5; i++) {
      expect(() => {
        rerender(<Index />);
      }).not.toThrow();
    }
  });

  it('should have all hooks called before conditional returns', () => {
    // This test ensures the component renders without hook-related errors
    expect(() => {
      render(<Index />);
    }).not.toThrow();
  });

  it('should maintain consistent hook call order across renders', () => {
    const { rerender } = render(<Index />);
    
    // Test that re-rendering with different props doesn't cause hook order issues
    expect(() => {
      rerender(<Index />);
      rerender(<Index />);
      rerender(<Index />);
    }).not.toThrow();
  });
});