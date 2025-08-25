/**
 * Performance Optimization Service
 * Provides performance monitoring, optimization, and caching for auth data loading
 */

interface PerformanceMetrics {
  dataLoadingTime: number;
  authStateChangeTime: number;
  queryExecutionTime: number;
  cacheHitRate: number;
  errorRate: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface QueryPerformanceConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  maxRetries: number;
  retryDelay: number;
  performanceThresholds: {
    dataLoading: number;
    authStateChange: number;
    queryExecution: number;
  };
}

class PerformanceOptimizationService {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: PerformanceMetrics = {
    dataLoadingTime: 0,
    authStateChangeTime: 0,
    queryExecutionTime: 0,
    cacheHitRate: 0,
    errorRate: 0
  };
  
  private config: QueryPerformanceConfig = {
    enableCaching: true,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    retryDelay: 1000,
    performanceThresholds: {
      dataLoading: 2000, // 2 seconds
      authStateChange: 500, // 500ms
      queryExecution: 1000 // 1 second
    }
  };

  private queryCount = 0;
  private cacheHits = 0;
  private errors = 0;

  /**
   * Optimize query execution with caching and performance monitoring
   */
  async optimizeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: { 
      ttl?: number; 
      skipCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const startTime = performance.now();
    this.queryCount++;

    try {
      // Check cache first
      if (this.config.enableCaching && !options.skipCache) {
        const cached = this.getFromCache<T>(queryKey);
        if (cached) {
          this.cacheHits++;
          this.updateCacheHitRate();
          return cached;
        }
      }

      // Execute query with timeout
      const result = await this.executeWithTimeout(queryFn, options.timeout);
      
      // Cache result
      if (this.config.enableCaching && !options.skipCache) {
        this.setCache(queryKey, result, options.ttl);
      }

      // Record performance metrics
      const executionTime = performance.now() - startTime;
      this.recordQueryPerformance(executionTime);

      return result;
    } catch (error) {
      this.errors++;
      this.updateErrorRate();
      
      // Try to return cached data on error
      if (this.config.enableCaching) {
        const cached = this.getFromCache<T>(queryKey, true); // Allow stale
        if (cached) {
          console.warn('Query failed, returning stale cached data:', error);
          return cached;
        }
      }
      
      throw error;
    }
  }

  /**
   * Optimize data loading with batching and prioritization
   */
  async optimizeDataLoading<T>(
    queries: Array<{
      key: string;
      fn: () => Promise<T>;
      priority?: 'high' | 'medium' | 'low';
    }>
  ): Promise<T[]> {
    const startTime = performance.now();

    // Sort by priority
    const sortedQueries = queries.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
    });

    // Execute high priority queries first
    const highPriorityQueries = sortedQueries.filter(q => q.priority === 'high');
    const otherQueries = sortedQueries.filter(q => q.priority !== 'high');

    const results: T[] = [];

    // Execute high priority queries immediately
    for (const query of highPriorityQueries) {
      try {
        const result = await this.optimizeQuery(query.key, query.fn);
        results.push(result);
      } catch (error) {
        console.error(`High priority query failed: ${query.key}`, error);
        throw error; // Fail fast for high priority
      }
    }

    // Execute other queries in parallel
    const otherResults = await Promise.allSettled(
      otherQueries.map(query => this.optimizeQuery(query.key, query.fn))
    );

    otherResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`Query failed: ${otherQueries[index].key}`, result.reason);
        // Continue with other queries, don't fail the entire batch
      }
    });

    // Record data loading performance
    const loadingTime = performance.now() - startTime;
    this.metrics.dataLoadingTime = loadingTime;

    if (loadingTime > this.config.performanceThresholds.dataLoading) {
      console.warn(`Data loading exceeded threshold: ${loadingTime}ms`);
    }

    return results;
  }

  /**
   * Optimize auth state changes
   */
  async optimizeAuthStateChange(
    authStateFn: () => Promise<void>
  ): Promise<void> {
    const startTime = performance.now();

    try {
      await authStateFn();
      
      const changeTime = performance.now() - startTime;
      this.metrics.authStateChangeTime = changeTime;

      if (changeTime > this.config.performanceThresholds.authStateChange) {
        console.warn(`Auth state change exceeded threshold: ${changeTime}ms`);
      }
    } catch (error) {
      console.error('Auth state change failed:', error);
      throw error;
    }
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string, allowStale = false): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const isExpired = now > entry.timestamp + entry.ttl;

    if (isExpired && !allowStale) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTimeout
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout = 10000
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);
  }

  /**
   * Performance monitoring
   */
  private recordQueryPerformance(executionTime: number): void {
    this.metrics.queryExecutionTime = executionTime;

    if (executionTime > this.config.performanceThresholds.queryExecution) {
      console.warn(`Query execution exceeded threshold: ${executionTime}ms`);
    }
  }

  private updateCacheHitRate(): void {
    this.metrics.cacheHitRate = this.queryCount > 0 ? this.cacheHits / this.queryCount : 0;
  }

  private updateErrorRate(): void {
    this.metrics.errorRate = this.queryCount > 0 ? this.errors / this.queryCount : 0;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics & {
    totalQueries: number;
    cacheSize: number;
  } {
    return {
      ...this.metrics,
      totalQueries: this.queryCount,
      cacheSize: this.cache.size
    };
  }

  /**
   * Performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.dataLoadingTime > this.config.performanceThresholds.dataLoading) {
      recommendations.push('Consider implementing data pagination or lazy loading');
    }

    if (metrics.cacheHitRate < 0.5) {
      recommendations.push('Cache hit rate is low, consider increasing cache TTL');
    }

    if (metrics.errorRate > 0.1) {
      recommendations.push('Error rate is high, check network connectivity and error handling');
    }

    if (metrics.queryExecutionTime > this.config.performanceThresholds.queryExecution) {
      recommendations.push('Query execution is slow, consider optimizing database queries');
    }

    if (metrics.cacheSize > 100) {
      recommendations.push('Cache size is large, consider implementing cache eviction policies');
    }

    return recommendations;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.queryCount = 0;
    this.cacheHits = 0;
    this.errors = 0;
    this.metrics = {
      dataLoadingTime: 0,
      authStateChangeTime: 0,
      queryExecutionTime: 0,
      cacheHitRate: 0,
      errorRate: 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<QueryPerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton instance
export const performanceOptimizationService = new PerformanceOptimizationService();

export default performanceOptimizationService;