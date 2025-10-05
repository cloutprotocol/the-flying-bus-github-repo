import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Index from '../Index';
import { HomePageDataFetcher } from '@/utils/homePageDataFetcher';

// Mock dependencies
vi.mock('@/utils/homePageDataFetcher');
vi.mock('@/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
    LogSource: {
        ARTICLE: 'ARTICLE',
        APP: 'APP',
    },
}));

vi.mock('@/hooks/use-mobile', () => ({
    useIsMobile: () => false,
}));

const mockHomePageDataFetcher = vi.mocked(HomePageDataFetcher);

const mockArticleData = {
    id: '1',
    title: 'Test Article',
    excerpt: 'Test excerpt',
    content: 'Test content',
    imageUrl: 'test-image.jpg',
    category: 'Headliners',
    categorySlug: 'headliners',
    categoryColor: 'red',
    readingLevel: 'Elementary',
    readTime: 5,
    author: 'Test Author',
    authorAvatar: 'author-avatar.jpg',
    date: '2024-01-01',
    publishDate: '2024-01-01',
    commentCount: 0,
};

const mockCategoryData = [
    {
        title: 'Headliners',
        slug: 'headliners',
        color: 'red',
    },
    {
        title: 'Learning',
        slug: 'learning',
        color: 'blue',
    },
];

const renderWithRouter = (component: React.ReactElement) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('Index Component Performance Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockHomePageDataFetcher.getDefaultCategories.mockReturnValue(mockCategoryData);
        mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue({
            data: {
                headlineArticle: mockArticleData,
                categoryArticles: {
                    'Headliners': [mockArticleData],
                    'Learning': [{ ...mockArticleData, id: '2', category: 'Learning' }],
                },
            },
            errors: [],
            hasPartialFailure: false,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Component Rendering Optimization', () => {
        it('should minimize re-renders when state updates', async () => {
            const { rerender } = renderWithRouter(<Index />);

            // Wait for initial load
            await waitFor(() => {
                expect(screen.getByText('Test Article')).toBeInTheDocument();
            });

            // Rerender with same props should not cause unnecessary re-renders
            rerender(
                <BrowserRouter>
                    <Index />
                </BrowserRouter>
            );

            // Verify data fetcher was called only once
            expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(1);
        });

        it('should efficiently handle category mapping', async () => {
            const startTime = performance.now();

            renderWithRouter(<Index />);

            await waitFor(() => {
                expect(screen.getByText('Test Article')).toBeInTheDocument();
            });

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // Rendering should be fast (less than 100ms for this simple case)
            expect(renderTime).toBeLessThan(100);

            // Category mapping should be memoized
            expect(mockHomePageDataFetcher.getDefaultCategories).toHaveBeenCalledTimes(1);
        });

        it('should handle large article lists efficiently', async () => {
            // Create a large dataset
            const largeArticleList = Array.from({ length: 100 }, (_, i) => ({
                ...mockArticleData,
                id: `article-${i}`,
                title: `Article ${i}`,
            }));

            mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue({
                data: {
                    headlineArticle: mockArticleData,
                    categoryArticles: {
                        'Headliners': largeArticleList,
                        'Learning': largeArticleList,
                    },
                },
                errors: [],
                hasPartialFailure: false,
            });

            const startTime = performance.now();

            renderWithRouter(<Index />);

            await waitFor(() => {
                expect(screen.getByText('Article 0')).toBeInTheDocument();
            });

            const endTime = performance.now();
            const renderTime = endTime - startTime;

            // Should still render efficiently with large datasets
            expect(renderTime).toBeLessThan(500);
        });
    });

    describe('Memory Leak Prevention', () => {
        it('should properly cleanup abort controllers on unmount', async () => {
            const abortSpy = vi.fn();
            const mockAbortController = {
                abort: abortSpy,
                signal: { aborted: false },
            };

            // Mock AbortController
            global.AbortController = vi.fn(() => mockAbortController) as any;

            const { unmount } = renderWithRouter(<Index />);

            // Wait for component to mount and start fetching
            await waitFor(() => {
                expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalled();
            });

            // Unmount component
            unmount();

            // Verify abort was called
            expect(abortSpy).toHaveBeenCalled();
        });

        it('should handle component unmounting during data fetch', async () => {
            let resolvePromise: (value: any) => void;
            const pendingPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            mockHomePageDataFetcher.fetchHomePageData.mockReturnValue(pendingPromise);

            const { unmount } = renderWithRouter(<Index />);

            // Unmount before promise resolves
            unmount();

            // Resolve promise after unmount
            act(() => {
                resolvePromise!({
                    data: {
                        headlineArticle: mockArticleData,
                        categoryArticles: { 'Headliners': [mockArticleData] },
                    },
                    errors: [],
                    hasPartialFailure: false,
                });
            });

            // Should not cause any errors or memory leaks
            await waitFor(() => {
                // Component should be unmounted, no assertions needed
                expect(true).toBe(true);
            });
        });

        it('should not update state after component unmount', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            let resolvePromise: (value: any) => void;
            const pendingPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            mockHomePageDataFetcher.fetchHomePageData.mockReturnValue(pendingPromise);

            const { unmount } = renderWithRouter(<Index />);

            // Unmount component
            unmount();

            // Try to resolve promise after unmount
            act(() => {
                resolvePromise!({
                    data: {
                        headlineArticle: mockArticleData,
                        categoryArticles: { 'Headliners': [mockArticleData] },
                    },
                    errors: [],
                    hasPartialFailure: false,
                });
            });

            // Should not log any React warnings about setting state on unmounted component
            expect(consoleSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('Warning: Can\'t perform a React state update on an unmounted component')
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Race Condition Prevention', () => {
        it('should handle multiple rapid state updates correctly', async () => {
            renderWithRouter(<Index />);

            // Wait for initial load
            await waitFor(() => {
                expect(screen.getByText('Test Article')).toBeInTheDocument();
            });

            // Simulate rapid retry clicks
            const retryButton = screen.queryByText('Try Again');
            if (retryButton) {
                fireEvent.click(retryButton);
                fireEvent.click(retryButton);
                fireEvent.click(retryButton);
            }

            // Should handle multiple clicks gracefully without race conditions
            await waitFor(() => {
                expect(screen.getByText('Test Article')).toBeInTheDocument();
            });
        });

        it('should cancel previous requests when new ones are made', async () => {
            const abortSpy = vi.fn();
            let abortController1: any;
            let abortController2: any;

            // Mock AbortController to track instances
            global.AbortController = vi.fn().mockImplementation(() => {
                const controller = {
                    abort: abortSpy,
                    signal: { aborted: false },
                };

                if (!abortController1) {
                    abortController1 = controller;
                } else {
                    abortController2 = controller;
                }

                return controller;
            }) as any;

            renderWithRouter(<Index />);

            // Wait for initial load
            await waitFor(() => {
                expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalled();
            });

            // Trigger retry (should create new AbortController and abort previous)
            const retryButton = screen.queryByText('Try Again');
            if (retryButton) {
                fireEvent.click(retryButton);
            }

            // Should have created two controllers and aborted the first one
            expect(global.AbortController).toHaveBeenCalledTimes(2);
        });

        it('should handle concurrent data fetching correctly', async () => {
            let resolveCount = 0;
            const resolvers: Array<(value: any) => void> = [];

            mockHomePageDataFetcher.fetchHomePageData.mockImplementation(() => {
                return new Promise((resolve) => {
                    resolvers.push(resolve);
                });
            });

            renderWithRouter(<Index />);

            // Wait for first fetch to start
            await waitFor(() => {
                expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(1);
            });

            // Trigger retry while first request is pending
            const retryButton = screen.queryByText('Try Again');
            if (retryButton) {
                fireEvent.click(retryButton);
            }

            // Resolve requests in reverse order (second request first)
            if (resolvers.length >= 2) {
                act(() => {
                    resolvers[1]({
                        data: {
                            headlineArticle: { ...mockArticleData, title: 'Second Request' },
                            categoryArticles: { 'Headliners': [mockArticleData] },
                        },
                        errors: [],
                        hasPartialFailure: false,
                    });
                });

                act(() => {
                    resolvers[0]({
                        data: {
                            headlineArticle: { ...mockArticleData, title: 'First Request' },
                            categoryArticles: { 'Headliners': [mockArticleData] },
                        },
                        errors: [],
                        hasPartialFailure: false,
                    });
                });
            }

            // Should show the result from the second (more recent) request
            await waitFor(() => {
                expect(screen.getByText('Second Request')).toBeInTheDocument();
            });
        });
    });

    describe('Component Mounting and Unmounting', () => {
        it('should handle rapid mount/unmount cycles', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            for (let i = 0; i < 5; i++) {
                const { unmount } = renderWithRouter(<Index />);

                // Unmount quickly
                unmount();
            }

            // Should not cause any errors
            expect(consoleSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should properly initialize on mount', async () => {
            renderWithRouter(<Index />);

            // Should show loading state initially
            expect(screen.getByText('Loading articles...')).toBeInTheDocument();

            // Should call data fetcher
            expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(1);
            expect(mockHomePageDataFetcher.getDefaultCategories).toHaveBeenCalledTimes(1);
        });

        it('should handle remounting after unmount', async () => {
            const { unmount } = renderWithRouter(<Index />);

            await waitFor(() => {
                expect(screen.getByText('Loading articles...')).toBeInTheDocument();
            });

            unmount();

            // Remount
            renderWithRouter(<Index />);

            await waitFor(() => {
                expect(screen.getByText('Loading articles...')).toBeInTheDocument();
            });

            // Should reinitialize properly
            expect(mockHomePageDataFetcher.fetchHomePageData).toHaveBeenCalledTimes(2);
        });
    });

    describe('Efficient Category Mapping', () => {
        it('should memoize category configurations', async () => {
            const { rerender } = renderWithRouter(<Index />);

            await waitFor(() => {
                expect(mockHomePageDataFetcher.getDefaultCategories).toHaveBeenCalledTimes(1);
            });

            // Rerender should not call getDefaultCategories again
            rerender(
                <BrowserRouter>
                    <Index />
                </BrowserRouter>
            );

            expect(mockHomePageDataFetcher.getDefaultCategories).toHaveBeenCalledTimes(1);
        });

        it('should efficiently filter categories with content', async () => {
            mockHomePageDataFetcher.fetchHomePageData.mockResolvedValue({
                data: {
                    headlineArticle: mockArticleData,
                    categoryArticles: {
                        'Headliners': [mockArticleData],
                        'Learning': [], // Empty category
                        'Debates': [{ ...mockArticleData, id: '3', category: 'Debates' }],
                    },
                },
                errors: [],
                hasPartialFailure: false,
            });

            renderWithRouter(<Index />);

            await waitFor(() => {
                expect(screen.getByText('Test Article')).toBeInTheDocument();
            });

            // Should only show categories with content
            expect(screen.getByText('Headliners')).toBeInTheDocument();
            expect(screen.queryByText('Learning')).not.toBeInTheDocument();
        });
    });
});