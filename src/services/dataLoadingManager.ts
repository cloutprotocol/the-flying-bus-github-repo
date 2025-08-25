import { supabase } from '@/integrations/supabase/client';

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
    let query = supabase.from(options.table);

    if (options.select) {
      query = query.select(options.select);
    }

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    return {
      data: data as T[],
      error,
      executionMode: 'authenticated'
    };
  }

  /**
   * Execute query without authentication (for public content)
   */
  private async executeAnonymousQuery<T>(options: QueryOptions): Promise<QueryResult<T>> {
    // Create a temporary client without auth headers
    const anonClient = supabase;
    
    let query = anonClient.from(options.table);

    if (options.select) {
      query = query.select(options.select);
    }

    // For anonymous queries, only include public content filters
    const publicFilters = { ...options.filters };
    if (options.table === 'articles') {
      publicFilters.status = 'published';
    }

    if (publicFilters) {
      Object.entries(publicFilters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    return {
      data: data as T[],
      error,
      executionMode: 'anonymous'
    };
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
    // Simple preloading without complex optimization
    try {
      await Promise.allSettled([
        this.executeQuery({ table: 'articles', select: '*', filters: { status: 'published' }, limit: 20 }),
        this.executeQuery({ table: 'categories', select: '*' })
      ]);
    } catch (error) {
      // Silently fail - preloading is not critical
    }
  }
}

export const dataLoadingManager = new DataLoadingManager();