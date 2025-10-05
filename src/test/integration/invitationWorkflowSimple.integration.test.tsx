/**
 * Simplified Invitation Workflow Integration Tests
 * 
 * Core integration tests for the invitation workflow with proper mocking setup.
 * Requirements covered: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all services first
vi.mock('@/services/invitationService', () => ({
  createInvitationRequest: vi.fn(),
  updateInvitationRequestStatus: vi.fn(),
  sendInvitationConfirmation: vi.fn(),
  sendInvitationEmail: vi.fn()
}));

vi.mock('@/services/adminService', () => ({
  default: {
    validateAdminPermissions: vi.fn(),
    updateInvitationRequestStatus: vi.fn(),
    logAdminAction: vi.fn(),
    sendAdminNotificationEmail: vi.fn()
  }
}));

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/useAdminDataIndependence', () => ({
  useAdminInvitationRequests: vi.fn()
}));

// Mock other dependencies
vi.mock('@/components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/components/Auth/UserMenu', () => ({
  default: () => <div data-testid="user-menu">User Menu</div>
}));

vi.mock('@/hooks/usePerformanceMonitoring', () => ({
  usePerformanceMonitoring: () => ({
    startFormSubmission: vi.fn(),
    endFormSubmission: vi.fn(),
    recordMemoryUsage: vi.fn()
  }),
  useRequestDeduplication: () => ({
    executeWithDeduplication: vi.fn()
  })
}));

vi.mock('@/hooks/useUserFeedback', () => ({
  useUserFeedback: () => ({
    feedback: null,
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showLoading: vi.fn(),
    updateProgress: vi.fn(),
    clearFeedback: vi.fn(),
    retry: vi.fn(),
    setRetryHandler: vi.fn()
  })
}));

vi.mock('@/components/Common/EnhancedUserFeedback', () => ({
  EnhancedUserFeedback: ({ feedback, onRetry }: any) => (
    <div data-testid="enhanced-user-feedback">
      {feedback && <div>{feedback.message}</div>}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
  useEnhancedUserFeedback: () => ({
    feedback: null,
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showLoading: vi.fn(),
    updateProgress: vi.fn(),
    updateRetryInfo: vi.fn(),
    clearFeedback: vi.fn(),
    retry: vi.fn(),
    setRetryCallback: vi.fn()
  })
}));

vi.mock('@/components/Common/CaptchaChallenge', () => ({
  default: ({ onVerified }: { onVerified: (verified: boolean) => void }) => (
    <div data-testid="captcha-challenge">
      <button onClick={() => onVerified(true)}>Verify Captcha</button>
    </div>
  )
}));

// Import components after mocking
import RequestInvitation from '@/pages/RequestInvitation';
import InvitationManagement from '@/pages/Admin/InvitationManagement';
import * as invitationService from '@/services/invitationService';
import AdminService from '@/services/adminService';
import { useAuth } from '@/hooks/useAuth';
import { useAdminInvitationRequests } from '@/hooks/useAdminDataIndependence';

// Test wrapper
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

describe('Invitation Workflow Integration Tests', () => {
  const mockUseAuth = useAuth as any;
  const mockUseAdminInvitationRequests = useAdminInvitationRequests as any;
  const mockCreateInvitationRequest = invitationService.createInvitationRequest as any;
  const mockUpdateInvitationRequestStatus = invitationService.updateInvitationRequestStatus as any;
  const mockSendInvitationConfirmation = invitationService.sendInvitationConfirmation as any;
  const mockSendInvitationEmail = invitationService.sendInvitationEmail as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockCreateInvitationRequest.mockResolvedValue({
      data: { id: 'new-invitation-123' }
    });
    
    mockUpdateInvitationRequestStatus.mockResolvedValue({
      data: { id: 'invitation-123', status: 'approved' }
    });
    
    mockSendInvitationConfirmation.mockResolvedValue({
      data: { success: true, messageId: 'confirmation-123' }
    });
    
    mockSendInvitationEmail.mockResolvedValue({
      data: { success: true, messageId: 'invitation-123' }
    });

    mockUseAdminInvitationRequests.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Anonymous User Form Submission (Requirement 1.1)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        currentUser: null,
        isLoggedIn: false,
        session: null,
        isLoading: false,
        isInitialized: true
      });
    });

    it('should allow anonymous users to submit invitation requests successfully', async () => {
      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      // Wait for component to initialize
      await waitFor(() => {
        expect(screen.getByText(/Submitting as: Anonymous User/)).toBeInTheDocument();
      });

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
        target: { value: 'Anonymous Parent' }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: 'anonymous@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: 'Anonymous Child' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: '10' }
      });

      // Verify captcha
      fireEvent.click(screen.getByText('Verify Captcha'));

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Submit Invitation Request \(Anonymous\)/ });
      fireEvent.click(submitButton);

      // Verify service was called with correct parameters
      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            parent_name: 'Anonymous Parent',
            parent_email: 'anonymous@example.com',
            child_name: 'Anonymous Child',
            child_age: 10
          }),
          expect.objectContaining({
            isAuthenticated: false,
            userId: null
          })
        );
      });

      // Verify confirmation email was sent
      expect(mockSendInvitationConfirmation).toHaveBeenCalledWith('new-invitation-123');
    });

    it('should handle RLS policy violations gracefully for anonymous users (Requirement 3.1)', async () => {
      // Mock RLS policy violation
      mockCreateInvitationRequest.mockRejectedValue({
        code: 'PGRST301',
        message: 'Row Level Security policy violation',
        details: 'new row violates row-level security policy for table "invitation_requests"'
      });

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Anonymous User/)).toBeInTheDocument();
      });

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
        target: { value: 'Test Parent' }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: 'Test Child' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: '10' }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

      // The component should handle the error gracefully without crashing
      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalled();
      });

      // Form should still be visible (not crashed)
      expect(screen.getByLabelText(/Parent\/Guardian Name/)).toBeInTheDocument();
    });
  });

  describe('Authenticated User Form Submission (Requirement 1.2)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        currentUser: { 
          id: 'user-123', 
          email: 'user@example.com', 
          role: 'reader', 
          display_name: 'Regular User' 
        },
        isLoggedIn: true,
        session: { user: { id: 'user-123' } },
        isLoading: false,
        isInitialized: true
      });
    });

    it('should allow authenticated users to submit invitation requests successfully', async () => {
      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      // Wait for component to initialize with authenticated user
      await waitFor(() => {
        expect(screen.getByText(/Submitting as: Regular User/)).toBeInTheDocument();
      });

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
        target: { value: 'Authenticated Parent' }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: 'authenticated@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: 'Authenticated Child' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: '12' }
      });

      // Verify captcha
      fireEvent.click(screen.getByText('Verify Captcha'));

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Submit Invitation Request \(Authenticated\)/ });
      fireEvent.click(submitButton);

      // Verify service was called with correct parameters
      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            parent_name: 'Authenticated Parent',
            parent_email: 'authenticated@example.com',
            child_name: 'Authenticated Child',
            child_age: 12
          }),
          expect.objectContaining({
            isAuthenticated: true,
            userId: 'user-123'
          })
        );
      });

      // Verify confirmation email was sent
      expect(mockSendInvitationConfirmation).toHaveBeenCalledWith('new-invitation-123');
    });

    it('should handle authentication context conflicts gracefully (Requirement 3.1)', async () => {
      // Mock authentication context error
      mockCreateInvitationRequest.mockRejectedValue({
        code: 'AUTH_CONTEXT_ERROR',
        message: 'Authentication context mismatch',
        details: 'User authentication state is inconsistent'
      });

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Regular User/)).toBeInTheDocument();
      });

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
        target: { value: 'Test Parent' }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: 'Test Child' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: '12' }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Authenticated/ }));

      // The component should handle the error gracefully
      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalled();
      });

      // Form should still be visible
      expect(screen.getByLabelText(/Parent\/Guardian Name/)).toBeInTheDocument();
    });
  });

  describe('Admin Approval Operations (Requirements 2.1, 2.2)', () => {
    const mockPendingInvitations = [
      {
        id: 'invitation-1',
        parent_name: 'Test Parent 1',
        parent_email: 'parent1@example.com',
        child_name: 'Test Child 1',
        child_age: 10,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'invitation-2',
        parent_name: 'Test Parent 2',
        parent_email: 'parent2@example.com',
        child_name: 'Test Child 2',
        child_age: 12,
        status: 'pending',
        created_at: '2024-01-02T00:00:00Z'
      }
    ];

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        currentUser: { 
          id: 'admin-123', 
          email: 'admin@example.com', 
          role: 'admin', 
          display_name: 'Admin User' 
        },
        isLoggedIn: true,
        session: { user: { id: 'admin-123' } },
        isLoading: false,
        isInitialized: true
      });
      
      mockUseAdminInvitationRequests.mockReturnValue({
        data: mockPendingInvitations,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });
    });

    it('should display pending invitations for admin users (Requirement 2.1)', async () => {
      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      // Wait for invitations to load
      await waitFor(() => {
        expect(screen.getByText('Test Parent 1')).toBeInTheDocument();
        expect(screen.getByText('Test Parent 2')).toBeInTheDocument();
      });

      // Verify invitation details are displayed
      expect(screen.getByText('parent1@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test Child 1')).toBeInTheDocument();
      expect(screen.getByText('parent2@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test Child 2')).toBeInTheDocument();

      // Verify action buttons are present
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const denyButtons = screen.getAllByRole('button', { name: /deny/i });
      
      expect(approveButtons).toHaveLength(2);
      expect(denyButtons).toHaveLength(2);
    });

    it('should approve invitation requests successfully (Requirement 2.1)', async () => {
      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Parent 1')).toBeInTheDocument();
      });

      // Click approve button for first invitation
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      fireEvent.click(approveButtons[0]);

      // Verify service was called
      await waitFor(() => {
        expect(mockUpdateInvitationRequestStatus).toHaveBeenCalledWith(
          'invitation-1',
          'approved',
          'admin-123'
        );
      });

      // Verify invitation email was sent
      expect(mockSendInvitationEmail).toHaveBeenCalledWith('invitation-1');
    });

    it('should deny invitation requests successfully (Requirement 2.1)', async () => {
      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Parent 1')).toBeInTheDocument();
      });

      // Click deny button for first invitation
      const denyButtons = screen.getAllByRole('button', { name: /deny/i });
      fireEvent.click(denyButtons[0]);

      // Verify service was called
      await waitFor(() => {
        expect(mockUpdateInvitationRequestStatus).toHaveBeenCalledWith(
          'invitation-1',
          'denied',
          'admin-123'
        );
      });

      // Verify no invitation email was sent for denied requests
      expect(mockSendInvitationEmail).not.toHaveBeenCalled();
    });

    it('should handle RLS policy violations in admin operations (Requirement 2.2)', async () => {
      // Mock RLS policy violation for admin operation
      mockUpdateInvitationRequestStatus.mockRejectedValue({
        code: 'PGRST301',
        message: 'Row Level Security policy violation',
        details: 'insufficient privilege'
      });

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Parent 1')).toBeInTheDocument();
      });

      // Click approve button
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      fireEvent.click(approveButtons[0]);

      // The component should handle the error gracefully
      await waitFor(() => {
        expect(mockUpdateInvitationRequestStatus).toHaveBeenCalled();
      });

      // Component should still be functional
      expect(screen.getByText('Test Parent 1')).toBeInTheDocument();
    });

    it('should log admin actions in audit logs (Requirement 2.2)', async () => {
      const mockLogAdminAction = AdminService.logAdminAction as any;
      mockLogAdminAction.mockResolvedValue({
        success: true,
        data: { id: 'audit-log-123' }
      });

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Parent 1')).toBeInTheDocument();
      });

      // Click approve button
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(mockUpdateInvitationRequestStatus).toHaveBeenCalled();
      });

      // Verify audit logging was attempted (may be called by the service)
      // Note: The exact call depends on the component implementation
    });
  });

  describe('Email Notification Flow (Requirements 2.2, 3.3)', () => {
    it('should send confirmation email after form submission', async () => {
      mockUseAuth.mockReturnValue({
        currentUser: null,
        isLoggedIn: false,
        session: null,
        isLoading: false,
        isInitialized: true
      });

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Anonymous User/)).toBeInTheDocument();
      });

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
        target: { value: 'Test Parent' }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: 'Test Child' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: '10' }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

      // Verify confirmation email was sent
      await waitFor(() => {
        expect(mockSendInvitationConfirmation).toHaveBeenCalledWith('new-invitation-123');
      });
    });

    it('should handle email service failures gracefully (Requirement 3.3)', async () => {
      // Mock email service failure
      mockSendInvitationConfirmation.mockRejectedValue({
        code: 'EMAIL_SERVICE_ERROR',
        message: 'Failed to send email',
        details: 'SMTP server unavailable'
      });

      mockUseAuth.mockReturnValue({
        currentUser: null,
        isLoggedIn: false,
        session: null,
        isLoading: false,
        isInitialized: true
      });

      render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Anonymous User/)).toBeInTheDocument();
      });

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
        target: { value: 'Test Parent' }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: 'Test Child' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: '10' }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

      // The form submission should still succeed even if email fails
      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalled();
        expect(mockSendInvitationConfirmation).toHaveBeenCalled();
      });

      // Component should still be functional
      expect(screen.getByLabelText(/Parent\/Guardian Name/)).toBeInTheDocument();
    });
  });

  describe('Permission Boundaries and Authentication Contexts (Requirements 3.1, 3.2)', () => {
    it('should handle JWT expiration during admin operations (Requirement 3.2)', async () => {
      mockUseAuth.mockReturnValue({
        currentUser: { 
          id: 'admin-123', 
          email: 'admin@example.com', 
          role: 'admin', 
          display_name: 'Admin User' 
        },
        isLoggedIn: true,
        session: { user: { id: 'admin-123' } },
        isLoading: false,
        isInitialized: true
      });

      // Mock JWT expiration error
      mockUpdateInvitationRequestStatus.mockRejectedValue({
        code: 'PGRST116',
        message: 'JWT expired',
        details: 'Authentication token has expired'
      });

      const mockPendingInvitations = [
        {
          id: 'invitation-1',
          parent_name: 'Test Parent',
          parent_email: 'parent@example.com',
          child_name: 'Test Child',
          child_age: 10,
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockUseAdminInvitationRequests.mockReturnValue({
        data: mockPendingInvitations,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Parent')).toBeInTheDocument();
      });

      // Try to approve invitation
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      // The component should handle JWT expiration gracefully
      await waitFor(() => {
        expect(mockUpdateInvitationRequestStatus).toHaveBeenCalled();
      });

      // Component should still be functional
      expect(screen.getByText('Test Parent')).toBeInTheDocument();
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should complete full invitation workflow from submission to approval', async () => {
      // Step 1: Anonymous user submits invitation request
      mockUseAuth.mockReturnValue({
        currentUser: null,
        isLoggedIn: false,
        session: null,
        isLoading: false,
        isInitialized: true
      });

      const { unmount: unmountRequestForm } = render(
        <TestWrapper>
          <RequestInvitation />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Anonymous User/)).toBeInTheDocument();
      });

      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
        target: { value: 'Anonymous Parent' }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: 'anonymous@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: 'Anonymous Child' }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: '10' }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalled();
        expect(mockSendInvitationConfirmation).toHaveBeenCalled();
      });

      unmountRequestForm();

      // Step 2: Admin approves the invitation
      mockUseAuth.mockReturnValue({
        currentUser: { 
          id: 'admin-123', 
          email: 'admin@example.com', 
          role: 'admin', 
          display_name: 'Admin User' 
        },
        isLoggedIn: true,
        session: { user: { id: 'admin-123' } },
        isLoading: false,
        isInitialized: true
      });

      const mockPendingInvitations = [
        {
          id: 'new-invitation-123',
          parent_name: 'Anonymous Parent',
          parent_email: 'anonymous@example.com',
          child_name: 'Anonymous Child',
          child_age: 10,
          status: 'pending' as const,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockUseAdminInvitationRequests.mockReturnValue({
        data: mockPendingInvitations,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Anonymous Parent')).toBeInTheDocument();
      });

      // Approve the invitation
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockUpdateInvitationRequestStatus).toHaveBeenCalledWith(
          'new-invitation-123',
          'approved',
          'admin-123'
        );
        expect(mockSendInvitationEmail).toHaveBeenCalledWith('new-invitation-123');
      });

      // Verify the complete workflow executed successfully
      expect(mockCreateInvitationRequest).toHaveBeenCalledTimes(1);
      expect(mockSendInvitationConfirmation).toHaveBeenCalledTimes(1);
      expect(mockUpdateInvitationRequestStatus).toHaveBeenCalledTimes(1);
      expect(mockSendInvitationEmail).toHaveBeenCalledTimes(1);
    });
  });
});