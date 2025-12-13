/**
 * Example Component: Article List with Convex
 *
 * This component demonstrates how to use Convex reactive queries
 * to display a list of articles that automatically updates in real-time
 */

import React, { useState } from 'react';
import { usePublishedArticles, useIncrementViewCount } from '@/hooks/convex/useArticles';
import { useActiveCategories } from '@/hooks/convex/useCategories';
import { Id } from '../../../convex/_generated/dataModel';

export function ArticleListExample() {
  const [selectedCategory, setSelectedCategory] = useState<Id<"categories"> | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const pageLimit = 10;

  // Fetch categories - automatically updates when categories change
  const categories = useActiveCategories();

  // Fetch published articles - automatically updates when articles change
  const articlesData = usePublishedArticles(selectedCategory, currentPage, pageLimit);

  // Mutation hook for incrementing view count
  const incrementViewCount = useIncrementViewCount();

  // Handle article click
  const handleArticleClick = async (articleId: Id<"articles">) => {
    try {
      await incrementViewCount({ id: articleId });
      // Navigate to article detail page
      console.log('Navigating to article:', articleId);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  // Loading state
  if (articlesData === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state (if query fails)
  if (articlesData === null) {
    return (
      <div className="text-center text-red-500 p-4">
        Failed to load articles. Please try again.
      </div>
    );
  }

  const { articles, count } = articlesData;
  const totalPages = Math.ceil(count / pageLimit);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Category Filter */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Filter by Category</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`px-4 py-2 rounded-lg ${
              !selectedCategory
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            All Categories
          </button>
          {categories?.map((category) => (
            <button
              key={category._id}
              onClick={() => setSelectedCategory(category._id)}
              className={`px-4 py-2 rounded-lg ${
                selectedCategory === category._id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Articles List */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Articles ({count} total)
        </h2>

        {articles.length === 0 ? (
          <div className="text-center text-gray-500 p-8">
            No articles found.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <div
                key={article._id}
                onClick={() => handleArticleClick(article._id)}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              >
                {article.featured_image_url && (
                  <img
                    src={article.featured_image_url}
                    alt={article.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{article.view_count || 0} views</span>
                    <span>{article.comment_count || 0} comments</span>
                    <span>{article.like_count || 0} likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Key Benefits of This Approach:
 *
 * 1. AUTOMATIC REAL-TIME UPDATES
 *    - No manual subscription management
 *    - Articles list updates automatically when data changes
 *    - Categories update automatically
 *
 * 2. BUILT-IN LOADING STATES
 *    - undefined = loading
 *    - null = error
 *    - data = success
 *
 * 3. OPTIMISTIC UPDATES
 *    - UI updates immediately when incrementing view count
 *    - Rollback if operation fails
 *
 * 4. SIMPLIFIED CODE
 *    - No useEffect hooks needed
 *    - No manual state management
 *    - No cleanup required
 *
 * 5. TYPE SAFETY
 *    - Full TypeScript support
 *    - Generated types from Convex schema
 */
