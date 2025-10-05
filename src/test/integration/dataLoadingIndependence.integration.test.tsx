import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { dataLoadingManager } from '@/services/dataLoadingManager';
import { authStateBuffer } from '@/services/authStateBuffer';
import { queryExecutor } from '@/services/queryExecutor';
import { useArticlesIndependent } from '@/hooks/useDataLoadingIndependence';

// Mock Supabase client
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis()
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mockQuery)
  }
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Test component that uses the data loading independence layer
function TestArticlesComponent() {
  const { data, isLoading, error, executionMode, fromCache, refetch } = useArticlesIndependent();

  if (isLoading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">Error: {error.message}</div>;

  return (
    <div>
      <div data-testid="execution-mode">{executionMode}</div>
      <div data-testid="from-cache">{fromCache ? 'cached' : 'fresh'}</div>
      <div data-testid="article-count">{data?.length || 0}</div>
      <button onClick={refetch} data-testid="refetch-button">Refetch</button>
      {data?.map((article: any) => (
        <div key={article.id} data-testid={`article-${article.id}`}>
          {article.title}
        </div>
      ))}
    </div>
  );
}

describe('Data Loading Independence Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataLoadingManager.clearCache();
    authStateBuffer.reset();
  });

  afterEach(() => {
    authStateBuffer.reset();
  });

  it('should load articles independently of auth state', async () => {
    const mockArticles = [
      { id: 1, title: 'Article 1', status: 'published' },
      { id: 2, title: 'Article 2', status: 'published' }
    ];

    mockQuery.limit.mockResolvedValue({ data: mockArticles, error: null });

    render(<TestArticlesComponent />);

    // Should show loading initially
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('article-count')).toHaveTextContent('2');
    });

    expect(screen.getByTestId('execution-mode')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('from-cache')).toHaveTextContent('fresh');
    expect(screen.getByTestId('article-1')).toHaveTextContent('Article 1');
    expect(screen.getByTestId('article-2')).toHaveTextContent('Article 2');
  });

  it('should fallback to anonymous mode when auth fails', async () => {
    const mockArticles = [
      { id: 1, title: 'Public Article', status: 'published' }
    ];

    // First call (authenticated) fails, second call (anonymous) succeeds
    mockQuery.limit
      .mockRejectedValueOnce(new Error('Auth failed'))
      .mockResolvedValueOnce({ data: mockArticles, error: null });

    render(<TestArticlesComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('article-count')).toHaveTextContent('1');
    });

    expect(screen.getByTestId('execution-mode')).toHaveTextContent('anonymous');
    expect(screen.getByTestId('article-1')).toHaveTextContent('Public Article');
  });

  it('should handle auth state changes without interrupting data loading', async () => {
    const mockArticles = [
      { id: 1, title: 'Stable Article', status: 'published' }
    ];

    mockQuery.limit.mockResolvedValue({ data: mockArticles, error: null });

    render(<TestArticlesComponent />);

    // Simulate auth state changes during component lifecycle
    authStateBuffer.bufferStateChange({
      type: 'session_start',
      timestamp: Date.now()
    });

    authStateBuffer.bufferStateChange({
      type: 'profile_loading',
      timestamp: Date.now()
    });

    authStateBuffer.bufferStateChange({
      type: 'profile_loaded',
      timestamp: Date.now(),
      data: { userId: '123' }
    });

    await waitFor(() => {
      expect(screen.getByTestId('article-count')).toHaveTextContent('1');
    });

    // Data should still load despite auth state changes
    expect(screen.getByTestId('article-1')).toHaveTextContent('Stable Article');
  });

  it('should use cached data on subsequent requests', async () => {
    const mockArticles = [
      { id: 1, title: 'Cached Article', status: 'published' }
    ];

    mockQuery.limit.mockResolvedValue({ data: mockArticles, error: null });

    const { rerender } = render(<TestArticlesComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('article-count')).toHaveTextContent('1');
    });

    expect(screen.getByTestId('from-cache')).toHaveTextContent('fresh');

    // Rerender component to trigger another fetch
    rerender(<TestArticlesComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('from-cache')).toHaveTextContent('cached');
    });

    // Should still show the same data
    expect(screen.getByTestId('article-1')).toHaveTextContent('Cached Article');
  });

  it('should handle query execution during auth interference', async () => {
    const mockArticles = [
      { id: 1, title: 'Interference Test Article', status: 'published' }
    ];

    mockQuery.limit.mockResolvedValue({ data: mockArticles, error: null });

    // Simulate auth interference
    dataLoadingManager.setAuthInterference(true);

    render(<TestArticlesComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('article-count')).toHaveTextContent('1');
    });

    // Should still load data despite interference
    expect(screen.getByTestId('article-1')).toHaveTextContent('Interference Test Article');
  });

  it('should handle multiple concurrent queries', async () => {
    const mockArticles = [
      { id: 1, title: 'Concurrent Article 1', status: 'published' },
      { id: 2, title: 'Concurrent Article 2', status: 'published' }
    ];

    mockQuery.limit.mockResolvedValue({ data: mockArticles, error: null });

    // Render multiple components that will trigger concurrent queries
    render(
      <div>
        <TestArticlesComponent />
        <TestArticlesComponent />
      </div>
    );

    await waitFor(() => {
      const articleCounts = screen.getAllByTestId('article-count');
      articleCounts.forEach(count => {
        expect(count).toHaveTextContent('2');
      });
    });

    // Both components should show the same data
    expect(screen.getAllByTestId('article-1')).toHaveLength(2);
    expect(screen.getAllByTestId('article-2')).toHaveLength(2);
  });

  it('should handle query retries on failure', async () => {
    const mockArticles = [
      { id: 1, title: 'Retry Success Article', status: 'published' }
    ];

    // First two calls fail, third succeeds
    mockQuery.limit
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: mockArticles, error: null });

    render(<TestArticlesComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('article-count')).toHaveTextContent('1');
    }, { timeout: 5000 });

    expect(screen.getByTestId('article-1')).toHaveTextContent('Retry Success Article');
  });

  it('should maintain query protection during rapid auth changes', async () => {
    const mockArticles = [
      { id: 1, title: 'Protected Article', status: 'published' }
    ];

    mockQuery.limit.mockResolvedValue({ data: mockArticles, error: null });

    render(<TestArticlesComponent />);

    // Simulate rapid auth state changes
    const authChanges = [
      { type: 'session_start' as const, timestamp: Date.now() },
      { type: 'profile_loading' as const, timestamp: Date.now() + 10 },
      { type: 'profile_error' as const, timestamp: Date.now() + 20 },
      { type: 'profile_loading' as const, timestamp: Date.now() + 30 },
      { type: 'profile_loaded' as const, timestamp: Date.now() + 40 }
    ];

    authChanges.forEach(change => {
      authStateBuffer.bufferStateChange(change);
    });

    await waitFor(() => {
      expect(screen.getByTestId('article-count')).toHaveTextContent('1');
    });

    // Data should load successfully despite rapid auth changes
    expect(screen.getByTestId('article-1')).toHaveTextContent('Protected Article');
  });

  it('should provide execution statistics', async () => {
    const mockArticles = [
      { id: 1, title: 'Stats Article', status: 'published' }
    ];

    mockQuery.limit.mockResolvedValue({ data: mockArticles, error: null });

    render(<TestArticlesComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('article-count')).toHaveTextContent('1');
    });

    const stats = queryExecutor.getExecutionStats();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('pending');
    expect(stats).toHaveProperty('completed');
    expect(stats).toHaveProperty('failed');
    expect(stats).toHaveProperty('averageExecutionTime');
  });

  it('should handle buffer state management', () => {
    const bufferState = authStateBuffer.getBufferState();
    
    expect(bufferState).toHaveProperty('isBuffering');
    expect(bufferState).toHaveProperty('bufferSize');
    expect(bufferState).toHaveProperty('ongoingQueries');
    expect(bufferState).toHaveProperty('config');

    // Register a query
    authStateBuffer.registerQuery('test-query');
    const activeState = authStateBuffer.getBufferState();
    expect(activeState.ongoingQueries).toBe(1);
    expect(activeState.isBuffering).toBe(true);

    // Unregister the query
    authStateBuffer.unregisterQuery('test-query');
    const inactiveState = authStateBuffer.getBufferState();
    expect(inactiveState.ongoingQueries).toBe(0);
  });
});