/**
 * Performance Monitoring Integration Tests
 * 
 * Tests the complete performance monitoring system including:
 * - Form submission timing
 * - Data loading performance
 * - Authentication sync monitoring
 * - Request deduplication
 * - Caching functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import RequestInvitation from '../../pages/RequestInvitation';
import Index from '../../pages/Index';
import { AuthProvider } from '../../providers/AuthProvider';
import { performanceMonitoringService } from '../../services/performanceMonitoringService';

// Mock Supabase
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }
}));

// Mock invitation service
vi.mock('../../services/invitationService', () => ({
  createInvitationRequest: vi.fn(() => 
    Promise.resolve({ 
      success: true, 
      data: { id: 'test-invitation' },
      details: { emailSent: true }
    })
  )
}));

// Mock article data
vi.mock('../../data/articles', () => ({
  getHeadlineArticle: vi.fn(() => 
    Promise.resolve({
      id: '1',
      title: 'Test Headline',
      excerpt: 'Test excerpt',
      category: 'Headliners'
    })
  ),
  getCategoryArticles: vi.fn(() => 
    Promise.resolve([
      {
        id: '1',
        title: 'Test Article',
        excerpt: 'Test excerpt',
        category: 'Test Category'
      }
    ])
  )
}));

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10,
    totalJSHeapSize: 1024 * 1024 * 20,
    jsHeapSizeLimit: 1024 * 1024 * 100
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Performance Monitoring Integration', () => {
  beforeEach(() => {
    performanceMonitoringService.clearPerformanceData();
    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitoringService.clearPerformanceData();
  });

  describe('Form Submission Performance', () => {
    it('should monitor form submission timing end-to-end', async () => {
      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      // Fill out the form
      const parentNameInput = screen.getByLabelText(/parent.*name/i);
      const parentEmailInput = screen.getByLabelText(/parent.*email/i);
      const childNameInput = screen.getByLabelText(/child.*name/i);
      const childAgeInput = screen.getByLabelText(/child.*age/i);

      fireEvent.change(parentNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(parentEmailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(childNameInput, { target: { value: 'Jane Doe' } });
      fireEvent.change(childAgeInput, { target: { value: '10' } });

      // Get initial performance summary
      const initialSummary = performanceMonitoringService.getPerformanceSummary();
      const initialMetricsCount = initialSummary.metrics.length;

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /submit.*invitation/i });
      fireEvent.click(submitButton);

      // Wait for form submission to complete
      await waitFor(() => {
        const summary = performanceMonitoringService.getPerformanceSummary();
        expect(summary.metrics.length).toBeGreaterThan(initialMetricsCount);
      }, { timeout: 10000 });

      // Verify performance metrics were recorded
      const finalSummary = performanceMonitoringService.getPerformanceSummary();
      
      // Should have form submission metrics
      const formMetrics = finalSummary.metrics.filter(m => 
        m.operation.includes('form-submission') && m.component === 'RequestInvitation'
      );
      
      expect(formMetrics.length).toBeGreaterThan(0);
      
      // Should have completed metrics with duration
      const completedMetrics = formMetrics.filter(m => m.status === 'completed');
      expect(completedMetrics.length).toBeGreaterThan(0);
      
      completedMetrics.forEach(metric => {
        expect(metric.duration).toBeGreaterThan(0);
        expect(metric.endTime).toBeDefined();
        expect(metric.metadata).toBeDefined();
      });

      // Should have memory metrics
      expect(finalSummary.memoryMetrics.length).toBeGreaterThan(0);
    });

    it('should handle form submission errors with performance monitoring', async () => {
      // Mock invitation service to fail
      const { createInvitationRequest } = await import('../../services/invitationService');
      vi.mocked(createInvitationRequest).mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      // Fill out the form with invalid age to trigger validation error
      const childAgeInput = screen.getByLabelText(/child.*age/i);
      fireEvent.change(childAgeInput, { target: { value: '5' } }); // Invalid age

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /submit.*invitation/i });
      fireEvent.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        const summary = performanceMonitoringService.getPerformanceSummary();
        const failedMetrics = summary.metrics.filter(m => m.status === 'failed');
        expect(failedMetrics.length).toBeGreaterThan(0);
      });

      // Verify error metrics
      const summary = performanceMonitoringService.getPerformanceSummary();
      const failedMetrics = summary.metrics.filter(m => 
        m.status === 'failed' && m.component === 'RequestInvitation'
      );
      
      expect(failedMetrics.length).toBeGreaterThan(0);
      
      failedMetrics.forEach(metric => {
        expect(metric.metadata?.errorType).toBeDefined();
        expect(metric.duration).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Loading Performance', () => {
    it('should monitor data loading timing for Index page', async () => {
      render(
        <TestWrapper>
          <Index />
        </TestWrapper>
      );

      // Wait for data loading to complete
      await waitFor(() => {
        const summary = performanceMonitoringService.getPerformanceSummary();
        const dataLoadingMetrics = summary.metrics.filter(m => 
          m.operation.includes('data-loading') && m.component === 'Index'
        );
        expect(dataLoadingMetrics.length).toBeGreaterThan(0);
      }, { timeout: 15000 });

      // Verify data loading metrics
      const summary = performanceMonitoringService.getPerformanceSummary();
      const dataLoadingMetrics = summary.metrics.filter(m => 
        m.operation.includes('data-loading') && m.component === 'Index'
      );
      
      expect(dataLoadingMetrics.length).toBeGreaterThan(0);
      
      const completedMetrics = dataLoadingMetrics.filter(m => m.status === 'completed');
      expect(completedMetrics.length).toBeGreaterThan(0);
      
      completedMetrics.forEach(metric => {
        expect(metric.duration).toBeGreaterThan(0);
        expect(metric.metadata).toBeDefined();
        expect(metric.metadata?.totalArticles).toBeDefined();
      });
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate identical requests', async () => {
      let callCount = 0;
      const mockOperation = vi.fn(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return `result-${callCount}`;
      });

      const requestKey = 'test-deduplication';
      
      // Start multiple identical requests simultaneously
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
  });

  describe('Caching Performance', () => {
    it('should cache and retrieve data efficiently', async () => {
      const testData = { articles: [1, 2, 3], timestamp: Date.now() };
      const cacheKey = 'test-cache-performance';
      
      // Set cache
      performanceMonitoringService.setCache(cacheKey, testData, 10000);
      
      // Get from cache multiple times
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const cached = performanceMonitoringService.getCache(cacheKey);
        expect(cached).toEqual(testData);
      }
      
      const duration = performance.now() - start;
      
      // Cache retrieval should be fast (less than 10ms for 100 operations)
      expect(duration).toBeLessThan(10);
      
      // Verify cache statistics
      const summary = performanceMonitoringService.getPerformanceSummary();
      expect(summary.cacheStats.totalEntries).toBeGreaterThan(0);
      expect(summary.cacheStats.hitRate).toBeGreaterThan(0);
    });

    it('should execute operation with caching', async () => {
      let callCount = 0;
      const mockOperation = vi.fn(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: `result-${callCount}`, timestamp: Date.now() };
      });

      const cacheKey = 'test-operation-cache';
      
      // First call should execute operation
      const start1 = performance.now();
      const result1 = await performanceMonitoringService.executeWithCache(cacheKey, mockOperation);
      const duration1 = performance.now() - start1;
      
      expect(result1.data).toBe('result-1');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(duration1).toBeGreaterThan(40); // Should take time for operation
      
      // Second call should use cache
      const start2 = performance.now();
      const result2 = await performanceMonitoringService.executeWithCache(cacheKey, mockOperation);
      const duration2 = performance.now() - start2;
      
      expect(result2.data).toBe('result-1'); // Same result
      expect(mockOperation).toHaveBeenCalledTimes(1); // Still only called once
      expect(duration2).toBeLessThan(10); // Should be much faster from cache
    });
  });

  describe('Memory Monitoring', () => {
    it('should track memory usage during component lifecycle', async () => {
      const { unmount } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      // Wait for component to mount and record initial memory
      await waitFor(() => {
        const summary = performanceMonitoringService.getPerformanceSummary();
        expect(summary.memoryMetrics.length).toBeGreaterThan(0);
      });

      const initialMemoryCount = performanceMonitoringService.getPerformanceSummary().memoryMetrics.length;

      // Unmount component
      unmount();

      // Should have recorded memory usage on unmount
      await waitFor(() => {
        const summary = performanceMonitoringService.getPerformanceSummary();
        expect(summary.memoryMetrics.length).toBeGreaterThan(initialMemoryCount);
      });

      // Verify memory metrics have proper structure
      const summary = performanceMonitoringService.getPerformanceSummary();
      const memoryMetrics = summary.memoryMetrics;
      
      expect(memoryMetrics.length).toBeGreaterThan(0);
      
      memoryMetrics.forEach(metric => {
        expect(metric.timestamp).toBeDefined();
        expect(metric.usedJSHeapSize).toBeGreaterThan(0);
        expect(metric.totalJSHeapSize).toBeGreaterThan(0);
        expect(metric.jsHeapSizeLimit).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Summary', () => {
    it('should provide comprehensive performance summary', async () => {
      // Generate some test data
      const timerId1 = performanceMonitoringService.startTiming('test-operation-1', 'TestComponent');
      await new Promise(resolve => setTimeout(resolve, 10));
      performanceMonitoringService.endTiming(timerId1, 'completed');
      
      const timerId2 = performanceMonitoringService.startTiming('test-operation-2', 'TestComponent');
      performanceMonitoringService.endTiming(timerId2, 'failed', { error: 'Test error' });
      
      performanceMonitoringService.recordMemoryUsage('TestComponent', 'test-operation');
      performanceMonitoringService.setCache('test-key', { data: 'test' });
      
      const summary = performanceMonitoringService.getPerformanceSummary();
      
      // Verify summary structure
      expect(summary.metrics).toBeDefined();
      expect(summary.memoryMetrics).toBeDefined();
      expect(summary.cacheStats).toBeDefined();
      expect(summary.pendingRequests).toBeDefined();
      
      // Verify metrics
      expect(summary.metrics.length).toBeGreaterThanOrEqual(2);
      const completedMetrics = summary.metrics.filter(m => m.status === 'completed');
      const failedMetrics = summary.metrics.filter(m => m.status === 'failed');
      
      expect(completedMetrics.length).toBeGreaterThanOrEqual(1);
      expect(failedMetrics.length).toBeGreaterThanOrEqual(1);
      
      // Verify cache stats
      expect(summary.cacheStats.totalEntries).toBeGreaterThan(0);
      expect(summary.cacheStats.hitRate).toBeGreaterThanOrEqual(0);
      expect(summary.cacheStats.memoryUsage).toBeGreaterThan(0);
      
      // Verify memory metrics
      expect(summary.memoryMetrics.length).toBeGreaterThan(0);
    });
  });
});