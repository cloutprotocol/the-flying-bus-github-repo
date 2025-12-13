import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export type QueryExecutionMode = 'authenticated' | 'anonymous' | 'fallback';

export interface DataLoadingState {
  isIndependent: boolean;
  authInterference: boolean;
  fallbackMode: boolean;
  queryExecutionMode: QueryExecutionMode;
}

export interface QueryOptions {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  requireAuth?: boolean;
}

export interface QueryResult<T = any> {
  data: T[] | null;
  error: any;
  executionMode: QueryExecutionMode;
  fromCache?: boolean;
}

class DataLoadingManager {
  private state: DataLoadingState = {
    isIndependent: true,
    authInterference: false,
    fallbackMode: false,
    queryExecutionMode: 'authenticated'
  };



  /**
   * Execute a query with simple fallback mechanisms
   */
  async executeQuery<T = any>(options: QueryOptions): Promise<QueryResult<T>> {
    // Try authenticated query first
    try {
      const result = await this.executeAuthenticatedQuery<T>(options);
      if (result.data !== null || !result.error) {
        return result;
      }
    } catch (error) {
      // Silently continue to fallback
    }

    // If authenticated query fails and auth is not required, try anonymous
    if (!options.requireAuth) {
      try {
        const result = await this.executeAnonymousQuery<T>(options);
        if (result.data !== null || !result.error) {
          return result;
        }
      } catch (error) {
        // Silently continue to final fallback
      }
    }

    return {
      data: null,
      error: new Error('Query failed'),
      executionMode: 'fallback'
    };
  }

  /**
   * Execute query with authenticated session
   */
  private async executeAuthenticatedQuery<T>(options: QueryOptions): Promise<QueryResult<T>> {
    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL!;
      const convex = new ConvexHttpClient(convexUrl);

      if (options.table === 'articles') {
        const categoryId = options.filters?.category_id as string | undefined;
        const featured = options.filters?.featured as boolean | undefined;
        const result = await convex.query(api.articles.getPublished, {
          categoryId: categoryId ? (categoryId as Id<'categories'>) : undefined,
          page: 1,
          limit: options.limit ?? 10,
          sortBy: options.orderBy?.column === 'published_at' && options.orderBy?.ascending === true ? 'oldest' : 'newest'
        });

        let articles = result.articles || [];
        if (featured !== undefined) {
          articles = articles.filter((a: any) => !!a.featured === featured);
        }

        // Map to legacy field names expected by callers
        const mapped = articles.map((a: any) => ({
          id: a._id,
          title: a.title,
          excerpt: a.excerpt,
          cover_image: a.featured_image_url,
          categories: a.category ? { id: a.category._id, name: a.category.name, slug: a.category.slug, color: a.category.color } : null,
          profiles: a.author ? { id: a.author._id, display_name: a.author.display_name } : null,
          created_at: a.created_at,
          published_at: a.published_at,
          article_type: a.article_type,
          status: a.status,
          featured: a.featured,
        }));

        return { data: mapped as unknown as T[], error: null, executionMode: 'authenticated' };
      }

      if (options.table === 'categories') {
        const categories = await convex.query(api.categories.getAll, {});
        const mapped = categories.map((c: any) => ({
          id: c._id,
          name: c.name,
          slug: c.slug,
          color: c.color,
        }));
        return { data: mapped as unknown as T[], error: null, executionMode: 'authenticated' };
      }

      return { data: [] as unknown as T[], error: null, executionMode: 'authenticated' };
    } catch (error) {
      return { data: null as any, error, executionMode: 'authenticated' };
    }
  }

  /**
   * Execute query without authentication (for public content)
   */
  private async executeAnonymousQuery<T>(options: QueryOptions): Promise<QueryResult<T>> {
    // Anonymous and authenticated behave the same for Convex public content
    return this.executeAuthenticatedQuery<T>({ ...options, requireAuth: false });
  }



  /**
   * Set auth interference state
   */
  setAuthInterference(hasInterference: boolean): void {
    this.state.authInterference = hasInterference;
    if (hasInterference) {
      this.state.queryExecutionMode = 'anonymous';
    }
  }

  /**
   * Get current data loading state
   */
  getState(): DataLoadingState {
    return { ...this.state };
  }

  /**
   * Clear query cache - no-op since we removed caching
   */
  clearCache(): void {
    // No-op - caching removed
  }

  /**
   * Preload critical data - simplified
   */
  async preloadCriticalData(): Promise<void> {
    try {
      await Promise.allSettled([
        this.executeQuery({ table: 'articles', limit: 10 }),
        this.executeQuery({ table: 'categories' })
      ]);
    } catch {
      // No-op
    }
  }
}

export const dataLoadingManager = new DataLoadingManager();
