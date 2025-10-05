import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Index from '@/pages/Index';
import * as articlesData from '@/data/articles';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { AuthProvider } from '@/providers/AuthProvider';

// Mock the articles data module
vi.mock('@/data/articles', () => ({
  getHeadlineArticle: vi.fn(),
  getCategoryArticles: vi.fn(),
}));

// Mock the logger to avoid console noise in tests
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  LogSource: {
    ARTICLE: 'ARTICLE',
    AUTH: 'AUTH',
  },
}));

// Mock Supabase client to avoid authentication issues in tests
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

// Mock useAuth hook to provide a default auth state
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

// Mock ResizeObserver for responsive design tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Test data
const mockHeadlineArticle: ArticleProps = {
  id: 'headline-1',
  title: 'Breaking: Major News Story',
  excerpt: 'This is a major breaking news story that everyone should know about.',
  content: 'Full content of the breaking news story...',
  author: 'Jane Reporter',
  publishedAt: '2024-01-15T10:00:00Z',
  category: 'Headliners',
  imageUrl: 'https://example.com/headline-image.jpg',
  slug: 'breaking-major-news-story',
  readTime: 5,
  tags: ['breaking', 'news'],
  featured: true,
};

const mockCategoryArticles: Record<string, ArticleProps[]> = {
  'Headliners': [
    {
      id: 'headliner-1',
      title: 'Important Headliner Story',
      excerpt: 'An important story in the headliners category.',
      content: 'Full content...',
      author: 'John Writer',
      publishedAt: '2024-01-14T15:30:00Z',
      category: 'Headliners',
      imageUrl: 'https://example.com/headliner-1.jpg',
      slug: 'important-headliner-story',
      readTime: 3,
      tags: ['important'],
      featured: false,
    },
    {
      id: 'headliner-2',
      title: 'Another Headliner',
      excerpt: 'Another story in headliners.',
      content: 'Full content...',
      author: 'Sarah News',
      publishedAt: '2024-01-13T12:00:00Z',
      category: 'Headliners',
      imageUrl: 'https://example.com/headliner-2.jpg',
      slug: 'another-headliner',
      readTime: 4,
      tags: ['news'],
      featured: false,
    },
  ],
  'Debates': [
    {
      id: 'debate-1',
      title: 'Should Schools Start Later?',
      excerpt: 'A debate about school start times and student health.',
      content: 'Full debate content...',
      author: 'Mike Debater',
      publishedAt: '2024-01-12T09:00:00Z',
      category: 'Debates',
      imageUrl: 'https://example.com/debate-1.jpg',
      slug: 'should-schools-start-later',
      readTime: 6,
      tags: ['education', 'health'],
      featured: false,
    },
  ],
  'Learning': [
    {
      id: 'learning-1',
      title: 'How Photosynthesis Works',
      excerpt: 'Learn about how plants make their own food.',
      content: 'Educational content about photosynthesis...',
      author: 'Dr. Science',
      publishedAt: '2024-01-11T14:00:00Z',
      category: 'Learning',
      imageUrl: 'https://example.com/learning-1.jpg',
      slug: 'how-photosynthesis-works',
      readTime: 8,
      tags: ['science', 'plants'],
      featured: false,
    },
  ],
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Home Page End-to-End Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default successful responses
    vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(mockHeadlineArticle);
    vi.mocked(articlesData.getCategoryArticles).mockImplementation((category: string) => {
      return Promise.resolve(mockCategoryArticles[category] || []);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Page Load with Real Data', () => {
    it('should load and display all content within 3 seconds', async () => {
      const startTime = Date.now();
      
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Should show loading state initially
      expect(screen.getByText('Loading articles...')).toBeInTheDocument();

      // Wait for content to load
      await waitFor(
        () => {
          expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Requirement 1.1: Load within 3 seconds
    });

    it('should display complete page structure with all sections', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify main layout is present
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Verify featured article section
      expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      expect(screen.getByText('This is a major breaking news story that everyone should know about.')).toBeInTheDocument();

      // Verify category sections are present
      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Debates')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();

      // Verify articles within categories
      expect(screen.getByText('Important Headliner Story')).toBeInTheDocument();
      expect(screen.getByText('Should Schools Start Later?')).toBeInTheDocument();
      expect(screen.getByText('How Photosynthesis Works')).toBeInTheDocument();
    });

    it('should handle data fetching with proper error boundaries', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify no error states are shown when data loads successfully
      expect(screen.queryByText(/Something Went Wrong/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Unable to load articles/)).not.toBeInTheDocument();
    });
  });

  describe('Featured Article Display', () => {
    it('should prominently display featured article when available', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify featured article is displayed prominently
      const featuredArticle = screen.getByText('Breaking: Major News Story').closest('article');
      expect(featuredArticle).toBeInTheDocument();
      
      // Verify featured article has proper styling and content
      expect(screen.getByText('This is a major breaking news story that everyone should know about.')).toBeInTheDocument();
      expect(screen.getByText('Jane Reporter')).toBeInTheDocument();
    });

    it('should gracefully handle missing featured article', async () => {
      // Mock no headline article
      vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(null);

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Important Headliner Story')).toBeInTheDocument();
      });

      // Verify featured article section is not shown
      expect(screen.queryByText('Breaking: Major News Story')).not.toBeInTheDocument();
      
      // Verify category sections are still displayed
      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Important Headliner Story')).toBeInTheDocument();
    });

    it('should display featured article with proper image handling', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Check for image element (may be lazy loaded or have alt text)
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });
  });

  describe('Category Sections Rendering', () => {
    it('should render all categories with articles in proper sections', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify each category section is rendered
      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Debates')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();

      // Verify articles are in correct sections
      expect(screen.getByText('Important Headliner Story')).toBeInTheDocument();
      expect(screen.getByText('Another Headliner')).toBeInTheDocument();
      expect(screen.getByText('Should Schools Start Later?')).toBeInTheDocument();
      expect(screen.getByText('How Photosynthesis Works')).toBeInTheDocument();
    });

    it('should skip empty category sections', async () => {
      // Mock some categories as empty
      vi.mocked(articlesData.getCategoryArticles).mockImplementation((category: string) => {
        if (category === 'Spice It Up' || category === 'Storyboard') {
          return Promise.resolve([]);
        }
        return Promise.resolve(mockCategoryArticles[category] || []);
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify populated categories are shown
      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Debates')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();

      // Verify empty categories are not shown
      expect(screen.queryByText('Spice It Up')).not.toBeInTheDocument();
      expect(screen.queryByText('Storyboard')).not.toBeInTheDocument();
    });

    it('should display category sections with consistent styling', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify category headings are properly styled
      const categoryHeadings = screen.getAllByRole('heading', { level: 2 });
      expect(categoryHeadings.length).toBeGreaterThan(0);

      // Verify each category section has proper structure
      const headlinersSection = screen.getByText('Headliners').closest('section');
      expect(headlinersSection).toBeInTheDocument();
      
      const debatesSection = screen.getByText('Debates').closest('section');
      expect(debatesSection).toBeInTheDocument();
    });
  });

  describe('Responsive Design Testing', () => {
    it('should render properly on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      // Mock matchMedia for mobile
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify content is accessible on mobile
      expect(screen.getByText('Breaking: Major News Story')).toBeVisible();
      expect(screen.getByText('Important Headliner Story')).toBeVisible();
    });

    it('should render properly on tablet viewport', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify content is properly displayed on tablet
      expect(screen.getByText('Breaking: Major News Story')).toBeVisible();
      expect(screen.getByText('Important Headliner Story')).toBeVisible();
    });

    it('should render properly on desktop viewport', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080,
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify content is properly displayed on desktop
      expect(screen.getByText('Breaking: Major News Story')).toBeVisible();
      expect(screen.getByText('Important Headliner Story')).toBeVisible();
    });
  });

  describe('Navigation Integration', () => {
    it('should handle navigation to home page correctly', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify page loads without navigation errors
      expect(window.location.pathname).toBe('/');
    });

    it('should support navigation from home page to other pages', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Find and click on an article link (if present)
      const articleLinks = screen.getAllByRole('link');
      expect(articleLinks.length).toBeGreaterThan(0);

      // Verify links are properly formed
      articleLinks.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should maintain proper state during navigation', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify component state is stable
      expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      expect(screen.getByText('Important Headliner Story')).toBeInTheDocument();

      // Simulate a re-render to ensure state persistence
      act(() => {
        // Force a re-render
        window.dispatchEvent(new Event('resize'));
      });

      // Verify content is still present after re-render
      expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      expect(screen.getByText('Important Headliner Story')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle complete data loading failure gracefully', async () => {
      // Mock complete failure
      vi.mocked(articlesData.getHeadlineArticle).mockRejectedValue(new Error('Network error'));
      vi.mocked(articlesData.getCategoryArticles).mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Connection Problem|Something Went Wrong/)).toBeInTheDocument();
      });

      // Verify error state is displayed
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    it('should handle partial data loading failure', async () => {
      // Mock partial failure - headline succeeds, some categories fail
      vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(mockHeadlineArticle);
      vi.mocked(articlesData.getCategoryArticles).mockImplementation((category: string) => {
        if (category === 'Debates') {
          return Promise.reject(new Error('Category fetch failed'));
        }
        return Promise.resolve(mockCategoryArticles[category] || []);
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Should show partial failure notification
      await waitFor(() => {
        expect(screen.getByText(/Partial Content Loading/)).toBeInTheDocument();
      });

      // Verify successful content is still displayed
      expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      expect(screen.getByText('Important Headliner Story')).toBeInTheDocument();
    });

    it('should provide working retry functionality', async () => {
      // Mock initial failure then success
      let callCount = 0;
      vi.mocked(articlesData.getHeadlineArticle).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockHeadlineArticle);
      });

      vi.mocked(articlesData.getCategoryArticles).mockImplementation((category: string) => {
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockCategoryArticles[category] || []);
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      // Click retry button
      fireEvent.click(screen.getByText('Try Again'));

      // Wait for successful retry
      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify content is displayed after retry
      expect(screen.getByText('Important Headliner Story')).toBeInTheDocument();
    });
  });

  describe('No Content Scenarios', () => {
    it('should display appropriate message when no content is available', async () => {
      // Mock no content scenario
      vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(null);
      vi.mocked(articlesData.getCategoryArticles).mockResolvedValue([]);

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No Published Content Yet')).toBeInTheDocument();
      });

      // Verify no content message and helpful information
      expect(screen.getByText(/We're working on creating amazing content/)).toBeInTheDocument();
      expect(screen.getByText('Check for New Content')).toBeInTheDocument();
      expect(screen.getByText(/What to expect:/)).toBeInTheDocument();
    });

    it('should handle scenario with only featured article', async () => {
      // Mock scenario with only headline, no category articles
      vi.mocked(articlesData.getHeadlineArticle).mockResolvedValue(mockHeadlineArticle);
      vi.mocked(articlesData.getCategoryArticles).mockResolvedValue([]);

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      });

      // Verify featured article is shown
      expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      
      // Verify appropriate message for missing category content
      expect(screen.getByText(/More Content Coming Soon/)).toBeInTheDocument();
    });
  });

  describe('Performance and Loading States', () => {
    it('should show proper loading states during data fetch', async () => {
      // Mock slow loading
      vi.mocked(articlesData.getHeadlineArticle).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockHeadlineArticle), 1000))
      );

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Verify loading state is shown
      expect(screen.getByText('Loading articles...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument(); // Loading spinner

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('Breaking: Major News Story')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Verify loading state is removed
      expect(screen.queryByText('Loading articles...')).not.toBeInTheDocument();
    });

    it('should handle component unmounting during data fetch', async () => {
      // Mock slow loading
      vi.mocked(articlesData.getHeadlineArticle).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockHeadlineArticle), 2000))
      );

      const { unmount } = render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Verify loading state
      expect(screen.getByText('Loading articles...')).toBeInTheDocument();

      // Unmount component before data loads
      unmount();

      // Wait to ensure no errors occur
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });
  });
});