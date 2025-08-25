import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useUserFeedback } from '../useUserFeedback';

describe('useUserFeedback Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with null feedback', () => {
    const { result } = renderHook(() => useUserFeedback());
    
    expect(result.current.feedback).toBeNull();
  });

  it('shows error feedback correctly', () => {
    const { result } = renderHook(() => useUserFeedback());
    
    act(() => {
      result.current.showError('Test error message', {
        title: 'Error Title',
        details: 'Error details'
      });
    });

    expect(result.current.feedback).toEqual({
      type: 'error',
      message: 'Test error message',
      title: 'Error Title',
      details: 'Error details'
    });
  });

  it('shows success feedback correctly', () => {
    const { result } = renderHook(() => useUserFeedback());
    
    act(() => {
      result.current.showSuccess('Success message', {
        nextSteps: ['Step 1', 'Step 2']
      });
    });

    expect(result.current.feedback).toEqual({
      type: 'success',
      message: 'Success message',
      nextSteps: ['Step 1', 'Step 2']
    });
  });

  it('shows loading feedback with progress', () => {
    const { result } = renderHook(() => useUserFeedback());
    
    act(() => {
      result.current.showLoading('Loading...', {
        showProgress: true,
        progress: 50,
        estimatedTime: '10 seconds'
      });
    });

    expect(result.current.feedback).toEqual({
      type: 'loading',
      message: 'Loading...',
      showProgress: true,
      progress: 50,
      estimatedTime: '10 seconds'
    });
  });

  it('updates progress correctly', () => {
    const { result } = renderHook(() => useUserFeedback());
    
    act(() => {
      result.current.showLoading('Loading...');
    });

    act(() => {
      result.current.updateProgress(75, '5 seconds');
    });

    expect(result.current.feedback?.progress).toBe(75);
    expect(result.current.feedback?.estimatedTime).toBe('5 seconds');
  });

  it('clears feedback correctly', () => {
    const { result } = renderHook(() => useUserFeedback());
    
    act(() => {
      result.current.showError('Test error');
    });

    expect(result.current.feedback).not.toBeNull();

    act(() => {
      result.current.clearFeedback();
    });

    expect(result.current.feedback).toBeNull();
  });

  it('auto-clears success messages after 5 seconds', () => {
    const { result } = renderHook(() => useUserFeedback());
    
    act(() => {
      result.current.showSuccess('Success message');
    });

    expect(result.current.feedback).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.feedback).toBeNull();
  });

  it('does not auto-clear error messages', () => {
    const { result } = renderHook(() => useUserFeedback());
    
    act(() => {
      result.current.showError('Error message');
    });

    expect(result.current.feedback).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.feedback).not.toBeNull();
  });

  it('calls retry handler when retry is invoked', () => {
    const mockRetryHandler = vi.fn();
    const { result } = renderHook(() => useUserFeedback());
    
    act(() => {
      result.current.setRetryHandler(mockRetryHandler);
    });

    act(() => {
      result.current.retry();
    });

    expect(mockRetryHandler).toHaveBeenCalledTimes(1);
  });

  it('replaces previous feedback when new feedback is shown', () => {
    const { result } = renderHook(() => useUserFeedback());
    
    act(() => {
      result.current.showError('First error');
    });

    expect(result.current.feedback?.message).toBe('First error');

    act(() => {
      result.current.showSuccess('Success message');
    });

    expect(result.current.feedback?.message).toBe('Success message');
    expect(result.current.feedback?.type).toBe('success');
  });
});