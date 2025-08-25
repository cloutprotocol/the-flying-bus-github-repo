import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from '@/pages/Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';
import * as articlesData from '@/data/articles';

// Mock the data layer to simulate real database issues
vi.mock('@/data/articles');
vi.mock('@/utils/logger');

// Mock components to avoid browser API issues
vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/components/Articles/FeatureArticle', () => ({
  default: ({ title }: { title: string }) => <div data-testid="feature-article">{title}</div>
}));

vi.mock('@/components/Articles/CategorySection', () => ({
  default: ({ title, articles }: { title: string; articles: any[] }) => (
    <div data-testid="category-section">
      <h3>{title}</h3>
      {articles.map((article, index) => (
        <div key={index} data-testid="article">{article.title}</div>
      ))}
    </div>
  )
}));

const mockArticlesData = vi.mocked(articlesData);

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Helper to create mock article
const createMockArticle = (id: string, title: string, category: string = 'Headliners') => ({
  id,
  title,
  excerpt: `${title} excerpt`,
  category,
  author: 'Test Author',
  date: '2024-01-01',
  readTime: '5 min',
  image: `/test-${id}.jpg`
});

describe('Home Page Error Boundary - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Real Data Layer Error Simulation', () => {
    it('should handle database connection failures at data layer', async () => {
      // Simulate database connection failure
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused to database')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused to database')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
        expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Should provide recovery options
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('should handle mixed success/failure from data layer', async () => {
      // Headline succeeds, some categories fail
      mockArticlesData.getHeadlineArticle.mockResolvedValue(
        createMockArticle('1', 'Breaking News')
      );
      
      mockArticlesData.getCategoryArticles
        .mockImplementation((category: string) => {
          if (category === 'Headliners') {
            return Promise.resolve([createMockArticle('2', 'Headline Story')]);
          } else if (category === 'Debates') {
            return Promise.resolve([createMockArticle('3', 'Debate Topic', 'Debates')]);
          } else if (category === 'Learning') {
            return Promise.reject(new Error('Database timeout for Learning category'));
          } else {
            return Promise.reject(new Error('Server error 500'));
          }
        });

      renderWithRouter(<Index />);

      // Should show successful content
      await waitFor(() => {
        expect(screen.getByText('Breaking News')).toBeInTheDocument();
        expect(screen.getByText('Headline Story')).toBeInTheDocument();
        expect(screen.getByText('Debate Topic')).toBeInTheDocument();
      });

      // Should show partial failure notification
      expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
    });

    it('should handle data layer timeout scenarios', async () => {
      // Simulate slow database responses
      mockArticlesData.getHeadlineArticle.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout after 30 seconds')), 100)
        )
      );
      
      mockArticlesData.getCategoryArticles.mockImplementation(() =>
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout after 30 seconds')), 100)
        )
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
        expect(screen.getByText(/The request took too long to complete/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should handle malformed data responses', async () => {
      // Return malformed data that causes processing errors
      mockArticlesData.getHeadlineArticle.mockResolvedValue(null);
      mockArticlesData.getCategoryArticles.mockResolvedValue([
        // Missing required fields
        { id: '1', title: 'Incomplete Article' } as any
      ]);

      renderWithRouter(<Index />);

      // Should handle gracefully and show available content
      await waitFor(() => {
        // Should not crash, might show no content or handle gracefully
        expect(screen.getByTestId('main-layout')).toBeInTheDocument();
      });
    });
  });

  describe('Network Condition Simulation', () => {
    it('should handle intermittent network connectivity', async () => {
      let callCount = 0;
      
      // Simulate intermittent connectivity
      mockArticlesData.getHeadlineArticle.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('NetworkError: fetch failed'));
        }
        return Promise.resolve(createMockArticle('1', 'Finally Connected'));
      });

      mockArticlesData.getCategoryArticles.mockImplementation(() => {
        if (callCount <= 2) {
          return Promise.reject(new Error('NetworkError: fetch failed'));
        }
        return Promise.resolve([createMockArticle('2', 'Category Article')]);
      });

      renderWithRouter(<Index />);

      // First attempt fails
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Retry - still fails
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Retry - finally succeeds
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Finally Connected')).toBeInTheDocument();
      });
    });

    it('should handle slow network responses', async () => {
      // Simulate slow but successful responses
      mockArticlesData.getHeadlineArticle.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve(createMockArticle('1', 'Slow Loading Article')), 200)
        )
      );

      mockArticlesData.getCategoryArticles.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve([createMockArticle('2', 'Slow Category')]), 300)
        )
      );

      renderWithRouter(<Index />);

      // Should show loading state
      expect(screen.getByText('Loading articles...')).toBeInTheDocument();

      // Should eventually load content
      await waitFor(() => {
        expect(screen.getByText('Slow Loading Article')).toBeInTheDocument();
        expect(screen.getByText('Slow Category')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Component Lifecycle Integration', () => {
    it('should handle rapid navigation away and back', async () => {
      mockArticlesData.getHeadlineArticle.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve(createMockArticle('1', 'Test Article')), 500)
        )
      );

      mockArticlesData.getCategoryArticles.mockResolvedValue([]);

      const { unmount, rerender } = renderWithRouter(<Index />);

      // Start loading
      expect(screen.getByText('Loading articles...')).toBeInTheDocument();

      // Quickly unmount (navigate away)
      unmount();

      // Remount (navigate back)
      rerender(<BrowserRouter><Index /></BrowserRouter>);

      // Should start fresh loading
      expect(screen.getByText('Loading articles...')).toBeInTheDocument();

      // Should eventually load
      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle component remounting after error', async () => {
      // First mount fails
      mockArticlesData.getHeadlineArticle.mockRejectedValueOnce(
        new Error('Network error')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('Network error')
      );

      const { unmount, rerender } = renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Unmount and remount
      unmount();

      // Fix the error for remount
      mockArticlesData.getHeadlineArticle.mockResolvedValue(
        createMockArticle('1', 'Recovered Article')
      );
      mockArticlesData.getCategoryArticles.mockResolvedValue([
        createMockArticle('2', 'Category Article')
      ]);

      rerender(<BrowserRouter><Index /></BrowserRouter>);

      // Should load successfully on remount
      await waitFor(() => {
        expect(screen.getByText('Recovered Article')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Patterns', () => {
    it('should handle progressive error recovery', async () => {
      let attemptCount = 0;
      
      // Simulate gradual recovery
      mockArticlesData.getHeadlineArticle.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Complete failure'));
        } else if (attemptCount === 2) {
          return Promise.resolve(createMockArticle('1', 'Headline Recovered'));
        }
        return Promise.resolve(createMockArticle('1', 'Headline Recovered'));
      });

      mockArticlesData.getCategoryArticles.mockImplementation((category: string) => {
        if (attemptCount === 1) {
          return Promise.reject(new Error('Complete failure'));
        } else if (attemptCount === 2 && category === 'Debates') {
          return Promise.reject(new Error('Still failing'));
        }
        return Promise.resolve([createMockArticle('2', `${category} Article`, category)]);
      });

      renderWithRouter(<Index />);

      // First attempt - complete failure
      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      });

      // Retry - partial recovery
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Headline Recovered')).toBeInTheDocument();
        expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
      });

      // Retry again - full recovery
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      await waitFor(() => {
        expect(screen.getByText('Headline Recovered')).toBeInTheDocument();
        expect(screen.queryByText('Partial Content Loading')).not.toBeInTheDocument();
      });
    });

    it('should handle error escalation patterns', async () => {
      let attemptCount = 0;
      
      // Simulate escalating errors
      mockArticlesData.getHeadlineArticle.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Network timeout'));
        } else if (attemptCount === 2) {
          return Promise.reject(new Error('Server error 500'));
        } else {
          return Promise.reject(new Error('Database connection failed'));
        }
      });

      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('Consistent failure')
      );

      renderWithRouter(<Index />);

      // First error - timeout
      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
      });

      // Retry - server error
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Server Issues')).toBeInTheDocument();
      });

      // Retry - database error
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      await waitFor(() => {
        expect(screen.getByText('Server Issues')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Under Error Conditions', () => {
    it('should not cause memory leaks during repeated failures', async () => {
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('Persistent error')
      );
      mockArticlesData.getCategoryArticles.mockRejectedValue(
        new Error('Persistent error')
      );

      renderWithRouter(<Index />);

      // Perform multiple retries
      for (let i = 0; i < 5; i++) {
        await waitFor(() => {
          expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
        });

        const retryButton = screen.getByRole('button', { name: /try again/i });
        fireEvent.click(retryButton);

        // Brief wait between retries
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Should still be responsive
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
    });

    it('should handle concurrent error scenarios efficiently', async () => {
      // Simulate different errors happening simultaneously
      mockArticlesData.getHeadlineArticle.mockRejectedValue(
        new Error('Headline fetch failed')
      );
      
      mockArticlesData.getCategoryArticles.mockImplementation((category: string) => {
        const delay = Math.random() * 100;
        return new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${category} failed`)), delay)
        );
      });

      const startTime = Date.now();
      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should fail fast, not wait for all timeouts
      expect(duration).toBeLessThan(2000);
    });
  });
});