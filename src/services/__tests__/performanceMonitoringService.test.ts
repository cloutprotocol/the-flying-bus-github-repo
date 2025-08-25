/**
 * Performance Monitoring Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceMonitoringService } from '../performanceMonitoringService';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10, // 10MB
    totalJSHeapSize: 1024 * 1024 * 20, // 20MB
    jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('PerformanceMonitoringService', () => {
  beforeEach(() => {
    performanceMonitoringService.clearPerformanceData();
    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitoringService.clearPerformanceData();
  });

  describe('Timing Operations', () => {
    it('should start and end timing correctly', () => {
      const timerId = performanceMonitoringService.startTiming('test-operation', 'TestComponent');
      
      expect(timerId).toBeDefined();
      expect(typeof timerId).toBe('string');
      
      const duration = performanceMonitoringService.endTiming(timerId, 'completed');
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid timer IDs gracefully', () => {
      const duration = performanceMonitoringService.endTiming('invalid-id');
      
      expect(duration).toBeNull();
    });

    it('should record metadata with timing operations', () => {
      const metadata = { formFields: 5, hasMessage: true };
      const timerId = performanceMonitoringService.startTiming(
        'form-submission',
        'RequestInvitation',
        metadata
      );
      
      performanceMonitoringService.endTiming(timerId, 'completed', { success: true });
      
      const summary = performanceMonitoringService.getPerformanceSummary();
      const metric = summary.metrics.find(m => m.id === timerId);
      
      expect(metric).toBeDefined();
      expect(metric?.metadata).toMatchObject({ ...metadata, success: true });
    });
  });

  describe('Form Submission Timing', () => {
    it('should provide form submission timing helpers', () => {
      const formTimer = performanceMonitoringService.recordFormSubmission('invitation-request', 'RequestInvitation');
      
      const timerId = formTimer.start();
      expect(timerId).toBeDefined();
      
      const duration = formTimer.end('completed', { success: true });
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Loading Timing', () => {
    it('should provide data loading timing helpers', () => {
      const dataTimer = performanceMonitoringService.recordDataLoading('articles-fetch', 'Index');
      
      const timerId = dataTimer.start();
      expect(timerId).toBeDefined();
      
      const duration = dataTimer.end('completed', { articlesCount: 10 });
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication Sync Timing', () => {
    it('should provide auth sync timing helpers', () => {
      const authTimer = performanceMonitoringService.recordAuthSync('session-establishment');
      
      const timerId = authTimer.start();
      expect(timerId).toBeDefined();
      
      const duration = authTimer.end('completed', { userId: 'test-user' });
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate identical requests', async () => {
      let callCount = 0;
      const mockOperation = vi.fn(async () => {
        callCount++;
        return `result-${callCount}`;
      });

      const requestKey = 'test-request';
      
      // Start multiple identical requests
      const promises = [
        performanceMonitoringService.executeWithDeduplication(requestKey, mockOperation),
        performanceMonitoringService.executeWithDeduplication(requestKey, mockOperation),
        performanceMonitoringService.executeWithDeduplication(requestKey, mockOperation)
      ];

      const results = await Promise.all(promises);
      
      // Should only call the operation once
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      // All results should be the same
      expect(results).toEqual(['result-1', 'result-1', 'result-1']);
    });

    it('should handle request deduplication errors', async () => {
      const mockOperation = vi.fn(async () => {
        throw new Error('Test error');
      });

      const requestKey = 'failing-request';
      
      await expect(
        performanceMonitoringService.executeWithDeduplication(requestKey, mockOperation)
      ).rejects.toThrow('Test error');
    });
  });

  describe('Caching', () => {
    it('should cache and retrieve data correctly', () => {
      const testData = { articles: [1, 2, 3] };
      const cacheKey = 'test-cache';
      
      performanceMonitoringService.setCache(cacheKey, testData);
      const retrieved = performanceMonitoringService.getCache(cacheKey);
      
      expect(retrieved).toEqual(testData);
    });

    it('should respect TTL for cached data', async () => {
      const testData = { articles: [1, 2, 3] };
      const cacheKey = 'test-cache-ttl';
      const shortTTL = 100; // 100ms
      
      performanceMonitoringService.setCache(cacheKey, testData, shortTTL);
      
      // Should be available immediately
      expect(performanceMonitoringService.getCache(cacheKey)).toEqual(testData);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50));
      
      // Should be expired
      expect(performanceMonitoringService.getCache(cacheKey)).toBeNull();
    });

    it('should execute operation with caching', async () => {
      let callCount = 0;
      const mockOperation = vi.fn(async () => {
        callCount++;
        return `result-${callCount}`;
      });

      const cacheKey = 'test-operation-cache';
      
      // First call should execute operation
      const result1 = await performanceMonitoringService.executeWithCache(cacheKey, mockOperation);
      expect(result1).toBe('result-1');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = await performanceMonitoringService.executeWithCache(cacheKey, mockOperation);
      expect(result2).toBe('result-1');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('Memory Monitoring', () => {
    it('should record memory usage when memory API is available', () => {
      performanceMonitoringService.recordMemoryUsage('TestComponent', 'test-operation');
      
      const summary = performanceMonitoringService.getPerformanceSummary();
      
      expect(summary.memoryMetrics.length).toBeGreaterThan(0);
      
      const latestMetric = summary.memoryMetrics[summary.memoryMetrics.length - 1];
      expect(latestMetric.component).toBe('TestComponent');
      expect(latestMetric.operation).toBe('test-operation');
      expect(latestMetric.usedJSHeapSize).toBe(mockPerformance.memory.usedJSHeapSize);
    });

    it('should handle missing memory API gracefully', () => {
      // Temporarily remove memory API
      const originalMemory = (global.performance as any).memory;
      delete (global.performance as any).memory;
      
      expect(() => {
        performanceMonitoringService.recordMemoryUsage('TestComponent');
      }).not.toThrow();
      
      // Restore memory API
      (global.performance as any).memory = originalMemory;
    });
  });

  describe('Performance Summary', () => {
    it('should provide comprehensive performance summary', () => {
      // Add some test data
      const timerId = performanceMonitoringService.startTiming('test-op', 'TestComponent');
      performanceMonitoringService.endTiming(timerId, 'completed');
      
      performanceMonitoringService.recordMemoryUsage('TestComponent');
      performanceMonitoringService.setCache('test-key', { data: 'test' });
      
      const summary = performanceMonitoringService.getPerformanceSummary();
      
      expect(summary.metrics.length).toBeGreaterThan(0);
      expect(summary.memoryMetrics.length).toBeGreaterThan(0);
      expect(summary.cacheStats.totalEntries).toBeGreaterThan(0);
      expect(summary.pendingRequests).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cleanup and Management', () => {
    it('should clear all performance data', () => {
      // Add some test data
      const timerId = performanceMonitoringService.startTiming('test-op', 'TestComponent');
      performanceMonitoringService.endTiming(timerId, 'completed');
      performanceMonitoringService.recordMemoryUsage('TestComponent');
      performanceMonitoringService.setCache('test-key', { data: 'test' });
      
      let summary = performanceMonitoringService.getPerformanceSummary();
      expect(summary.metrics.length).toBeGreaterThan(0);
      
      performanceMonitoringService.clearPerformanceData();
      
      summary = performanceMonitoringService.getPerformanceSummary();
      expect(summary.metrics.length).toBe(0);
      expect(summary.memoryMetrics.length).toBe(0);
      expect(summary.cacheStats.totalEntries).toBe(0);
    });

    it('should handle cleanup of old metrics', () => {
      // Create many metrics to trigger cleanup
      for (let i = 0; i < 1100; i++) {
        const timerId = performanceMonitoringService.startTiming(`test-op-${i}`, 'TestComponent');
        performanceMonitoringService.endTiming(timerId, 'completed');
      }
      
      const summary = performanceMonitoringService.getPerformanceSummary();
      
      // Should not exceed maximum history
      expect(summary.metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle timing operations with failed status', () => {
      const timerId = performanceMonitoringService.startTiming('failing-operation', 'TestComponent');
      
      const duration = performanceMonitoringService.endTiming(timerId, 'failed', {
        errorType: 'network_error',
        errorMessage: 'Connection failed'
      });
      
      expect(duration).toBeGreaterThanOrEqual(0);
      
      const summary = performanceMonitoringService.getPerformanceSummary();
      const metric = summary.metrics.find(m => m.id === timerId);
      
      expect(metric?.status).toBe('failed');
      expect(metric?.metadata?.errorType).toBe('network_error');
    });

    it('should handle cache operations with invalid keys', () => {
      expect(() => {
        performanceMonitoringService.setCache('', { data: 'test' });
      }).not.toThrow();
      
      // Empty string is still a valid key, so it should return the cached data
      expect(performanceMonitoringService.getCache('')).toEqual({ data: 'test' });
      
      // Test with null/undefined key behavior
      expect(performanceMonitoringService.getCache('non-existent-key')).toBeNull();
    });
  });
});