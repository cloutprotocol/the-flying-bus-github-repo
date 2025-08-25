import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceOptimizationService } from '../performanceOptimizationService';

describe('PerformanceOptimizationService', () => {
  beforeEach(() => {
    performanceOptimizationService.resetMetrics();
    performanceOptimizationService.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Query Optimization', () => {
    it('should cache query results', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue('test-data');
      
      // First call
      const result1 = await performanceOptimizationService.optimizeQuery(
        'test-key',
        mockQueryFn
      );
      
      // Second call should use cache
      const result2 = await performanceOptimizationService.optimizeQuery(
        'test-key',
        mockQueryFn
      );
      
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
      expect(mockQueryFn).toHaveBeenCalledTimes(1); // Only called once due to caching
      
      const metrics = performanceOptimizationService.getMetrics();
      expect(metrics.cacheHitRate).toBe(0.5); // 1 hit out of 2 queries
    });

    it('should skip cache when requested', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue('test-data');
      
      // First call
      await performanceOptimizationService.optimizeQuery('test-key', mockQueryFn);
      
      // Second call with skipCache
      await performanceOptimizationService.optimizeQuery(
        'test-key',
        mockQueryFn,
        { skipCache: true }
      );
      
      expect(mockQueryFn).toHaveBeenCalledTimes(2);
    });

    it('should handle query timeout', async () => {
      const slowQueryFn = () => new Promise(resolve => 
        setTimeout(() => resolve('slow-data'), 2000)
      );
      
      await expect(
        performanceOptimizationService.optimizeQuery(
          'slow-key',
          slowQueryFn,
          { timeout: 100 }
        )
      ).rejects.toThrow('Query timeout');
    });

    it('should return stale cache data on error', async () => {
      const mockQueryFn = vi.fn()
        .mockResolvedValueOnce('cached-data')
        .mockRejectedValueOnce(new Error('Network error'));
      
      // First call to populate cache
      await performanceOptimizationService.optimizeQuery('error-key', mockQueryFn);
      
      // Second call should return cached data despite error
      const result = await performanceOptimizationService.optimizeQuery('error-key', mockQueryFn);
      
      expect(result).toBe('cached-data');
    });
  });

  describe('Data Loading Optimization', () => {
    it('should prioritize high priority queries', async () => {
      const executionOrder: string[] = [];
      
      const queries = [
        {
          key: 'low-priority',
          fn: async () => {
            executionOrder.push('low');
            return 'low-data';
          },
          priority: 'low' as const
        },
        {
          key: 'high-priority',
          fn: async () => {
            executionOrder.push('high');
            return 'high-data';
          },
          priority: 'high' as const
        },
        {
          key: 'medium-priority',
          fn: async () => {
            executionOrder.push('medium');
            return 'medium-data';
          },
          priority: 'medium' as const
        }
      ];
      
      await performanceOptimizationService.optimizeDataLoading(queries);
      
      // High priority should execute first
      expect(executionOrder[0]).toBe('high');
    });

    it('should handle partial failures gracefully', async () => {
      const queries = [
        {
          key: 'success-query',
          fn: async () => 'success-data',
          priority: 'high' as const
        },
        {
          key: 'failure-query',
          fn: async () => {
            throw new Error('Query failed');
          },
          priority: 'low' as const
        }
      ];
      
      // Should not throw for low priority failures
      const results = await performanceOptimizationService.optimizeDataLoading(queries);
      expect(results).toContain('success-data');
    });

    it('should fail fast for high priority query failures', async () => {
      const queries = [
        {
          key: 'critical-query',
          fn: async () => {
            throw new Error('Critical failure');
          },
          priority: 'high' as const
        }
      ];
      
      await expect(
        performanceOptimizationService.optimizeDataLoading(queries)
      ).rejects.toThrow('Critical failure');
    });
  });

  describe('Auth State Optimization', () => {
    it('should measure auth state change performance', async () => {
      const authStateFn = vi.fn().mockResolvedValue(undefined);
      
      await performanceOptimizationService.optimizeAuthStateChange(authStateFn);
      
      const metrics = performanceOptimizationService.getMetrics();
      expect(metrics.authStateChangeTime).toBeGreaterThan(0);
      expect(authStateFn).toHaveBeenCalledTimes(1);
    });

    it('should handle auth state change errors', async () => {
      const authStateFn = vi.fn().mockRejectedValue(new Error('Auth error'));
      
      await expect(
        performanceOptimizationService.optimizeAuthStateChange(authStateFn)
      ).rejects.toThrow('Auth error');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache by pattern', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue('data');
      
      // Populate cache with different keys
      await performanceOptimizationService.optimizeQuery('user-1', mockQueryFn);
      await performanceOptimizationService.optimizeQuery('user-2', mockQueryFn);
      await performanceOptimizationService.optimizeQuery('article-1', mockQueryFn);
      
      // Clear user-related cache
      performanceOptimizationService.clearCache('user-');
      
      // User queries should hit the function again
      await performanceOptimizationService.optimizeQuery('user-1', mockQueryFn);
      await performanceOptimizationService.optimizeQuery('user-2', mockQueryFn);
      
      // Article query should still use cache
      await performanceOptimizationService.optimizeQuery('article-1', mockQueryFn);
      
      // Should have been called 4 times (3 initial + 2 after cache clear)
      expect(mockQueryFn).toHaveBeenCalledTimes(5);
    });

    it('should respect cache TTL', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue('data');
      
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000;
      Date.now = vi.fn(() => currentTime);
      
      try {
        // First call with short TTL
        await performanceOptimizationService.optimizeQuery(
          'ttl-key',
          mockQueryFn,
          { ttl: 100 }
        );
        
        // Advance time beyond TTL
        currentTime += 200;
        
        // Second call should not use cache
        await performanceOptimizationService.optimizeQuery('ttl-key', mockQueryFn);
        
        expect(mockQueryFn).toHaveBeenCalledTimes(2);
      } finally {
        Date.now = originalNow;
      }
    });
  });

  describe('Performance Metrics', () => {
    it('should track query execution metrics', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue('data');
      
      await performanceOptimizationService.optimizeQuery('metrics-key', mockQueryFn);
      
      const metrics = performanceOptimizationService.getMetrics();
      
      expect(metrics.totalQueries).toBe(1);
      expect(metrics.queryExecutionTime).toBeGreaterThan(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });

    it('should track error rate', async () => {
      const mockQueryFn = vi.fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('failure'));
      
      await performanceOptimizationService.optimizeQuery('success-key', mockQueryFn);
      
      try {
        await performanceOptimizationService.optimizeQuery('error-key', mockQueryFn);
      } catch (error) {
        // Expected error
      }
      
      const metrics = performanceOptimizationService.getMetrics();
      expect(metrics.errorRate).toBe(0.5); // 1 error out of 2 queries
    });
  });

  describe('Performance Recommendations', () => {
    it('should provide recommendations based on metrics', async () => {
      // Simulate poor performance
      const slowQueryFn = () => new Promise(resolve => 
        setTimeout(() => resolve('data'), 100)
      );
      
      await performanceOptimizationService.optimizeQuery('slow-key', slowQueryFn);
      
      const recommendations = performanceOptimizationService.getPerformanceRecommendations();
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend cache improvements for low hit rate', async () => {
      const mockQueryFn = vi.fn().mockResolvedValue('data');
      
      // Make multiple unique queries (low cache hit rate)
      for (let i = 0; i < 10; i++) {
        await performanceOptimizationService.optimizeQuery(`unique-key-${i}`, mockQueryFn);
      }
      
      const recommendations = performanceOptimizationService.getPerformanceRecommendations();
      const cacheRecommendation = recommendations.find(rec => 
        rec.includes('cache hit rate') || rec.includes('cache TTL')
      );
      
      expect(cacheRecommendation).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        enableCaching: false,
        cacheTimeout: 10000,
        performanceThresholds: {
          dataLoading: 3000,
          authStateChange: 1000,
          queryExecution: 1500
        }
      };
      
      performanceOptimizationService.updateConfig(newConfig);
      
      // Configuration should be applied (test indirectly through behavior)
      expect(() => performanceOptimizationService.updateConfig(newConfig)).not.toThrow();
    });
  });
});