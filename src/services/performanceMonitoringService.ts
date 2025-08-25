/**
 * Performance Monitoring Service
 * 
 * Provides comprehensive performance monitoring for:
 * - Form submissions timing
 * - Data loading operations
 * - Memory usage tracking
 * - Authentication state synchronization
 * - Request deduplication
 * - Caching strategies
 */

interface PerformanceMetric {
  id: string;
  operation: string;
  component: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

interface MemoryMetric {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  component?: string;
  operation?: string;
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface RequestDeduplicationEntry {
  promise: Promise<any>;
  timestamp: number;
  requestKey: string;
}

class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private memoryMetrics: MemoryMetric[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, RequestDeduplicationEntry> = new Map();
  private memoryMonitoringInterval?: NodeJS.Timeout;
  private readonly MAX_METRICS_HISTORY = 1000;
  private readonly MAX_MEMORY_HISTORY = 100;
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.startMemoryMonitoring();
    this.setupPerformanceObserver();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Start timing a performance metric
   */
  startTiming(operation: string, component: string, metadata?: Record<string, any>): string {
    const id = `${operation}-${component}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetric = {
      id,
      operation,
      component,
      startTime: performance.now(),
      status: 'started',
      metadata
    };

    this.metrics.set(id, metric);
    
    console.log(`[Performance] Started timing: ${operation} in ${component}`, {
      id,
      startTime: metric.startTime,
      metadata
    });

    return id;
  }

  /**
   * End timing a performance metric
   */
  endTiming(id: string, status: 'completed' | 'failed' = 'completed', metadata?: Record<string, any>): number | null {
    const metric = this.metrics.get(id);
    if (!metric) {
      console.warn(`[Performance] Metric not found: ${id}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.status = status;
    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }

    console.log(`[Performance] Completed timing: ${metric.operation} in ${metric.component}`, {
      id,
      duration: `${duration.toFixed(2)}ms`,
      status,
      metadata: metric.metadata
    });

    // Clean up old metrics
    this.cleanupOldMetrics();

    return duration;
  }

  /**
   * Record form submission timing
   */
  recordFormSubmission(formName: string, component: string): {
    start: () => string;
    end: (status?: 'completed' | 'failed', metadata?: Record<string, any>) => number | null;
  } {
    return {
      start: () => this.startTiming(`form-submission-${formName}`, component, { formName }),
      end: (status = 'completed', metadata) => {
        const activeMetric = Array.from(this.metrics.values())
          .find(m => m.operation === `form-submission-${formName}` && m.component === component && !m.endTime);
        
        if (activeMetric) {
          return this.endTiming(activeMetric.id, status, metadata);
        }
        return null;
      }
    };
  }

  /**
   * Record data loading timing
   */
  recordDataLoading(operation: string, component: string): {
    start: () => string;
    end: (status?: 'completed' | 'failed', metadata?: Record<string, any>) => number | null;
  } {
    return {
      start: () => this.startTiming(`data-loading-${operation}`, component, { operation }),
      end: (status = 'completed', metadata) => {
        const activeMetric = Array.from(this.metrics.values())
          .find(m => m.operation === `data-loading-${operation}` && m.component === component && !m.endTime);
        
        if (activeMetric) {
          return this.endTiming(activeMetric.id, status, metadata);
        }
        return null;
      }
    };
  }

  /**
   * Record authentication state synchronization timing
   */
  recordAuthSync(operation: string): {
    start: () => string;
    end: (status?: 'completed' | 'failed', metadata?: Record<string, any>) => number | null;
  } {
    return {
      start: () => this.startTiming(`auth-sync-${operation}`, 'AuthProvider', { operation }),
      end: (status = 'completed', metadata) => {
        const activeMetric = Array.from(this.metrics.values())
          .find(m => m.operation === `auth-sync-${operation}` && m.component === 'AuthProvider' && !m.endTime);
        
        if (activeMetric) {
          return this.endTiming(activeMetric.id, status, metadata);
        }
        return null;
      }
    };
  }

  /**
   * Execute operation with request deduplication
   */
  async executeWithDeduplication<T>(
    requestKey: string,
    operation: () => Promise<T>,
    ttl: number = 30000 // 30 seconds
  ): Promise<T> {
    // Check if request is already pending
    const existing = this.pendingRequests.get(requestKey);
    if (existing && (Date.now() - existing.timestamp) < ttl) {
      console.log(`[Performance] Deduplicating request: ${requestKey}`);
      return existing.promise as Promise<T>;
    }

    // Create new request
    const promise = operation();
    this.pendingRequests.set(requestKey, {
      promise,
      timestamp: Date.now(),
      requestKey
    });

    try {
      const result = await promise;
      console.log(`[Performance] Request completed: ${requestKey}`);
      return result;
    } catch (error) {
      console.error(`[Performance] Request failed: ${requestKey}`, error);
      throw error;
    } finally {
      // Clean up completed request
      setTimeout(() => {
        this.pendingRequests.delete(requestKey);
      }, 1000);
    }
  }

  /**
   * Cache data with TTL
   */
  setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    console.log(`[Performance] Cached data: ${key} (TTL: ${ttl}ms)`);

    // Clean up expired entries
    this.cleanupExpiredCache();
  }

  /**
   * Get cached data
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      console.log(`[Performance] Cache expired: ${key}`);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    console.log(`[Performance] Cache hit: ${key} (access count: ${entry.accessCount})`);
    return entry.data;
  }

  /**
   * Execute operation with caching
   */
  async executeWithCache<T>(
    cacheKey: string,
    operation: () => Promise<T>,
    ttl: number = this.DEFAULT_CACHE_TTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.getCache<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute operation and cache result
    const result = await operation();
    this.setCache(cacheKey, result, ttl);
    return result;
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(component?: string, operation?: string): void {
    if (!('memory' in performance)) {
      return;
    }

    const memoryInfo = (performance as any).memory;
    const metric: MemoryMetric = {
      timestamp: Date.now(),
      usedJSHeapSize: memoryInfo.usedJSHeapSize,
      totalJSHeapSize: memoryInfo.totalJSHeapSize,
      jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
      component,
      operation
    };

    this.memoryMetrics.push(metric);

    // Log if memory usage is high
    const usagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
    if (usagePercent > 80) {
      console.warn(`[Performance] High memory usage: ${usagePercent.toFixed(2)}%`, {
        component,
        operation,
        usedMB: (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2),
        totalMB: (memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)
      });
    }

    // Keep only recent memory metrics
    if (this.memoryMetrics.length > this.MAX_MEMORY_HISTORY) {
      this.memoryMetrics = this.memoryMetrics.slice(-this.MAX_MEMORY_HISTORY);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: PerformanceMetric[];
    memoryMetrics: MemoryMetric[];
    cacheStats: {
      totalEntries: number;
      hitRate: number;
      memoryUsage: number;
    };
    pendingRequests: number;
  } {
    const completedMetrics = Array.from(this.metrics.values()).filter(m => m.endTime);
    
    // Calculate cache hit rate
    const totalAccesses = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.accessCount, 0);
    const hitRate = totalAccesses > 0 ? (totalAccesses / (totalAccesses + this.cache.size)) * 100 : 0;

    // Estimate cache memory usage
    const cacheMemoryUsage = JSON.stringify(Array.from(this.cache.entries())).length;

    return {
      metrics: completedMetrics,
      memoryMetrics: this.memoryMetrics,
      cacheStats: {
        totalEntries: this.cache.size,
        hitRate,
        memoryUsage: cacheMemoryUsage
      },
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Clear all performance data
   */
  clearPerformanceData(): void {
    this.metrics.clear();
    this.memoryMetrics.length = 0;
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('[Performance] Cleared all performance data');
  }

  /**
   * Start automatic memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
    }

    // Disabled to prevent infinite loops and rate limiting issues
    // this.memoryMonitoringInterval = setInterval(() => {
    //   this.recordMemoryUsage('PerformanceMonitor', 'automatic-monitoring');
    // }, 30000); // Every 30 seconds
  }

  /**
   * Setup Performance Observer for additional metrics
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              console.log('[Performance] Navigation timing:', {
                domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                loadComplete: entry.loadEventEnd - entry.loadEventStart,
                totalTime: entry.loadEventEnd - entry.fetchStart
              });
            }
          });
        });

        observer.observe({ entryTypes: ['navigation', 'resource'] });
      } catch (error) {
        console.warn('[Performance] PerformanceObserver not supported:', error);
      }
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    if (this.metrics.size > this.MAX_METRICS_HISTORY) {
      const sortedMetrics = Array.from(this.metrics.entries())
        .sort(([, a], [, b]) => (a.startTime || 0) - (b.startTime || 0));
      
      const toDelete = sortedMetrics.slice(0, sortedMetrics.length - this.MAX_METRICS_HISTORY);
      toDelete.forEach(([id]) => this.metrics.delete(id));
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.memoryMonitoringInterval) {
      clearInterval(this.memoryMonitoringInterval);
    }
    this.clearPerformanceData();
  }
}

export const performanceMonitoringService = PerformanceMonitoringService.getInstance();
export default performanceMonitoringService;