import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataLoadingManager } from '../dataLoadingManager';
import { authStateBuffer } from '../authStateBuffer';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Data Loading Independence Layer - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataLoadingManager.clearCache();
    authStateBuffer.reset();
  });

  describe('DataLoadingManager', () => {
    it('should initialize with correct default state', () => {
      const state = dataLoadingManager.getState();
      
      expect(state.isIndependent).toBe(true);
      expect(state.authInterference).toBe(false);
      expect(state.fallbackMode).toBe(false);
      expect(state.queryExecutionMode).toBe('authenticated');
    });

    it('should handle auth interference state changes', () => {
      const initialState = dataLoadingManager.getState();
      expect(initialState.authInterference).toBe(false);

      dataLoadingManager.setAuthInterference(true);
      const interferenceState = dataLoadingManager.getState();
      expect(interferenceState.authInterference).toBe(true);
      expect(interferenceState.queryExecutionMode).toBe('anonymous');

      dataLoadingManager.setAuthInterference(false);
      const normalState = dataLoadingManager.getState();
      expect(normalState.authInterference).toBe(false);
    });

    it('should clear cache when requested', () => {
      // This test verifies the cache clearing functionality exists
      expect(() => dataLoadingManager.clearCache()).not.toThrow();
    });

    it('should preload critical data without errors', async () => {
      // This test verifies the preload functionality exists
      await expect(dataLoadingManager.preloadCriticalData()).resolves.not.toThrow();
    });
  });

  describe('AuthStateBuffer', () => {
    it('should initialize with correct default state', () => {
      const state = authStateBuffer.getBufferState();
      
      expect(state.isBuffering).toBe(false);
      expect(state.bufferSize).toBe(0);
      expect(state.ongoingQueries).toBe(0);
      expect(state.config).toHaveProperty('bufferDuration');
      expect(state.config).toHaveProperty('maxBufferSize');
      expect(state.config).toHaveProperty('interferenceThreshold');
    });

    it('should buffer auth state changes', () => {
      const change = {
        type: 'session_start' as const,
        timestamp: Date.now(),
        data: { userId: '123' }
      };

      authStateBuffer.bufferStateChange(change);
      const state = authStateBuffer.getBufferState();
      
      expect(state.bufferSize).toBe(1);
    });

    it('should register and unregister queries', () => {
      const queryId = 'test-query-1';
      
      // Register query
      authStateBuffer.registerQuery(queryId);
      let state = authStateBuffer.getBufferState();
      expect(state.ongoingQueries).toBe(1);
      expect(state.isBuffering).toBe(true);

      // Unregister query
      authStateBuffer.unregisterQuery(queryId);
      state = authStateBuffer.getBufferState();
      expect(state.ongoingQueries).toBe(0);
    });

    it('should detect interference patterns', () => {
      const timestamp = Date.now();
      
      // Simulate rapid auth state changes
      for (let i = 0; i < 5; i++) {
        authStateBuffer.bufferStateChange({
          type: 'profile_loading',
          timestamp: timestamp + i * 10,
        });
      }

      const state = authStateBuffer.getBufferState();
      expect(state.isBuffering).toBe(true);
    });

    it('should reset buffer state completely', () => {
      // Set up some state
      authStateBuffer.registerQuery('test-query');
      authStateBuffer.bufferStateChange({
        type: 'session_start',
        timestamp: Date.now()
      });

      // Verify state is set
      let state = authStateBuffer.getBufferState();
      expect(state.bufferSize).toBeGreaterThan(0);
      expect(state.ongoingQueries).toBeGreaterThan(0);

      // Reset and verify
      authStateBuffer.reset();
      state = authStateBuffer.getBufferState();
      
      expect(state.bufferSize).toBe(0);
      expect(state.ongoingQueries).toBe(0);
      expect(state.isBuffering).toBe(false);
    });

    it('should update configuration', () => {
      const newConfig = {
        bufferDuration: 2000,
        maxBufferSize: 20,
        interferenceThreshold: 5
      };

      authStateBuffer.updateConfig(newConfig);
      const state = authStateBuffer.getBufferState();
      
      expect(state.config.bufferDuration).toBe(2000);
      expect(state.config.maxBufferSize).toBe(20);
      expect(state.config.interferenceThreshold).toBe(5);
    });

    it('should handle multiple query registrations', () => {
      const queryIds = ['query-1', 'query-2', 'query-3'];
      
      // Register multiple queries
      queryIds.forEach(id => authStateBuffer.registerQuery(id));
      
      let state = authStateBuffer.getBufferState();
      expect(state.ongoingQueries).toBe(3);
      expect(state.isBuffering).toBe(true);

      // Unregister one query
      authStateBuffer.unregisterQuery('query-1');
      state = authStateBuffer.getBufferState();
      expect(state.ongoingQueries).toBe(2);
      expect(state.isBuffering).toBe(true);

      // Unregister remaining queries
      authStateBuffer.unregisterQuery('query-2');
      authStateBuffer.unregisterQuery('query-3');
      state = authStateBuffer.getBufferState();
      expect(state.ongoingQueries).toBe(0);
    });

    it('should handle buffer overflow', () => {
      const maxBufferSize = authStateBuffer.getBufferState().config.maxBufferSize;
      
      // Add more changes than the buffer can hold
      for (let i = 0; i < maxBufferSize + 5; i++) {
        authStateBuffer.bufferStateChange({
          type: 'profile_loading',
          timestamp: Date.now() + i,
        });
      }

      const state = authStateBuffer.getBufferState();
      expect(state.bufferSize).toBeLessThanOrEqual(maxBufferSize);
    });
  });

  describe('Integration', () => {
    it('should coordinate between DataLoadingManager and AuthStateBuffer', () => {
      // Initially no interference
      expect(dataLoadingManager.getState().authInterference).toBe(false);
      expect(authStateBuffer.getBufferState().isBuffering).toBe(false);

      // Register a query (should trigger buffering)
      authStateBuffer.registerQuery('integration-test');
      expect(authStateBuffer.getBufferState().isBuffering).toBe(true);

      // Set auth interference
      dataLoadingManager.setAuthInterference(true);
      expect(dataLoadingManager.getState().authInterference).toBe(true);
      expect(dataLoadingManager.getState().queryExecutionMode).toBe('anonymous');

      // Unregister query
      authStateBuffer.unregisterQuery('integration-test');
      expect(authStateBuffer.getBufferState().ongoingQueries).toBe(0);

      // Reset interference
      dataLoadingManager.setAuthInterference(false);
      expect(dataLoadingManager.getState().authInterference).toBe(false);
    });

    it('should handle rapid state changes gracefully', () => {
      const timestamp = Date.now();
      
      // Simulate a complex scenario
      authStateBuffer.registerQuery('complex-query-1');
      authStateBuffer.registerQuery('complex-query-2');
      
      // Rapid auth state changes
      const authChanges = [
        { type: 'session_start' as const, timestamp: timestamp },
        { type: 'profile_loading' as const, timestamp: timestamp + 10 },
        { type: 'profile_error' as const, timestamp: timestamp + 20 },
        { type: 'profile_loading' as const, timestamp: timestamp + 30 },
        { type: 'profile_loaded' as const, timestamp: timestamp + 40 }
      ];

      authChanges.forEach(change => {
        authStateBuffer.bufferStateChange(change);
      });

      // Set interference
      dataLoadingManager.setAuthInterference(true);

      // Verify system state
      const bufferState = authStateBuffer.getBufferState();
      const managerState = dataLoadingManager.getState();

      expect(bufferState.isBuffering).toBe(true);
      expect(bufferState.ongoingQueries).toBe(2);
      expect(bufferState.bufferSize).toBeGreaterThan(0);
      expect(managerState.authInterference).toBe(true);
      expect(managerState.queryExecutionMode).toBe('anonymous');

      // Clean up
      authStateBuffer.unregisterQuery('complex-query-1');
      authStateBuffer.unregisterQuery('complex-query-2');
      authStateBuffer.reset();
      dataLoadingManager.setAuthInterference(false);
    });
  });
});