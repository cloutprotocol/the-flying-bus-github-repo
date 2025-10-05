import React from 'react';
import { useArticlesIndependent, useCategoriesIndependent } from '@/hooks/useDataLoadingIndependence';

/**
 * Example component demonstrating the Data Loading Independence Layer
 * 
 * This component shows how to:
 * 1. Load articles and categories independently of auth state
 * 2. Handle loading states gracefully
 * 3. Display execution mode for debugging
 * 4. Provide manual refresh functionality
 */
export function DataLoadingIndependenceExample() {
  // Load articles with independence layer
  const { 
    data: articles, 
    isLoading: articlesLoading, 
    error: articlesError,
    executionMode: articlesMode,
    fromCache: articlesFromCache,
    refetch: refetchArticles 
  } = useArticlesIndependent();

  // Load categories with independence layer
  const { 
    data: categories, 
    isLoading: categoriesLoading, 
    error: categoriesError,
    executionMode: categoriesMode,
    refetch: refetchCategories 
  } = useCategoriesIndependent();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Data Loading Independence Example</h1>
      
      {/* Debug Information */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Articles:</strong>
            <ul className="ml-4">
              <li>Mode: {articlesMode}</li>
              <li>From Cache: {articlesFromCache ? 'Yes' : 'No'}</li>
              <li>Loading: {articlesLoading ? 'Yes' : 'No'}</li>
              <li>Count: {articles?.length || 0}</li>
            </ul>
          </div>
          <div>
            <strong>Categories:</strong>
            <ul className="ml-4">
              <li>Mode: {categoriesMode}</li>
              <li>Loading: {categoriesLoading ? 'Yes' : 'No'}</li>
              <li>Count: {categories?.length || 0}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Refresh Controls */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={refetchArticles}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={articlesLoading}
        >
          {articlesLoading ? 'Loading...' : 'Refresh Articles'}
        </button>
        <button 
          onClick={refetchCategories}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={categoriesLoading}
        >
          {categoriesLoading ? 'Loading...' : 'Refresh Categories'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Articles Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Articles</h2>
          
          {articlesError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error loading articles:</strong> {articlesError.message}
            </div>
          )}
          
          {articlesLoading && !articles && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}
          
          {articles && articles.length > 0 && (
            <div className="space-y-4">
              {articles.slice(0, 5).map((article: any) => (
                <div key={article.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Status: {article.status} | Created: {new Date(article.created_at).toLocaleDateString()}
                  </p>
                  {article.excerpt && (
                    <p className="text-gray-700">{article.excerpt}</p>
                  )}
                </div>
              ))}
              {articles.length > 5 && (
                <p className="text-gray-500 text-sm">
                  ... and {articles.length - 5} more articles
                </p>
              )}
            </div>
          )}
          
          {articles && articles.length === 0 && !articlesLoading && (
            <div className="text-gray-500 text-center py-8">
              No articles found
            </div>
          )}
        </div>

        {/* Categories Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Categories</h2>
          
          {categoriesError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error loading categories:</strong> {categoriesError.message}
            </div>
          )}
          
          {categoriesLoading && !categories && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-8 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          )}
          
          {categories && categories.length > 0 && (
            <div className="space-y-2">
              {categories.map((category: any) => (
                <div 
                  key={category.id} 
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center">
                    {category.color && (
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      ></div>
                    )}
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{category.slug}</span>
                </div>
              ))}
            </div>
          )}
          
          {categories && categories.length === 0 && !categoriesLoading && (
            <div className="text-gray-500 text-center py-8">
              No categories found
            </div>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">How This Works</h3>
        <ul className="text-sm space-y-1">
          <li>• Data loads independently of authentication state</li>
          <li>• Automatic fallback from authenticated → anonymous → cached data</li>
          <li>• Auth state changes are buffered to prevent interference</li>
          <li>• Queries are cached for improved performance</li>
          <li>• Manual refresh is available at any time</li>
          <li>• Execution mode shows how data was loaded (authenticated/anonymous/fallback)</li>
        </ul>
      </div>
    </div>
  );
}

export default DataLoadingIndependenceExample;