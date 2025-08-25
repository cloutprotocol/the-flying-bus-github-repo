/**
 * Enhanced NavigationContext Tests
 * 
 * Tests for improved state synchronization, loading state management,
 * authentication sync progress tracking, and debounced navigation handling.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  NavigationProvider, 
  useNavigation, 
  useNavigationLoading,
  useAuthSyncProgress
} from '../NavigationContext';

// Mock the logger
vi.mock('@/utils/logger/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock the component lifecycle manager
vi.mock('@/utils/componentLifecycleManager', () => ({
  useComponentLifecycle: vi.fn(() => ({
    addTimeout: (callback: () => void, delay: number) => setTimeout(callback, delay),
    addEventListener: (event: string, listener: EventListener) => {
      window.addEventListener(event, listener);
    },
    safeSetState: (setter: any, value: any) => setter(value),
    dispatchNavigationChange: (detail?: any) => {
      const event = new CustomEvent('navigation-change', { detail });
      window.dispatchEvent(event);
    }
  }))
}));

// Test component that uses NavigationContext
const TestComponent: React.FC<{ componentId?: string }> = ({ componentId = 'test-component' }) => {
  const navigation = useNavigation();
  const { setLoading, isLoading } = useNavigationLoading(componentId);
  const { startAuthSync, completeAuthSync, authSyncProgress } = useAuthSyncProgress();
  
  return (
    <div>
      <div data-testid="previous-path">{navigation.previousPath || 'none'}</div>
      <div data-testid="navigation-type">{navigation.navigationType}</div>
      <div data-testid="navigation-count">{navigation.navigationCount}</div>
      <div data-testid="is-transitioning">{navigation.isTransitioning.toString()}</div>
      <div data-testid="loading-states-count">{navigation.loadingStates.size}</div>
      <div data-testid="auth-sync-stage">{authSyncProgress.stage}</div>
      <div data-testid="auth-sync-progress">{authSyncProgress.isInProgress.toString()}</div>
      <div data-testid="is-navigation-debounced">{navigation.isNavigationDebounced.toString()}</div>
      <div data-testid="is-loading">{isLoading().toString()}</div>
      
      <button 
        data-testid="set-loading-btn"
        onClick={() => setLoading('test-operation', true)}
      >
        Set Loading
      </button>
      <button 
        data-testid="clear-loading-btn"
        onClick={() => setLoading('test-operation', false)}
      >
        Clear Loading
      </button>
      <button 
        data-testid="start-auth-sync-btn"
        onClick={() => startAuthSync('session-check')}
      >
        Start Auth Sync
      </button>
      <button 
        data-testid="complete-auth-sync-btn"
        onClick={() => completeAuthSync(true)}
      >
        Complete Auth Sync
      </button>
      <button 
        data-testid="clear-all-loading-btn"
        onClick={() => navigation.clearAllLoadingStates()}
      >
        Clear All Loading
      </button>
    </div>
  );
};

// Simple test component for basic functionality
const SimpleTestComponent: React.FC = () => {
  const navigation = useNavigation();
  
  return (
    <div>
      <div data-testid="loading-states-count">{navigation.loadingStates.size}</div>
      <div data-testid="auth-sync-stage">{navigation.authSyncProgress.stage}</div>
    </div>
  );
};

const renderWithRouter = (component: React.ReactElement, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <NavigationProvider>
        {component}
      </NavigationProvider>
    </MemoryRouter>
  );
};

describe('Enhanced NavigationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Navigation Functionality', () => {
    it('should initialize with correct default values', () => {
      renderWithRouter(<TestComponent />);
      
      expect(screen.getByTestId('previous-path')).toHaveTextContent('none');
      expect(screen.getByTestId('navigation-count')).toHaveTextContent('1');
      expect(screen.getByTestId('is-transitioning')).toHaveTextContent('false');
      expect(screen.getByTestId('loading-states-count')).toHaveTextContent('0');
      expect(screen.getByTestId('auth-sync-stage')).toHaveTextContent('idle');
      expect(screen.getByTestId('auth-sync-progress')).toHaveTextContent('false');
      expect(screen.getByTestId('is-navigation-debounced')).toHaveTextContent('false');
    });
  });

  describe('Loading State Management', () => {
    it('should manage component loading states correctly', () => {
      renderWithRouter(<TestComponent />);
      
      // Initially no loading states
      expect(screen.getByTestId('loading-states-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      
      // Set loading state
      act(() => {
        screen.getByTestId('set-loading-btn').click();
      });
      
      expect(screen.getByTestId('loading-states-count')).toHaveTextContent('1');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
      
      // Clear loading state
      act(() => {
        screen.getByTestId('clear-loading-btn').click();
      });
      
      expect(screen.getByTestId('loading-states-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    });
  });

  describe('Authentication Sync Progress', () => {
    it('should manage auth sync progress correctly', () => {
      renderWithRouter(<TestComponent />);
      
      // Initially idle
      expect(screen.getByTestId('auth-sync-stage')).toHaveTextContent('idle');
      expect(screen.getByTestId('auth-sync-progress')).toHaveTextContent('false');
      
      // Start auth sync
      act(() => {
        screen.getByTestId('start-auth-sync-btn').click();
      });
      
      expect(screen.getByTestId('auth-sync-stage')).toHaveTextContent('session-check');
      expect(screen.getByTestId('auth-sync-progress')).toHaveTextContent('true');
      
      // Complete auth sync
      act(() => {
        screen.getByTestId('complete-auth-sync-btn').click();
      });
      
      expect(screen.getByTestId('auth-sync-stage')).toHaveTextContent('complete');
      expect(screen.getByTestId('auth-sync-progress')).toHaveTextContent('false');
    });
  });

  describe('Simple Integration Test', () => {
    it('should work with simple components', () => {
      renderWithRouter(<SimpleTestComponent />);
      
      expect(screen.getByTestId('loading-states-count')).toHaveTextContent('0');
      expect(screen.getByTestId('auth-sync-stage')).toHaveTextContent('idle');
    });
  });
});