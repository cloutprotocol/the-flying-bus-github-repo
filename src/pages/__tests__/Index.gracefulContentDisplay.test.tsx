import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Index from '../Index';
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

// Mock FeatureArticle
vi.mock('@/components/Articles/FeatureArticle', () => ({
  default: (props: any) => (
    <div data-testid="feature-article" data-article-id={props.id}>
      <h1>{props.title}</h1>
      <p>{props.excerpt}</p>
    </div>
  ),
}));

// Mock CategorySection
vi.mock('@/components/Articles/CategorySection', () => ({
  default: ({ title, articles }: { title: string; articles: any[] }) => (
    <div data-testid="category-section" data-category={title}>
      <h2>{title}</h2>
      <div data-testid="article-count">{articles.length} articles</div>
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

const mockHeadlineArticle = {
  id: '1',
  title: 'Breaking News',
  excerpt: 'Important news story',
  category: 'Headliners',
  readingLevel: 'Elementary',
  readTime: 3,
  author: 'Test Author',
  date: '2024-01-01',
  publishDate: '2024-01-01',
  imageUrl: 'https://example.com/image.jpg'
};

const mockCategoryArticles = {
  'Headliners': [
    { id: '2', title: 'News 1', excerpt: 'News excerpt', category: 'Headliners', readingLevel: 'Elementary', readTime: 2, author: 'Author 1', date: '2024-01-01', publishDate: '2024-01-01' },
    { id: '3', title: 'News 2', excerpt: 'News excerpt', category: 'Headliners', readingLevel: 'Elementary', readTime: 2, author: 'Author 2', date: '2024-01-01', publishDate: '2024-01-01' }
  ],
  'Debates': [
    { id: '4', title: 'Debate 1', excerpt: 'Debate excerpt', category: 'Debates', readingLevel: 'Elementary', readTime: 4, author: 'Author 3', date: '2024-01-01', publishDate: '2024-01-01' }
  ]
};

describe('Index Component - Graceful Content Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the getDefaultCategories method
    vi.mocked(HomePageDataFetcher.HomePageDataFetcher.getDefaultCategories).mockReturnValue(mockCategories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('No Featured Article Handling', () => {
    it('should skip featured section gracefully when no featured article exists', async () => {
      // Mock successful fetch with no headline article
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: null,
          categoryArticles: mockCategoryArticles
        },
        errors: [],
        hasPartialFailure: false
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.queryByTestId('feature-article')).not.toBeInTheDocument();
      });

      // Should still show category sections
      expect(screen.getAllByTestId('category-section')).toHaveLength(2);
    });
  });

  describe('Empty Category Sections', () => {
    it('should not display category sections that have no articles', async () => {
      // Mock successful fetch with only some categories having content
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: mockHeadlineArticle,
          categoryArticles: {
            'Headliners': mockCategoryArticles['Headliners'],
            'Debates': [], // Empty category
            'Learning': [], // Empty category
            'Spice It Up': [] // Empty category
          }
        },
        errors: [],
        hasPartialFailure: false
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByTestId('feature-article')).toBeInTheDocument();
      });

      // Should only show Headliners category (has content)
      expect(screen.getByTestId('category-section')).toBeInTheDocument();
      expect(screen.getByText('Headliners')).toBeInTheDocument();
      
      // Should not show empty categories
      expect(screen.queryByText('Debates')).not.toBeInTheDocument();
      expect(screen.queryByText('Learning')).not.toBeInTheDocument();
      expect(screen.queryByText('Spice It Up')).not.toBeInTheDocument();
    });
  });

  describe('No Content Available', () => {
    it('should show "no content available" message when all categories are empty', async () => {
      // Mock successful fetch with no content at all
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: null,
          categoryArticles: {
            'Headliners': [],
            'Debates': [],
            'Learning': [],
            'Spice It Up': []
          }
        },
        errors: [],
        hasPartialFailure: false
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('No Published Content Yet')).toBeInTheDocument();
      });

      expect(screen.getByText(/We're working on creating amazing content for you/)).toBeInTheDocument();
      expect(screen.getByText('Check for New Content')).toBeInTheDocument();
      
      // Should not show any category sections or featured article
      expect(screen.queryByTestId('feature-article')).not.toBeInTheDocument();
      expect(screen.queryByTestId('category-section')).not.toBeInTheDocument();
    });

    it('should show helpful content preview when no content is available', async () => {
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
        expect(screen.getByText('What to expect:')).toBeInTheDocument();
      });

      // Should show preview of different categories
      expect(screen.getByText(/Breaking news and important stories in/)).toBeInTheDocument();
      expect(screen.getByText(/Thought-provoking discussions in/)).toBeInTheDocument();
      expect(screen.getByText(/Educational content in/)).toBeInTheDocument();
    });
  });

  describe('Partial Content Scenarios', () => {
    it('should show fallback message when only featured article exists', async () => {
      // Mock successful fetch with only headline article
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: mockHeadlineArticle,
          categoryArticles: {
            'Headliners': [],
            'Debates': [],
            'Learning': [],
            'Spice It Up': []
          }
        },
        errors: [],
        hasPartialFailure: false
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByTestId('feature-article')).toBeInTheDocument();
      });

      // Should show the featured article
      expect(screen.getByText('Breaking News')).toBeInTheDocument();
      
      // Should show fallback message for categories
      expect(screen.getByText('More Content Coming Soon')).toBeInTheDocument();
      expect(screen.getByText(/We have a featured story for you above/)).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('should organize content properly when multiple categories have articles', async () => {
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: mockHeadlineArticle,
          categoryArticles: mockCategoryArticles
        },
        errors: [],
        hasPartialFailure: false
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByTestId('feature-article')).toBeInTheDocument();
      });

      // Should show featured article
      expect(screen.getByText('Breaking News')).toBeInTheDocument();
      
      // Should show categories with content
      expect(screen.getByText('Headliners')).toBeInTheDocument();
      expect(screen.getByText('Debates')).toBeInTheDocument();
      
      // Should not show empty categories
      expect(screen.queryByText('Learning')).not.toBeInTheDocument();
      expect(screen.queryByText('Spice It Up')).not.toBeInTheDocument();
    });

    it('should handle single category with content properly', async () => {
      vi.mocked(HomePageDataFetcher.HomePageDataFetcher.fetchHomePageData).mockResolvedValue({
        data: {
          headlineArticle: null,
          categoryArticles: {
            'Headliners': mockCategoryArticles['Headliners'],
            'Debates': [],
            'Learning': [],
            'Spice It Up': []
          }
        },
        errors: [],
        hasPartialFailure: false
      });

      renderWithRouter(<Index />);

      await waitFor(() => {
        expect(screen.getByText('Headliners')).toBeInTheDocument();
      });

      // Should show only the category with content
      expect(screen.getByTestId('category-section')).toBeInTheDocument();
      expect(screen.getByText('2 articles')).toBeInTheDocument();
      
      // Should not show featured article section
      expect(screen.queryByTestId('feature-article')).not.toBeInTheDocument();
    });
  });
});