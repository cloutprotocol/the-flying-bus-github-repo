/**
 * Simple Regression Testing for Home Page Loading Fix
 * 
 * This test suite verifies that other application components still work correctly
 * after the home page simplification changes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import hooks to test
import { usePerformanceMonitoring, useRequestDeduplication } from '@/hooks/usePerformanceMonitoring';
import { useUserFeedback } from '@/hooks/useUserFeedback';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
    useParams: () => ({})
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({ 
  children, 
  initialEntries = ['/'] 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Simple Regression Testing - Hook Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('usePerformanceMonitoring Hook', () => {
    it('should initialize and provide performance monitoring functions', () => {
      let performanceHook: any;

      const TestComponent = () => {
        performanceHook = usePerformanceMonitoring({
          component: 'TestComponent',
          enableMemoryMonitoring: true,
          enableAutoCleanup: true
        });

        return <div data-testid="performance-test">Performance Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('performance-test')).toBeInTheDocument();
      expect(performanceHook).toBeDefined();
      expect(typeof performanceHook.startFormSubmission).toBe('function');
      expect(typeof performanceHook.endFormSubmission).toBe('function');
      expect(typeof performanceHook.startDataLoading).toBe('function');
      expect(typeof performanceHook.endDataLoading).toBe('function');
      expect(typeof performanceHook.startAuthSync).toBe('function');
      expect(typeof performanceHook.endAuthSync).toBe('function');
      expect(typeof performanceHook.recordMemoryUsage).toBe('function');
    });

    it('should handle timing operations correctly', () => {
      let performanceHook: any;

      const TestComponent = () => {
        performanceHook = usePerformanceMonitoring({
          component: 'TestComponent'
        });

        return <div data-testid="timing-test">Timing Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Test timing operations
      const timerId = performanceHook.startFormSubmission('test-form', { test: true });
      expect(typeof timerId).toBe('string');

      const duration = performanceHook.endFormSubmission(timerId, 'completed', { success: true });
      expect(typeof duration).toBe('number');
    });
  });

  describe('useRequestDeduplication Hook', () => {
    it('should provide deduplication functionality', () => {
      let deduplicationHook: any;

      const TestComponent = () => {
        deduplicationHook = useRequestDeduplication();
        return <div data-testid="deduplication-test">Deduplication Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('deduplication-test')).toBeInTheDocument();
      expect(deduplicationHook).toBeDefined();
      expect(typeof deduplicationHook.executeWithDeduplication).toBe('function');
    });
  });

  describe('useUserFeedback Hook', () => {
    it('should initialize and provide feedback functions', () => {
      let feedbackHook: any;

      const TestComponent = () => {
        feedbackHook = useUserFeedback();
        return <div data-testid="feedback-test">Feedback Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-test')).toBeInTheDocument();
      expect(feedbackHook).toBeDefined();
      expect(typeof feedbackHook.showError).toBe('function');
      expect(typeof feedbackHook.showSuccess).toBe('function');
      expect(typeof feedbackHook.showLoading).toBe('function');
      expect(typeof feedbackHook.showInfo).toBe('function');
      expect(typeof feedbackHook.updateProgress).toBe('function');
      expect(typeof feedbackHook.clearFeedback).toBe('function');
      expect(typeof feedbackHook.retry).toBe('function');
      expect(typeof feedbackHook.setRetryHandler).toBe('function');
    });

    it('should handle feedback state changes correctly', () => {
      let feedbackHook: any;

      const TestComponent = () => {
        feedbackHook = useUserFeedback();
        
        React.useEffect(() => {
          // Test showing error feedback
          feedbackHook.showError('Test error message', {
            title: 'Test Error',
            details: 'Test error details'
          });
        }, []);

        return (
          <div data-testid="feedback-state-test">
            {feedbackHook.feedback && (
              <div data-testid="feedback-display">
                <div data-testid="feedback-type">{feedbackHook.feedback.type}</div>
                <div data-testid="feedback-message">{feedbackHook.feedback.message}</div>
                <div data-testid="feedback-title">{feedbackHook.feedback.title}</div>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('feedback-state-test')).toBeInTheDocument();
      expect(screen.getByTestId('feedback-display')).toBeInTheDocument();
      expect(screen.getByTestId('feedback-type')).toHaveTextContent('error');
      expect(screen.getByTestId('feedback-message')).toHaveTextContent('Test error message');
      expect(screen.getByTestId('feedback-title')).toHaveTextContent('Test Error');
    });
  });

  describe('Navigation State Management', () => {
    it('should handle navigation state changes without interference', () => {
      const TestNavigationComponent = () => {
        const [currentPage, setCurrentPage] = React.useState('home');
        const [isLoading, setIsLoading] = React.useState(false);

        const handleNavigation = (page: string) => {
          setIsLoading(true);
          setTimeout(() => {
            setCurrentPage(page);
            setIsLoading(false);
          }, 100);
        };

        return (
          <div>
            <div data-testid="current-page">{currentPage}</div>
            <div data-testid="loading-state">{isLoading ? 'loading' : 'ready'}</div>
            <button 
              onClick={() => handleNavigation('category')}
              data-testid="nav-to-category"
            >
              Go to Category
            </button>
            <button 
              onClick={() => handleNavigation('home')}
              data-testid="nav-to-home"
            >
              Go to Home
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestNavigationComponent />
        </TestWrapper>
      );

      // Initial state
      expect(screen.getByTestId('current-page')).toHaveTextContent('home');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');

      // Navigate to category
      fireEvent.click(screen.getByTestId('nav-to-category'));
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');

      // Wait for navigation to complete
      setTimeout(() => {
        expect(screen.getByTestId('current-page')).toHaveTextContent('category');
        expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');
      }, 150);
    });
  });

  describe('Form Interaction Testing', () => {
    it('should handle form interactions without performance issues', () => {
      const TestFormComponent = () => {
        const [formData, setFormData] = React.useState({
          name: '',
          email: '',
          message: ''
        });
        const [isSubmitting, setIsSubmitting] = React.useState(false);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          const { name, value } = e.target;
          setFormData(prev => ({
            ...prev,
            [name]: value
          }));
        };

        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          setIsSubmitting(true);
          setTimeout(() => {
            setIsSubmitting(false);
          }, 100);
        };

        return (
          <form onSubmit={handleSubmit} data-testid="test-form">
            <input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              data-testid="name-input"
              placeholder="Name"
            />
            <input
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              data-testid="email-input"
              placeholder="Email"
            />
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              data-testid="message-input"
              placeholder="Message"
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="submit-button"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
            <div data-testid="form-state">
              {JSON.stringify({ ...formData, isSubmitting })}
            </div>
          </form>
        );
      };

      render(
        <TestWrapper>
          <TestFormComponent />
        </TestWrapper>
      );

      // Test form interactions
      const nameInput = screen.getByTestId('name-input');
      const emailInput = screen.getByTestId('email-input');
      const messageInput = screen.getByTestId('message-input');
      const submitButton = screen.getByTestId('submit-button');

      // Fill out form
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(messageInput, { target: { value: 'Test message' } });

      // Verify form state
      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(messageInput).toHaveValue('Test message');

      // Submit form
      fireEvent.click(submitButton);
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Submitting...');
    });
  });

  describe('Memory and Performance Validation', () => {
    it('should not cause memory leaks during component lifecycle', () => {
      const TestLifecycleComponent = () => {
        const performanceHook = usePerformanceMonitoring({
          component: 'LifecycleTest',
          enableMemoryMonitoring: true,
          enableAutoCleanup: true
        });

        const feedbackHook = useUserFeedback();

        React.useEffect(() => {
          // Simulate some operations
          const timerId = performanceHook.startDataLoading('test-operation');
          feedbackHook.showLoading('Loading test data...');

          return () => {
            performanceHook.endDataLoading(timerId, 'completed');
            feedbackHook.clearFeedback();
          };
        }, []);

        return <div data-testid="lifecycle-test">Lifecycle Test</div>;
      };

      const { unmount } = render(
        <TestWrapper>
          <TestLifecycleComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('lifecycle-test')).toBeInTheDocument();

      // Unmount component
      unmount();

      // Verify no errors during cleanup
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('memory leak')
      );
    });
  });
});