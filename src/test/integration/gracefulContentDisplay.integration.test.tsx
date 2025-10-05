import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Index from '@/pages/Index';
import * as HomePageDataFetcher from '@/utils/homePageDataFetcher';

// Mock the HomePageDataFetcher
vi.mock('@/utils/homePageDataFetcher');

// Mock MainLayout
vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children, fullWidth }: { children: React.ReactNode; fullWidth?: boolean }) => (
    <div data-testid="main-layout" data-full-width={fullWidth}>
      {children}
    </div>
  ),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

const mockCategories = [
  { title: 'Headliners', slug: 'headliners', color: 'red' },
  { title: 'Debates', slug: 'debates', color: 'blue' },
  { title: 'Learning', slug: 'learning', color: 'green' },
  { title: 'Spice It Up', slug: 'spice-it-up', color: 'purple' },
];

describe('Graceful Content Display - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(HomePageDataFetcher.HomePageDataFetcher.getDefaultCategories).mockReturnValue(mockCategories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Real-world Content Scenarios', () => {
    it('should handle mixed content availability gracefully', async () => {
      // Simulate a realistic scenario with some content missing
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: {
            id: '1',
            title: 'Breaking News Story',
            excerpt: 'Important news happening now',
            category: 'Headliners',
            readingLevel: 'Elementary',
            readTime: 3,
            author: 'News Reporter',
            date: '2024-01-01',
            publishDate: '2024-01-01',
            imageUrl: 'https://example.com/news.jpg'
          },
          categoryArticles: {
            'Headliners': [
              { id: '2', title: 'News 1', excerpt: 'News excerpt', category: 'Headliners', readingLevel: 'Elementary', readTime: 2, author: 'Author 1', date: '2024-01-01', publishDate: '2024-01-01' }
            ],
            'Debates': [], // Empty category
            'Learning': [
              { id: '3', title: 'Learn Something', excerpt: 'Educational content', category: 'Learning', readingLevel: 'Elementary', readTime: 5, author: 'Teacher', date: '2024-01-01', publishDate: '2024-01-01' }
            ],
            'Spice It Up': [] // Empty category
          }
        },
        errors: [],
        hasPartialFailure: false
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        // Should show featured article
        expect(screen.getByText('Breaking News Story')).toBeInTheDocument();
      });

      // Should show categories with content
      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Learning')).toBeInTheDocument();
      
      // Should NOT show empty categories
      expect(screen.queryByText('Debates')).not.toBeInTheDocument();
      expect(screen.queryByText('Spice It Up')).not.toBeInTheDocument();
      
      // Should not show any error or no-content messages
      expect(screen.queryByText('No Published Content Yet')).not.toBeInTheDocument();
      expect(screen.queryByText('Something Went Wrong')).not.toBeInTheDocument();
    });

    it('should handle featured article with missing image gracefully', async () => {
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: {
            id: '1',
            title: 'Story Without Image',
            excerpt: 'This story has no image',
            category: 'Headliners',
            readingLevel: 'Elementary',
            readTime: 3,
            author: 'Reporter',
            date: '2024-01-01',
            publishDate: '2024-01-01'
            // No imageUrl provided
          },
          categoryArticles: {
            'Headliners': [
              { id: '2', title: 'News 1', excerpt: 'News excerpt', category: 'Headliners', readingLevel: 'Elementary', readTime: 2, author: 'Author 1', date: '2024-01-01', publishDate: '2024-01-01' }
            ]
          }
        },
        errors: [],
        hasPartialFailure: false
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Story Without Image')).toBeInTheDocument();
      });

      // Should show the featured article content
      expect(screen.getByText('This story has no image')).toBeInTheDocument();
      expect(screen.getByText('Reporter')).toBeInTheDocument();
      
      // Should show category content
      expect(screen.getByText('Headliners')).toBeInTheDocument();
      
      // Should show fallback background (gradient) instead of broken image
      const fallbackDiv = document.querySelector('.bg-gradient-to-br');
      expect(fallbackDiv).toBeInTheDocument();
    });

    it('should handle partial failure with graceful degradation', async () => {
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: {
            id: '1',
            title: 'Available Story',
            excerpt: 'This story loaded successfully',
            category: 'Headliners',
            readingLevel: 'Elementary',
            readTime: 3,
            author: 'Reporter',
            date: '2024-01-01',
            publishDate: '2024-01-01',
            imageUrl: 'https://example.com/image.jpg'
          },
          categoryArticles: {
            'Headliners': [
              { id: '2', title: 'Available News', excerpt: 'This loaded', category: 'Headliners', readingLevel: 'Elementary', readTime: 2, author: 'Author', date: '2024-01-01', publishDate: '2024-01-01' }
            ]
            // Other categories missing due to partial failure
          }
        },
        errors: ['Failed to load Debates category', 'Failed to load Learning category'],
        hasPartialFailure: true
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Available Story')).toBeInTheDocument();
      });

      // Should show available content
      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Available News')).toBeInTheDocument();
      
      // Should show partial failure notification
      expect(screen.getByText('Partial Content Loading')).toBeInTheDocument();
      expect(screen.getByText(/Some sections couldn't be loaded/)).toBeInTheDocument();
      
      // Should have retry button in notification
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle complete content absence gracefully', async () => {
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
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

      // Should show helpful no-content message
      expect(screen.getByText(/We're working on creating amazing content/)).toBeInTheDocument();
      expect(screen.getByText('What to expect:')).toBeInTheDocument();
      
      // Should show category previews
      expect(screen.getByText(/Breaking news and important stories in/)).toBeInTheDocument();
      expect(screen.getByText(/Educational content in/)).toBeInTheDocument();
      
      // Should have action button
      expect(screen.getByText('Check for New Content')).toBeInTheDocument();
      
      // Should not show any article content
      expect(screen.queryByTestId('feature-article')).not.toBeInTheDocument();
      expect(screen.queryByTestId('category-section')).not.toBeInTheDocument();
    });

    it('should maintain responsive layout across different content scenarios', async () => {
      // Test with single category
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: null,
          categoryArticles: {
            'Headliners': [
              { id: '1', title: 'Only News', excerpt: 'Single category content', category: 'Headliners', readingLevel: 'Elementary', readTime: 2, author: 'Author', date: '2024-01-01', publishDate: '2024-01-01' }
            ]
          }
        },
        errors: [],
        hasPartialFailure: false
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Headliners')).toBeInTheDocument();
      });

      // Should show single category properly
      expect(screen.getByText('Only News')).toBeInTheDocument();
      
      // Should not show featured article section
      expect(screen.queryByTestId('feature-article')).not.toBeInTheDocument();
      
      // Should maintain proper layout structure
      const mainLayout = screen.getByTestId('main-layout');
      expect(mainLayout).toHaveAttribute('data-full-width', 'true');
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle network errors with graceful fallback', async () => {
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockRejectedValue(
        new Error('fetch failed')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Connection Problem')).toBeInTheDocument();
      });

      // Should show network-specific error message
      expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
      expect(screen.getByText('📡')).toBeInTheDocument();
      
      // Should have recovery options
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
    });

    it('should handle timeout errors with appropriate messaging', async () => {
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockRejectedValue(
        new Error('timeout')
      );

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Request Timed Out')).toBeInTheDocument();
      });

      // Should show timeout-specific error message
      expect(screen.getByText(/took too long to complete/)).toBeInTheDocument();
      expect(screen.getByText('⏱️')).toBeInTheDocument();
      
      // Should provide helpful tip
      expect(screen.getByText(/server might be busy/)).toBeInTheDocument();
    });
  });
});