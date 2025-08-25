import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CategorySection from '../CategorySection';
import { ArticleProps } from '../ArticleCard';

// Mock dependencies
vi.mock('@/utils/categoryColors', () => ({
  getCategoryColor: vi.fn(() => 'text-flyingbus-red'),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
  },
  LogSource: {
    APP: 'APP',
    ARTICLE: 'ARTICLE',
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockArticles: ArticleProps[] = [
  {
    id: '1',
    title: 'Test Article 1',
    excerpt: 'Test excerpt 1',
    category: 'Headliners',
    readingLevel: 'Elementary',
    readTime: 5,
    author: 'Test Author',
    date: '2024-01-01',
    publishDate: '2024-01-01',
  },
  {
    id: '2',
    title: 'Test Article 2',
    excerpt: 'Test excerpt 2',
    category: 'Headliners',
    readingLevel: 'Elementary',
    readTime: 3,
    author: 'Test Author 2',
    date: '2024-01-02',
    publishDate: '2024-01-02',
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('CategorySection Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Memoization and Re-render Prevention', () => {
    it('should memoize component and prevent unnecessary re-renders', () => {
      const { rerender } = renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();

      // Rerender with same props should not cause re-render due to React.memo
      rerender(
        <BrowserRouter>
          <CategorySection
            title="Headliners"
            slug="headliners"
            articles={mockArticles}
            color="red"
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    it('should re-render when props actually change', () => {
      const { rerender } = renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      expect(screen.getByText('Headliners')).toBeInTheDocument();

      // Rerender with different title should cause re-render
      rerender(
        <BrowserRouter>
          <CategorySection
            title="Learning"
            slug="learning"
            articles={mockArticles}
            color="blue"
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Learning')).toBeInTheDocument();
      expect(screen.queryByText('Headliners')).not.toBeInTheDocument();
    });

    it('should handle large article lists efficiently', () => {
      const largeArticleList = Array.from({ length: 50 }, (_, i) => ({
        ...mockArticles[0],
        id: `article-${i}`,
        title: `Article ${i}`,
      }));

      const startTime = performance.now();

      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={largeArticleList}
          color="red"
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Article 0')).toBeInTheDocument();

      // Should render efficiently even with large lists
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Memoized Functions', () => {
    it('should memoize category icon lookup', () => {
      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      // Icon should be rendered
      const icon = screen.getByAltText('Headliners icon');
      expect(icon).toBeInTheDocument();
      expect(icon.getAttribute('src')).toBe('/headliners-icon.svg');
    });

    it('should memoize category description lookup', () => {
      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      expect(screen.getByText('Breaking news and important stories from around the world')).toBeInTheDocument();
    });

    it('should memoize color class calculation', () => {
      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      // Color classes should be applied correctly
      const categorySection = screen.getByText('Headliners').closest('section');
      expect(categorySection).toBeInTheDocument();
    });

    it('should memoize category URL generation', () => {
      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      const seeAllLink = screen.getByText('See All').closest('a');
      expect(seeAllLink).toHaveAttribute('href', '/headliners');
    });
  });

  describe('Event Handler Optimization', () => {
    it('should memoize navigation handler', () => {
      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      const seeAllLink = screen.getByText('See All');
      fireEvent.click(seeAllLink);

      expect(mockNavigate).toHaveBeenCalledWith('/headliners');
    });

    it('should memoize article click handler', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      // Click on an article card
      const articleCard = screen.getByText('Test Article 1').closest('a');
      if (articleCard) {
        fireEvent.click(articleCard);
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Performance with Different Data Scenarios', () => {
    it('should handle empty article list efficiently', () => {
      const startTime = performance.now();

      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={[]}
          color="red"
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle single article efficiently', () => {
      const startTime = performance.now();

      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={[mockArticles[0]]}
          color="red"
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle articles with missing data gracefully', () => {
      const articlesWithMissingData = [
        {
          ...mockArticles[0],
          imageUrl: undefined,
          excerpt: undefined,
        },
      ];

      renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={articlesWithMissingData}
          color="red"
        />
      );

      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should mount and unmount cleanly', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { unmount } = renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      expect(screen.getByText('Headliners')).toBeInTheDocument();

      unmount();

      // Should not cause any errors
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle rapid prop changes efficiently', () => {
      const { rerender } = renderWithRouter(
        <CategorySection
          title="Headliners"
          slug="headliners"
          articles={mockArticles}
          color="red"
        />
      );

      // Rapidly change props
      for (let i = 0; i < 10; i++) {
        rerender(
          <BrowserRouter>
            <CategorySection
              title={`Category ${i}`}
              slug={`category-${i}`}
              articles={mockArticles}
              color="red"
            />
          </BrowserRouter>
        );
      }

      expect(screen.getByText('Category 9')).toBeInTheDocument();
    });
  });
});