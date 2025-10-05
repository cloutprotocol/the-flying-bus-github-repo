/**
 * Error Handling Integration Tests
 * 
 * Tests the comprehensive error handling implementation with actual components
 * and services to ensure RLS policy violations, admin operations, and user feedback
 * work correctly in the real application context.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components to test
import RequestInvitation from '@/pages/RequestInvitation';
import InvitationManagement from '@/pages/Admin/InvitationManagement';
import { EnhancedUserFeedback } from '@/components/Common/EnhancedUserFeedback';

// Services and utilities
import * as invitationService from '@/services/invitationService';
import { detectRLSError, generateRLSErrorMessage } from '@/utils/errorHandling/rlsErrorHandler';
import { executeAdminOperationWithRetry } from '@/utils/errorHandling/adminRetryHandler';

// Mock auth context
const mockAuthContext = {
  currentUser: { id: 'test-user-id', email: 'test@example.com', role: 'admin' },
  isLoggedIn: true,
  session: { user: { id: 'test-user-id' } },
  isLoading: false,
  isInitialized: true
};

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext
}));

vi.mock('@/hooks/useAdminDataIndependence', () => ({
  useAdminInvitationRequests: () => ({
    data: [
      {
        id: 'test-invitation-1',
        parent_name: 'Test Parent',
        parent_email: 'parent@example.com',
        child_name: 'Test Child',
        child_age: 10,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn()
  })
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Error Handling Integration Tests', () => {
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    // Suppress console errors/warnings during tests
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    vi.clearAllMocks();
  });

  describe('RLS Error Detection', () => {
    it('should detect RLS policy violations correctly', () => {
      const rlsError = {
        code: 'PGRST301',
        message: 'Row Level Security policy violation',
        details: 'new row violates row-level security policy for table "invitation_requests"'
      };

      const context = {
        operation: 'form_submission' as const,
        table: 'invitation_requests',
        userId: 'test-user-id',
        isAuthenticated: true,
        component: 'RequestInvitation'
      };

      const detectedError = detectRLSError(rlsError, context);
      
      expect(detectedError).toBeTruthy();
      expect(detectedError?.code).toBe('RLS_POLICY_VIOLATION');
      expect(detectedError?.retryable).toBe(true);
      expect(detectedError?.category).toBe('rls_policy');
    });

    it('should generate user-friendly error messages for RLS violations', () => {
      const rlsError = {
        code: 'PGRST301',
        message: 'Row Level Security policy violation'
      };

      const context = {
        operation: 'form_submission' as const,
        table: 'invitation_requests',
        userId: 'test-user-id',
        isAuthenticated: true,
        component: 'RequestInvitation'
      };

      const userError = generateRLSErrorMessage(rlsError, context);
      
      expect(userError.title).toBe('Access Restricted');
      expect(userError.message).toContain('permission');
      expect(userError.nextSteps).toBeDefined();
      expect(userError.nextSteps!.length).toBeGreaterThan(0);
      expect(userError.retryable).toBe(true);
    });

    it('should handle JWT expiration errors', () => {
      const jwtError = {
        code: 'PGRST116',
        message: 'JWT expired'
      };

      const context = {
        operation: 'form_submission' as const,
        userId: 'test-user-id',
        isAuthenticated: true,
        component: 'RequestInvitation'
      };

      const detectedError = detectRLSError(jwtError, context);
      const userError = generateRLSErrorMessage(jwtError, context);
      
      expect(detectedError?.code).toBe('JWT_EXPIRED');
      expect(detectedError?.category).toBe('authentication');
      expect(userError.title).toBe('Authentication Required');
      expect(userError.message).toContain('session has expired');
    });
  });

  describe('Enhanced User Feedback Component', () => {
    it('should display error messages with retry options', () => {
      const mockFeedback = {
        type: 'error' as const,
        title: 'Permission Error',
        message: 'You don\'t have permission to perform this action.',
        details: 'RLS_POLICY_VIOLATION: Row Level Security policy violation',
        showRetry: true,
        retryLabel: 'Try Again',
        errorCode: 'RLS_POLICY_VIOLATION',
        errorCategory: 'rls_policy' as const,
        nextSteps: [
          'Verify you are logged in with the correct account',
          'Contact an administrator for access',
          'Try refreshing the page'
        ]
      };

      const mockOnRetry = vi.fn();

      render(
        <EnhancedUserFeedback
          feedback={mockFeedback}
          onRetry={mockOnRetry}
          showDetailsByDefault={true}
        />
      );

      // Check that error message is displayed
      expect(screen.getByText('Permission Error')).toBeInTheDocument();
      expect(screen.getByText('You don\'t have permission to perform this action.')).toBeInTheDocument();

      // Check that error code badge is displayed
      expect(screen.getByText('RLS_POLICY_VIOLATION')).toBeInTheDocument();

      // Check that retry button is displayed
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      // Test retry functionality
      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);

      // Check that next steps are displayed
      expect(screen.getByText('Verify you are logged in with the correct account')).toBeInTheDocument();
    });

    it('should display loading states with progress', () => {
      const mockFeedback = {
        type: 'loading' as const,
        message: 'Submitting your invitation request...',
        showProgress: true,
        progress: 50,
        estimatedTime: '15 seconds'
      };

      render(
        <EnhancedUserFeedback feedback={mockFeedback} />
      );

      expect(screen.getByText('Submitting your invitation request...')).toBeInTheDocument();
      expect(screen.getByText('50% complete')).toBeInTheDocument();
      expect(screen.getByText('15 seconds')).toBeInTheDocument();
    });

    it('should display success messages', () => {
      const mockFeedback = {
        type: 'success' as const,
        title: 'Success!',
        message: 'Your invitation request has been submitted successfully.',
        nextSteps: [
          'Check your email for confirmation',
          'You can close this page or continue browsing'
        ]
      };

      render(
        <EnhancedUserFeedback feedback={mockFeedback} />
      );

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Your invitation request has been submitted successfully.')).toBeInTheDocument();
      expect(screen.getByText('Check your email for confirmation')).toBeInTheDocument();
    });
  });

  describe('Form Submission Error Handling', () => {
    it('should handle form submission errors gracefully', async () => {
      // Mock the invitation service to throw an RLS error
      const mockCreateInvitationRequest = vi.spyOn(invitationService, 'createInvitationRequest')
        .mockRejectedValue({
          code: 'PGRST301',
          message: 'Row Level Security policy violation'
        });

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

      fireEvent.change(parentNameInput, { target: { value: 'Test Parent' } });
      fireEvent.change(parentEmailInput, { target: { value: 'parent@example.com' } });
      fireEvent.change(childNameInput, { target: { value: 'Test Child' } });
      fireEvent.change(childAgeInput, { target: { value: '10' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalled();
      });

      // The error should be handled gracefully and not crash the component
      expect(screen.getByText(/parent.*name/i)).toBeInTheDocument();
    });
  });

  describe('Admin Operation Error Handling', () => {
    it('should handle admin operation failures with retry mechanism', async () => {
      // Mock the invitation service to fail initially then succeed
      let callCount = 0;
      const mockUpdateInvitationRequestStatus = vi.spyOn(invitationService, 'updateInvitationRequestStatus')
        .mockImplementation(async () => {
          callCount++;
          if (callCount <= 2) {
            return {
              error: 'RLS policy violation',
              code: 'RLS_POLICY_VIOLATION',
              retryable: true
            };
          }
          return {
            data: { id: 'test-invitation-1', status: 'approved' }
          };
        });

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Test Parent')).toBeInTheDocument();
      });

      // Click approve button
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      // Wait for the operation to complete
      await waitFor(() => {
        expect(mockUpdateInvitationRequestStatus).toHaveBeenCalled();
      }, { timeout: 5000 });

      // The component should handle the error gracefully
      expect(screen.getByText('Test Parent')).toBeInTheDocument();
    });
  });

  describe('Admin Retry Mechanism', () => {
    it('should execute admin operations with retry and fallback', async () => {
      let attempts = 0;
      const mockPrimaryOperation = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts <= 2) {
          throw new Error(`Attempt ${attempts} failed - RLS policy violation`);
        }
        return { success: true, data: 'Primary operation succeeded' };
      });

      const mockFallbackOperation = vi.fn().mockResolvedValue({
        success: true,
        data: 'Fallback operation succeeded'
      });

      const retryContext = {
        operationId: 'test-operation',
        operation: 'testOperation',
        userId: 'test-admin-id',
        userRole: 'admin',
        isAuthenticated: true,
        component: 'TestComponent'
      };

      const result = await executeAdminOperationWithRetry(
        mockPrimaryOperation,
        retryContext,
        mockFallbackOperation,
        {
          maxAttempts: 3,
          enableFallback: true,
          fallbackAfterAttempts: 2,
          timeoutMs: 10000
        }
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(result.usedFallback).toBe(false); // Primary succeeded on 3rd attempt
      expect(mockPrimaryOperation).toHaveBeenCalledTimes(3);
    });

    it('should use fallback when primary operation consistently fails', async () => {
      const mockPrimaryOperation = vi.fn().mockRejectedValue(
        new Error('Persistent RLS policy violation')
      );

      const mockFallbackOperation = vi.fn().mockResolvedValue({
        success: true,
        data: 'Fallback operation succeeded'
      });

      const retryContext = {
        operationId: 'test-operation',
        operation: 'testOperation',
        userId: 'test-admin-id',
        userRole: 'admin',
        isAuthenticated: true,
        component: 'TestComponent'
      };

      const result = await executeAdminOperationWithRetry(
        mockPrimaryOperation,
        retryContext,
        mockFallbackOperation,
        {
          maxAttempts: 3,
          enableFallback: true,
          fallbackAfterAttempts: 2,
          timeoutMs: 10000
        }
      );

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(true);
      expect(result.fallbackReason).toContain('Permission Error');
      expect(mockPrimaryOperation).toHaveBeenCalledTimes(2);
      expect(mockFallbackOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should provide appropriate recovery actions for different error types', () => {
      const scenarios = [
        {
          error: { code: 'PGRST301', message: 'RLS policy violation' },
          context: { operation: 'form_submission' as const, component: 'RequestInvitation' },
          expectedActions: ['Try logging out and submitting as an anonymous user']
        },
        {
          error: { code: 'PGRST116', message: 'JWT expired' },
          context: { operation: 'admin_operation' as const, component: 'InvitationManagement' },
          expectedActions: ['Log out and log back in']
        },
        {
          error: { code: 'PGRST103', message: 'insufficient privilege' },
          context: { operation: 'admin_operation' as const, component: 'InvitationManagement' },
          expectedActions: ['Contact an administrator for elevated permissions']
        }
      ];

      scenarios.forEach(scenario => {
        const userError = generateRLSErrorMessage(scenario.error, scenario.context);
        
        expect(userError.nextSteps).toBeDefined();
        expect(userError.nextSteps!.length).toBeGreaterThan(0);
        
        // Check that at least one expected action is present
        const hasExpectedAction = scenario.expectedActions.some(expectedAction =>
          userError.nextSteps!.some(step => step.includes(expectedAction))
        );
        
        expect(hasExpectedAction).toBe(true);
      });
    });
  });
});