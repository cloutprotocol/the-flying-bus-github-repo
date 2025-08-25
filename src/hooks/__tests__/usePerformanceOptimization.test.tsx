import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePerformanceOptimization } from '../usePerformanceOptimization';

// Mock the performance optimization service
vi.mock('../../services/performanceOptimizationService', () => ({
  performanceOptimizationService: {
    optimizeQuery: vi.fn(),
    optimizeDataLoading: vi.fn(),
    optimizeAuthStateChange: vi.fn(),
    clearCache: vi.fn(),
    getMetrics: vi.fn(),
    getPerformanceRecommendations: vi.fn(),
    resetMetrics: vi.fn()
  }
}));

import { performanceOptimizationService } from '../../services/performanceOptimizationService';

describe('usePerformanceOptimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Core Optimization Functions', () => {
    it('should provide optimizeQuery function', async () => {
      const mockResult = 'optimized-data';
      vi.mocked(performanceOptimizationService.optimizeQuery).mockResolvedValue(mockResult);

      const { result } = renderHook(() => usePerformanceOptimization());

      const queryResult = await result.current.optimizeQuery(
        'test-key',
        async () => 'test-data'
      );

      expect(queryResult).toBe(mockResult);
      expect(performanceOptimizationService.optimizeQuery).toHaveBeenCalledWith(
        'test-key',
        expect.any(Function),
        {}
      );
    });

    it('should provide optimizeDataLoading function', async () => {
      const mockResults = ['data1', 'data2'];
      vi.mocked(performanceOptimizationService.optimizeDataLoading).mockResolvedValue(mockResults);

      const { result } = renderHook(() => usePerformanceOptimization());

      const queries = [
        { key: 'query1', fn: async () => 'data1' },
        { key: 'query2', fn: async () => 'data2' }
      ];

      const results = await result.current.optimizeDataLoading(queries);

      expect(results).toEqual(mockResults);
      expect(performanceOptimizationService.optimizeDataLoading).toHaveBeenCalledWith(queries);
    });

    it('should provide optimizeAuthStateChange function', async () => {
      vi.mocked(performanceOptimizationService.optimizeAuthStateChange).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePerformanceOptimization());

      const authStateFn = vi.fn().mockResolvedValue(undefined);
      await result.current.optimizeAuthStateChange(authStateFn);

      expect(performanceOptimizationService.optimizeAuthStateChange).toHaveBeenCalledWith(authStateFn);
    });
  });

  describe('Cache Management', () => {
    it('should provide clearCache function', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      act(() => {
        result.current.clearCache('test-pattern');
      });

      expect(performanceOptimizationService.clearCache).toHaveBeenCalledWith('test-pattern');
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should provide getCurrentMetrics function', () => {
      const mockMetrics = {
        dataLoadingTime: 1000,
        authStateChangeTime: 200,
        queryExecutionTime: 500,
        cacheHitRate: 0.7,
        errorRate: 0.02,
        totalQueries: 10,
        cacheSize: 5
      };

      vi.mocked(performanceOptimizationService.getMetrics).mockReturnValue(mockMetrics);

      const { result } = renderHook(() => usePerformanceOptimization());

      const metrics = result.current.getCurrentMetrics();

      expect(metrics).toEqual(mockMetrics);
      expect(performanceOptimizationService.getMetrics).toHaveBeenCalled();
    });

    it('should provide getRecommendations function', () => {
      const mockRecommendations = ['Optimize queries', 'Increase cache TTL'];
      vi.mocked(performanceOptimizationService.getPerformanceRecommendations).mockReturnValue(mockRecommendations);

      const { result } = renderHook(() => usePerformanceOptimization());

      const recommendations = result.current.getRecommendations();

      expect(recommendations).toEqual(mockRecommendations);
      expect(performanceOptimizationService.getPerformanceRecommendations).toHaveBeenCalled();
    });

    it('should update metrics periodically when monitoring is enabled', async () => {
      const mockMetrics = {
        dataLoadingTime: 1000,
        authStateChangeTime: 200,
        queryExecutionTime: 500,
        cacheHitRate: 0.7,
        errorRate: 0.02,
        totalQueries: 10,
        cacheSize: 5
      };

      const mockRecommendations = ['Test recommendation'];

      vi.mocked(performanceOptimizationService.getMetrics).mockReturnValue(mockMetrics);
      vi.mocked(performanceOptimizationService.getPerformanceRecommendations).mockReturnValue(mockRecommendations);

      const { result } = renderHook(() => 
        usePerformanceOptimization({ 
          enableMonitoring: true, 
          reportingInterval: 1000 
        })
      );

      // Fast-forward time to trigger the interval
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.metrics).toEqual(mockMetrics);
        expect(result.current.recommendations).toEqual(mockRecommendations);
      });
    });

    it('should not monitor when monitoring is disabled', () => {
      const { result } = renderHook(() => 
        usePerformanceOptimization({ enableMonitoring: false })
      );

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(result.current.metrics).toBeNull();
      expect(result.current.recommendations).toEqual([]);
    });
  });

  describe('Performance Validation', () => {
    it('should validate performance benchmarks', () => {
      const mockMetrics = {
        dataLoadingTime: 1500,
        authStateChangeTime: 300,
        queryExecutionTime: 800,
        cacheHitRate: 0.6,
        errorRate: 0.03,
        totalQueries: 20,
        cacheSize: 8
      };

      vi.mocked(performanceOptimizationService.getMetrics).mockReturnValue(mockMetrics);

      const { result } = renderHook(() => usePerformanceOptimization());

      const validation = result.current.validatePerformanceBenchmarks();

      expect(validation.passed).toBe(true);
      expect(validation.violations).toEqual([]);
      expect(validation.metrics).toEqual(mockMetrics);
      expect(validation.benchmarks).toBeDefined();
    });

    it('should detect performance violations', () => {
      const mockMetrics = {
        dataLoadingTime: 3000, // Exceeds 2000ms threshold
        authStateChangeTime: 600, // Exceeds 500ms threshold
        queryExecutionTime: 1200, // Exceeds 1000ms threshold
        cacheHitRate: 0.3, // Below 0.5 threshold
        errorRate: 0.08, // Above 0.05 threshold
        totalQueries: 10,
        cacheSize: 5
      };

      vi.mocked(performanceOptimizationService.getMetrics).mockReturnValue(mockMetrics);

      const { result } = renderHook(() => usePerformanceOptimization());

      const validation = result.current.validatePerformanceBenchmarks();

      expect(validation.passed).toBe(false);
      expect(validation.violations.length).toBeGreaterThan(0);
      expect(validation.violations).toContain(
        expect.stringContaining('Data loading time exceeded')
      );
    });

    it('should measure performance of operations', async () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      const testOperation = vi.fn().mockResolvedValue('operation-result');

      const measurement = await result.current.measurePerformance(
        'test-operation',
        testOperation
      );

      expect(measurement.result).toBe('operation-result');
      expect(measurement.duration).toBeGreaterThan(0);
      expect(testOperation).toHaveBeenCalled();
    });

    it('should handle operation errors in measurement', async () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(
        result.current.measurePerformance('failing-operation', failingOperation)
      ).rejects.toThrow('Operation failed');

      expect(failingOperation).toHaveBeenCalled();
    });
  });

  describe('Performance Status', () => {
    it('should indicate optimal performance when metrics are good', async () => {
      const goodMetrics = {
        dataLoadingTime: 1000,
        authStateChangeTime: 200,
        queryExecutionTime: 500,
        cacheHitRate: 0.8,
        errorRate: 0.01,
        totalQueries: 50,
        cacheSize: 10
      };

      vi.mocked(performanceOptimizationService.getMetrics).mockReturnValue(goodMetrics);
      vi.mocked(performanceOptimizationService.getPerformanceRecommendations).mockReturnValue([]);

      const { result } = renderHook(() => 
        usePerformanceOptimization({ enableMonitoring: true, reportingInterval: 100 })
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isPerformanceOptimal).toBe(true);
      });
    });

    it('should indicate suboptimal performance when metrics are poor', async () => {
      const poorMetrics = {
        dataLoadingTime: 3000,
        authStateChangeTime: 800,
        queryExecutionTime: 1500,
        cacheHitRate: 0.2,
        errorRate: 0.1,
        totalQueries: 10,
        cacheSize: 2
      };

      vi.mocked(performanceOptimizationService.getMetrics).mockReturnValue(poorMetrics);
      vi.mocked(performanceOptimizationService.getPerformanceRecommendations).mockReturnValue(['Optimize']);

      const { result } = renderHook(() => 
        usePerformanceOptimization({ enableMonitoring: true, reportingInterval: 100 })
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isPerformanceOptimal).toBe(false);
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset metrics and state', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      act(() => {
        result.current.resetMetrics();
      });

      expect(performanceOptimizationService.resetMetrics).toHaveBeenCalled();
    });
  });
});