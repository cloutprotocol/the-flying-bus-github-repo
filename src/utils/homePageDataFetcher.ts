import { ArticleProps } from '@/components/Articles/ArticleCard';
import { getHeadlineArticle, getCategoryArticles } from '@/data/articles';
import { logger, LogSource } from '@/utils/logger';
import { queryExecutor } from '@/services/queryExecutor';
import { dataLoadingManager } from '@/services/dataLoadingManager';
import { authStateBuffer } from '@/services/authStateBuffer';

export interface CategoryConfig {
  title: string;
  slug: string;
  color: string;
}

export interface HomePageData {
  headlineArticle: ArticleProps | null;
  categoryArticles: Record<string, ArticleProps[]>;
}

export interface FetchResult {
  data: HomePageData;
  errors: string[];
  hasPartialFailure: boolean;
}

/**
 * Simplified data fetching utility for the home page
 * Fetches both headline and category articles using Promise.allSettled
 * Implements proper error handling and graceful degradation for partial failures
 * Supports abort controller for request cancellation
 */
export class HomePageDataFetcher {
  private static readonly DEFAULT_CATEGORIES: CategoryConfig[] = [
    { title: 'Headliners', slug: 'headliners', color: 'red' },
    { title: 'Debates', slug: 'debates', color: 'orange' },
    { title: 'Spice It Up', slug: 'spice-it-up', color: 'yellow' },
    { title: 'Storyboard', slug: 'storyboard', color: 'blue' },
    { title: 'Neighborhood', slug: 'neighborhood', color: 'green' },
    { title: 'Learning', slug: 'learning', color: 'purple' },
    { title: 'School News', slug: 'school', color: 'pink' },
  ];

  /**
   * Fetches all home page data with graceful degradation and auth independence
   * @param abortSignal - Optional abort signal for request cancellation
   * @param categories - Optional custom categories (defaults to standard categories)
   * @returns Promise with data, errors, and partial failure status
   */
  static async fetchHomePageData(
    abortSignal?: AbortSignal,
    categories: CategoryConfig[] = HomePageDataFetcher.DEFAULT_CATEGORIES
  ): Promise<FetchResult> {
    const startTime = Date.now();
    
    logger.info(LogSource.ARTICLE, 'Starting home page data fetch with auth independence', {
      categoriesCount: categories.length,
      timestamp: new Date().toISOString(),
      authBufferState: authStateBuffer.getBufferState()
    });

    // Check if request was aborted before starting
    if (abortSignal?.aborted) {
      throw new Error('Request was aborted before starting');
    }

    try {
      // Use independent data loading for featured articles
      const headlinePromise = HomePageDataFetcher.fetchHeadlineIndependent(abortSignal);
      
      // Use independent data loading for category articles
      const categoryPromises = categories.map(category => 
        HomePageDataFetcher.fetchCategoryIndependent(category, abortSignal)
      );

      // Execute all queries concurrently with auth protection
      const allPromises = [headlinePromise, ...categoryPromises];
      const results = await Promise.allSettled(allPromises);
      
      // Check if request was aborted during fetch
      if (abortSignal?.aborted) {
        throw new Error('Request was aborted during fetch');
      }

      // Process results
      const headlineResult = results[0];
      const categoryResults = results.slice(1);
      
      // Extract headline article
      const headlineArticle = headlineResult.status === 'fulfilled' 
        ? headlineResult.value 
        : null;
      
      // Extract category articles
      const categoryArticles: Record<string, ArticleProps[]> = {};
      const errors: string[] = [];
      
      categoryResults.forEach((result, index) => {
        const category = categories[index];
        
        if (result.status === 'fulfilled') {
          categoryArticles[category.title] = result.value;
        } else {
          // Only add empty array if we want to show the category section
          // For complete failures, we might want to omit the category entirely
          const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
          
          // Don't add empty categories for complete failures to avoid showing empty sections
          if (!errorMessage.includes('complete failure')) {
            categoryArticles[category.title] = [];
          }
          
          errors.push(`Failed to load ${category.title}: ${errorMessage}`);
          
          logger.warn(LogSource.ARTICLE, `Category ${category.title} fetch failed`, {
            error: result.reason,
            category: category.title,
            executionMode: 'independent'
          });
        }
      });

      // Add headline error if it failed
      if (headlineResult.status === 'rejected') {
        errors.push(`Failed to load featured article: ${headlineResult.reason}`);
        logger.warn(LogSource.ARTICLE, 'Headline article fetch failed', {
          error: headlineResult.reason,
          executionMode: 'independent'
        });
      }

      const totalDuration = Date.now() - startTime;
      const totalArticles = Object.values(categoryArticles).reduce((sum, articles) => sum + articles.length, 0);
      const hasPartialFailure = errors.length > 0;

      logger.info(LogSource.ARTICLE, 'Home page data fetch completed with auth independence', {
        totalDuration,
        totalArticles,
        hasHeadline: !!headlineArticle,
        categoriesLoaded: Object.keys(categoryArticles).length,
        errorsCount: errors.length,
        hasPartialFailure,
        dataLoadingState: dataLoadingManager.getState()
      });

      return {
        data: {
          headlineArticle,
          categoryArticles
        },
        errors,
        hasPartialFailure
      };

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      logger.error(LogSource.ARTICLE, 'Home page data fetch failed completely', {
        error,
        duration: totalDuration,
        dataLoadingState: dataLoadingManager.getState()
      });

      // Return empty data structure on complete failure
      return {
        data: {
          headlineArticle: null,
          categoryArticles: {}
        },
        errors: [error instanceof Error ? error.message : String(error)],
        hasPartialFailure: false // Complete failure, not partial
      };
    }
  }

  /**
   * Fetches headline article using independent data loading
   */
  private static async fetchHeadlineIndependent(
    abortSignal?: AbortSignal
  ): Promise<ArticleProps | null> {
    try {
      // Check for abort before starting
      if (abortSignal?.aborted) {
        throw new Error('Headline fetch aborted before starting');
      }

      // Use queryExecutor for auth-independent featured articles
      const result = await queryExecutor.getFeaturedArticles();
      
      // Check for abort after query
      if (abortSignal?.aborted) {
        throw new Error('Headline fetch aborted during execution');
      }

      if (result.error || !result.data || result.data.length === 0) {
        logger.warn(LogSource.ARTICLE, 'Featured articles query failed, trying fallback', {
          error: result.error,
          executionMode: result.executionMode
        });
        
        // Fallback to original method if independent loading fails
        return await getHeadlineArticle();
      }

      // Convert first featured article to ArticleProps format
      if (result.data && result.data.length > 0) {
        const article = result.data[0];
        return {
          id: article.id,
          title: article.title,
          excerpt: article.excerpt || '',
          imageUrl: article.cover_image,
          category: article.categories?.name || '',
          readingLevel: 'Intermediate',
          readTime: 5,
          author: article.profiles?.display_name || 'Unknown',
          date: new Date(article.published_at || article.created_at).toLocaleDateString(),
          publishDate: article.published_at ? new Date(article.published_at).toLocaleDateString() : null,
          commentCount: 0
        };
      }

      return null;
    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Independent headline fetch failed', { error });
      
      // Final fallback to original method
      try {
        return await getHeadlineArticle();
      } catch (fallbackError) {
        logger.error(LogSource.ARTICLE, 'Headline fallback also failed', { fallbackError });
        return null;
      }
    }
  }

  /**
   * Fetches category articles using independent data loading
   */
  private static async fetchCategoryIndependent(
    category: CategoryConfig,
    abortSignal?: AbortSignal
  ): Promise<ArticleProps[]> {
    try {
      // Check for abort before starting
      if (abortSignal?.aborted) {
        throw new Error(`${category.title} fetch aborted before starting`);
      }

      // First get the category ID, then fetch articles
      const categoryResult = await queryExecutor.executeQuery({
        table: 'categories',
        select: 'id, name',
        filters: { name: category.title },
        priority: 'high'
      });

      if (categoryResult.error || !categoryResult.data || categoryResult.data.length === 0) {
        logger.warn(LogSource.ARTICLE, `Category ${category.title} not found, trying fallback`);
        return await getCategoryArticles(category.title);
      }

      const categoryId = categoryResult.data[0].id;

      // Use queryExecutor for auth-independent articles by category
      const result = await queryExecutor.executeQuery({
        table: 'articles',
        select: `
          id, 
          title, 
          excerpt, 
          cover_image, 
          categories(id, name), 
          profiles!articles_author_id_fkey(id, display_name),
          created_at,
          published_at
        `,
        filters: {
          category_id: categoryId,
          status: 'published'
        },
        orderBy: { column: 'published_at', ascending: false },
        limit: 6,
        priority: 'high'
      });
      
      // Check for abort after query
      if (abortSignal?.aborted) {
        throw new Error(`${category.title} fetch aborted during execution`);
      }

      if (result.error || !result.data) {
        logger.warn(LogSource.ARTICLE, `Category ${category.title} query failed, trying fallback`, {
          error: result.error,
          executionMode: result.executionMode
        });
        
        // Fallback to original method if independent loading fails
        return await getCategoryArticles(category.title);
      }

      // Convert articles to ArticleProps format
      if (result.data && result.data.length > 0) {
        return result.data.map(article => ({
          id: article.id,
          title: article.title,
          excerpt: article.excerpt || '',
          imageUrl: article.cover_image,
          category: article.categories?.name || category.title,
          readingLevel: 'Intermediate',
          readTime: 5,
          author: article.profiles?.display_name || 'Unknown',
          date: new Date(article.published_at || article.created_at).toLocaleDateString(),
          publishDate: article.published_at ? new Date(article.published_at).toLocaleDateString() : null,
          commentCount: 0
        }));
      }

      return [];
    } catch (error) {
      logger.error(LogSource.ARTICLE, `Independent category ${category.title} fetch failed`, { error });
      
      // Final fallback to original method
      try {
        return await getCategoryArticles(category.title);
      } catch (fallbackError) {
        logger.error(LogSource.ARTICLE, `Category ${category.title} fallback also failed`, { fallbackError });
        return [];
      }
    }
  }

  /**
   * Legacy method - Fetches headline article with timeout and abort support
   * @deprecated Use fetchHeadlineIndependent instead
   */
  private static async fetchHeadlineWithTimeout(
    abortSignal?: AbortSignal
  ): Promise<ArticleProps | null> {
    return new Promise(async (resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error('Headline fetch timeout after 5 seconds'));
      }, 5000);

      // Set up abort handler
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new Error('Headline fetch aborted'));
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortHandler);
      }

      try {
        const result = await getHeadlineArticle();
        clearTimeout(timeoutId);
        
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortHandler);
        }
        
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortHandler);
        }
        
        reject(error);
      }
    });
  }

  /**
   * Legacy method - Fetches category articles with timeout and abort support
   * @deprecated Use fetchCategoryIndependent instead
   */
  private static async fetchCategoryWithTimeout(
    categoryName: string,
    abortSignal?: AbortSignal
  ): Promise<ArticleProps[]> {
    return new Promise(async (resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`${categoryName} fetch timeout after 5 seconds`));
      }, 5000);

      // Set up abort handler
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new Error(`${categoryName} fetch aborted`));
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', abortHandler);
      }

      try {
        const result = await getCategoryArticles(categoryName);
        clearTimeout(timeoutId);
        
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortHandler);
        }
        
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (abortSignal) {
          abortSignal.removeEventListener('abort', abortHandler);
        }
        
        reject(error);
      }
    });
  }

  /**
   * Preload critical home page data to improve performance
   */
  static async preloadCriticalData(): Promise<void> {
    try {
      logger.info(LogSource.ARTICLE, 'Starting critical data preload');
      
      // Preload featured articles and categories in parallel
      await Promise.allSettled([
        dataLoadingManager.preloadCriticalData(),
        queryExecutor.getFeaturedArticles(),
        queryExecutor.getCategories()
      ]);
      
      logger.info(LogSource.ARTICLE, 'Critical data preload completed');
    } catch (error) {
      logger.warn(LogSource.ARTICLE, 'Critical data preload failed', { error });
    }
  }

  /**
   * Fetch home page data with various auth states for testing
   */
  static async fetchWithAuthState(
    authState: 'logged_out' | 'logging_in' | 'logged_in',
    abortSignal?: AbortSignal
  ): Promise<FetchResult> {
    logger.info(LogSource.ARTICLE, `Testing home page data fetch with auth state: ${authState}`);
    
    // Simulate auth state buffer behavior
    if (authState === 'logging_in') {
      authStateBuffer.bufferStateChange({
        type: 'session_start',
        timestamp: Date.now()
      });
    }
    
    return this.fetchHomePageData(abortSignal);
  }

  /**
   * Get enhanced error information for debugging
   */
  static async getDebugInfo(): Promise<{
    dataLoadingState: any;
    authBufferState: any;
    executionStats: any;
  }> {
    return {
      dataLoadingState: dataLoadingManager.getState(),
      authBufferState: authStateBuffer.getBufferState(),
      executionStats: queryExecutor.getExecutionStats()
    };
  }

  /**
   * Get default category configuration
   */
  static getDefaultCategories(): CategoryConfig[] {
    return [...HomePageDataFetcher.DEFAULT_CATEGORIES];
  }
}