/**
 * Performance Monitoring Hooks Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  usePerformanceMonitoring, 
  useRequestDeduplication, 
  usePerformanceCache,
  usePerformanceMetrics 
} from '../usePerformanceMonitoring';
import { performanceMonitoringService } from '../../services/performanceMonitoringService';

// Mock the performance monitoring service
vi.mock('../../services/performanceMonitoringService', () => ({
  performanceMonitoringService: {
    startTiming: vi.fn(() => 'test-timer-id'),
    endTiming: vi.fn(() => 100),
    recordMemoryUsage: vi.fn(),
    executeWithDeduplication: vi.fn(),
    setCache: vi.fn(),
    getCache: vi.fn(),
    executeWithCache: vi.fn(),
    getPerformanceSummary: vi.fn(() => ({
      metrics: [],
      memoryMetrics: [],
      cacheStats: { totalEntries: 0, hitRate: 0, memoryUsage: 0 },
      pendingRequests: 0
    })),
    clearPerformanceData: vi.fn()
  }
}));

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide performance monitoring functions', () => {
    const { result } = renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent',
        enableMemoryMonitoring: true,
        enableAutoCleanup: true
      })
    );

    expect(result.current.startFormSubmission).toBeDefined();
    expect(result.current.endFormSubmission).toBeDefined();
    expect(result.current.startDataLoading).toBeDefined();
    expect(result.current.endDataLoading).toBeDefined();
    expect(result.current.startAuthSync).toBeDefined();
    expect(result.current.endAuthSync).toBeDefined();
    expect(result.current.recordMemoryUsage).toBeDefined();
  });

  it('should record memory usage on mount when enabled', () => {
    renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent',
        enableMemoryMonitoring: true
      })
    );

    expect(performanceMonitoringService.recordMemoryUsage).toHaveBeenCalledWith(
      'TestComponent',
      'component-mount'
    );
  });

  it('should not record memory usage on mount when disabled', () => {
    renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent',
        enableMemoryMonitoring: false
      })
    );

    expect(performanceMonitoringService.recordMemoryUsage).not.toHaveBeenCalled();
  });

  it('should start form submission timing', () => {
    const { result } = renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent'
      })
    );

    act(() => {
      result.current.startFormSubmission('test-form', { field1: 'value1' });
    });

    expect(performanceMonitoringService.startTiming).toHaveBeenCalledWith(
      'form-submission-test-form',
      'TestComponent',
      { formName: 'test-form', field1: 'value1' }
    );
  });

  it('should end form submission timing', () => {
    const { result } = renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent'
      })
    );

    act(() => {
      result.current.endFormSubmission('test-timer-id', 'completed', { success: true });
    });

    expect(performanceMonitoringService.endTiming).toHaveBeenCalledWith(
      'test-timer-id',
      'completed',
      { success: true }
    );
  });

  it('should start data loading timing', () => {
    const { result } = renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent'
      })
    );

    act(() => {
      result.current.startDataLoading('articles-fetch', { category: 'headliners' });
    });

    expect(performanceMonitoringService.startTiming).toHaveBeenCalledWith(
      'data-loading-articles-fetch',
      'TestComponent',
      { operation: 'articles-fetch', category: 'headliners' }
    );
  });

  it('should start auth sync timing', () => {
    const { result } = renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent'
      })
    );

    act(() => {
      result.current.startAuthSync('session-establishment', { userId: 'test-user' });
    });

    expect(performanceMonitoringService.startTiming).toHaveBeenCalledWith(
      'auth-sync-session-establishment',
      'TestComponent',
      { operation: 'session-establishment', userId: 'test-user' }
    );
  });

  it('should record memory usage', () => {
    const { result } = renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent'
      })
    );

    act(() => {
      result.current.recordMemoryUsage('test-operation');
    });

    expect(performanceMonitoringService.recordMemoryUsage).toHaveBeenCalledWith(
      'TestComponent',
      'test-operation'
    );
  });

  it('should cleanup on unmount when auto cleanup is enabled', () => {
    const { unmount } = renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent',
        enableAutoCleanup: true,
        enableMemoryMonitoring: true
      })
    );

    // Start a timer to test cleanup
    const { result } = renderHook(() => 
      usePerformanceMonitoring({
        component: 'TestComponent',
        enableAutoCleanup: true
      })
    );

    act(() => {
      result.current.startFormSubmission('test-form');
    });

    unmount();

    // Should record memory usage on unmount
    expect(performanceMonitoringService.recordMemoryUsage).toHaveBeenCalledWith(
      'TestComponent',
      'component-unmount'
    );

    // Should end any active timers with failure status
    expect(performanceMonitoringService.endTiming).toHaveBeenCalledWith(
      'test-timer-id',
      'failed',
      { reason: 'component-unmount' }
    );
  });
});

describe('useRequestDeduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide request deduplication function', () => {
    const { result } = renderHook(() => useRequestDeduplication());

    expect(result.current.executeWithDeduplication).toBeDefined();
  });

  it('should call service executeWithDeduplication', async () => {
    const mockOperation = vi.fn(async () => 'test-result');
    (performanceMonitoringService.executeWithDeduplication as any).mockResolvedValue('test-result');

    const { result } = renderHook(() => useRequestDeduplication());

    await act(async () => {
      const response = await result.current.executeWithDeduplication(
        'test-key',
        mockOperation,
        5000
      );
      expect(response).toBe('test-result');
    });

    expect(performanceMonitoringService.executeWithDeduplication).toHaveBeenCalledWith(
      'test-key',
      mockOperation,
      5000
    );
  });
});

describe('usePerformanceCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide cache functions', () => {
    const { result } = renderHook(() => usePerformanceCache());

    expect(result.current.setCache).toBeDefined();
    expect(result.current.getCache).toBeDefined();
    expect(result.current.executeWithCache).toBeDefined();
  });

  it('should set cache data', () => {
    const { result } = renderHook(() => usePerformanceCache());

    act(() => {
      result.current.setCache('test-key', { data: 'test' }, 5000);
    });

    expect(performanceMonitoringService.setCache).toHaveBeenCalledWith(
      'test-key',
      { data: 'test' },
      5000
    );
  });

  it('should get cache data', () => {
    (performanceMonitoringService.getCache as any).mockReturnValue({ data: 'cached' });

    const { result } = renderHook(() => usePerformanceCache());

    act(() => {
      const cached = result.current.getCache('test-key');
      expect(cached).toEqual({ data: 'cached' });
    });

    expect(performanceMonitoringService.getCache).toHaveBeenCalledWith('test-key');
  });

  it('should execute with cache', async () => {
    const mockOperation = vi.fn(async () => 'test-result');
    (performanceMonitoringService.executeWithCache as any).mockResolvedValue('test-result');

    const { result } = renderHook(() => usePerformanceCache());

    await act(async () => {
      const response = await result.current.executeWithCache(
        'test-key',
        mockOperation,
        5000
      );
      expect(response).toBe('test-result');
    });

    expect(performanceMonitoringService.executeWithCache).toHaveBeenCalledWith(
      'test-key',
      mockOperation,
      5000
    );
  });
});

describe('usePerformanceMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide metrics functions', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    expect(result.current.getPerformanceSummary).toBeDefined();
    expect(result.current.clearPerformanceData).toBeDefined();
  });

  it('should get performance summary', () => {
    const mockSummary = {
      metrics: [{ id: 'test', operation: 'test-op', component: 'TestComponent' }],
      memoryMetrics: [],
      cacheStats: { totalEntries: 1, hitRate: 100, memoryUsage: 1024 },
      pendingRequests: 0
    };

    (performanceMonitoringService.getPerformanceSummary as any).mockReturnValue(mockSummary);

    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      const summary = result.current.getPerformanceSummary();
      expect(summary).toEqual(mockSummary);
    });

    expect(performanceMonitoringService.getPerformanceSummary).toHaveBeenCalled();
  });

  it('should clear performance data', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      result.current.clearPerformanceData();
    });

    expect(performanceMonitoringService.clearPerformanceData).toHaveBeenCalled();
  });
});