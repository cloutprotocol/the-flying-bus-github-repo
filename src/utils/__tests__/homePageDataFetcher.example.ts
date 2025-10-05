/**
 * Example usage of HomePageDataFetcher
 * This file demonstrates how to use the simplified data fetching utility
 */

import { HomePageDataFetcher } from '../homePageDataFetcher';

// Example 1: Basic usage
export async function basicUsageExample() {
  try {
    const result = await HomePageDataFetcher.fetchHomePageData();
    
    console.log('Headline article:', result.data.headlineArticle?.title || 'None');
    console.log('Categories with articles:');
    
    Object.entries(result.data.categoryArticles).forEach(([category, articles]) => {
      if (articles.length > 0) {
        console.log(`  ${category}: ${articles.length} articles`);
      }
    });
    
    if (result.hasPartialFailure) {
      console.log('Some data failed to load:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('Complete failure:', error);
    throw error;
  }
}

// Example 2: Usage with abort controller
export async function abortControllerExample() {
  const abortController = new AbortController();
  
  // Set up timeout
  const timeoutId = setTimeout(() => {
    console.log('Aborting request due to timeout');
    abortController.abort();
  }, 5000);
  
  try {
    const result = await HomePageDataFetcher.fetchHomePageData(abortController.signal);
    clearTimeout(timeoutId);
    
    console.log('Data fetched successfully');
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.message.includes('aborted')) {
      console.log('Request was aborted');
      return null;
    }
    
    throw error;
  }
}

// Example 3: Usage with custom categories
export async function customCategoriesExample() {
  const customCategories = [
    { title: 'Breaking News', slug: 'breaking', color: 'red' },
    { title: 'Sports', slug: 'sports', color: 'green' },
    { title: 'Technology', slug: 'tech', color: 'blue' }
  ];
  
  const result = await HomePageDataFetcher.fetchHomePageData(undefined, customCategories);
  
  console.log('Custom categories result:');
  Object.entries(result.data.categoryArticles).forEach(([category, articles]) => {
    console.log(`  ${category}: ${articles.length} articles`);
  });
  
  return result;
}

// Example 4: React component usage pattern
export function useHomePageData() {
  // This would be used in a React component like this:
  /*
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await HomePageDataFetcher.fetchHomePageData(abortController.signal);
        
        if (result.hasPartialFailure) {
          console.warn('Some data failed to load:', result.errors);
        }
        
        setData(result.data);
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    return () => {
      abortController.abort();
    };
  }, []);
  
  return { data, loading, error };
  */
}

// Example 5: Error handling patterns
export async function errorHandlingExample() {
  try {
    const result = await HomePageDataFetcher.fetchHomePageData();
    
    // Check for different types of issues
    if (!result.data.headlineArticle && Object.values(result.data.categoryArticles).every(articles => articles.length === 0)) {
      console.log('No content available');
      return { type: 'no-content', result };
    }
    
    if (result.hasPartialFailure) {
      console.log('Partial failure - some content loaded');
      return { type: 'partial-success', result };
    }
    
    console.log('All data loaded successfully');
    return { type: 'success', result };
    
  } catch (error) {
    console.error('Complete failure:', error);
    return { type: 'error', error };
  }
}