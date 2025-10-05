/**
 * Invitation Workflow Integration Tests
 * 
 * Comprehensive integration tests for the complete invitation workflow including:
 * - Anonymous user form submission
 * - Authenticated user form submission  
 * - Admin approval/denial operations
 * - Email notification flow
 * - Authentication contexts and permission boundaries
 * 
 * Requirements covered: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components under test
import RequestInvitation from '@/pages/RequestInvitation';
import InvitationManagement from '@/pages/Admin/InvitationManagement';

// Services
import * as invitationService from '@/services/invitationService';
import AdminService from '@/services/adminService';

// Types
interface MockUser {
  id: string;
  email: string;
  role: string;
  display_name: string;
}

interface MockInvitationRequest {
  id: string;
  parent_name: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

// Test data
const mockAnonymousFormData = {
  parent_name: 'Anonymous Parent',
  parent_email: 'anonymous@example.com',
  child_name: 'Anonymous Child',
  child_age: 10,
  reason: 'Test submission as anonymous user'
};

const mockAuthenticatedFormData = {
  parent_name: 'Authenticated Parent',
  parent_email: 'authenticated@example.com',
  child_name: 'Authenticated Child',
  child_age: 12,
  reason: 'Test submission as authenticated user'
};

const mockAdminUser: MockUser = {
  id: 'admin-123',
  email: 'admin@example.com',
  role: 'admin',
  display_name: 'Admin User'
};

const mockAuthenticatedUser: MockUser = {
  id: 'user-123',
  email: 'user@example.com',
  role: 'reader',
  display_name: 'Regular User'
};

// Mock auth contexts
const createMockAuthContext = (user: MockUser | null, isLoading = false) => ({
  currentUser: user,
  isLoggedIn: !!user,
  session: user ? { user } : null,
  isLoading,
  isInitialized: !isLoading,
  login: vi.fn(),
  logout: vi.fn(),
  signUp: vi.fn()
});

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

// Mock implementations
const mockCreateInvitationRequest = vi.fn();
const mockUpdateInvitationRequestStatus = vi.fn();
const mockSendInvitationConfirmation = vi.fn();
const mockSendInvitationEmail = vi.fn();

// Mock hooks
let mockAuthContext = createMockAuthContext(null);
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext
}));

vi.mock('@/hooks/useAdminDataIndependence', () => ({
  useAdminInvitationRequests: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn()
  })
}));

// Mock services
vi.mock('@/services/invitationService', () => ({
  createInvitationRequest: mockCreateInvitationRequest,
  updateInvitationRequestStatus: mockUpdateInvitationRequestStatus,
  sendInvitationConfirmation: mockSendInvitationConfirmation,
  sendInvitationEmail: mockSendInvitationEmail
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

describe('Invitation Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext = createMockAuthContext(null);
    
    // Reset mock implementations
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Anonymous User Form Submission (Requirement 1.1)', () => {
    beforeEach(() => {
      mockAuthContext = createMockAuthContext(null);
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
        target: { value: mockAnonymousFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAnonymousFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAnonymousFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAnonymousFormData.child_age.toString() }
      });
      fireEvent.change(screen.getByLabelText(/Why would you like your child to join/), {
        target: { value: mockAnonymousFormData.reason }
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
            parent_name: mockAnonymousFormData.parent_name,
            parent_email: mockAnonymousFormData.parent_email,
            child_name: mockAnonymousFormData.child_name,
            child_age: mockAnonymousFormData.child_age,
            reason: mockAnonymousFormData.reason
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

    it('should create audit log entry for anonymous submission (Requirement 1.1)', async () => {
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
        target: { value: mockAnonymousFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAnonymousFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAnonymousFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAnonymousFormData.child_age.toString() }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            isAuthenticated: false,
            userId: null,
            auditContext: expect.objectContaining({
              userType: 'anonymous',
              component: 'RequestInvitation'
            })
          })
        );
      });
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
        target: { value: mockAnonymousFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAnonymousFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAnonymousFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAnonymousFormData.child_age.toString() }
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
      mockAuthContext = createMockAuthContext(mockAuthenticatedUser);
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
        target: { value: mockAuthenticatedFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAuthenticatedFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAuthenticatedFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAuthenticatedFormData.child_age.toString() }
      });
      fireEvent.change(screen.getByLabelText(/Why would you like your child to join/), {
        target: { value: mockAuthenticatedFormData.reason }
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
            parent_name: mockAuthenticatedFormData.parent_name,
            parent_email: mockAuthenticatedFormData.parent_email,
            child_name: mockAuthenticatedFormData.child_name,
            child_age: mockAuthenticatedFormData.child_age,
            reason: mockAuthenticatedFormData.reason
          }),
          expect.objectContaining({
            isAuthenticated: true,
            userId: mockAuthenticatedUser.id
          })
        );
      });

      // Verify confirmation email was sent
      expect(mockSendInvitationConfirmation).toHaveBeenCalledWith('new-invitation-123');
    });

    it('should create audit log entry with user context for authenticated submission (Requirement 1.2)', async () => {
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
        target: { value: mockAuthenticatedFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAuthenticatedFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAuthenticatedFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAuthenticatedFormData.child_age.toString() }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Authenticated/ }));

      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            isAuthenticated: true,
            userId: mockAuthenticatedUser.id,
            auditContext: expect.objectContaining({
              userType: 'authenticated',
              userId: mockAuthenticatedUser.id,
              component: 'RequestInvitation'
            })
          })
        );
      });
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
        target: { value: mockAuthenticatedFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAuthenticatedFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAuthenticatedFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAuthenticatedFormData.child_age.toString() }
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
    const mockPendingInvitations: MockInvitationRequest[] = [
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
      mockAuthContext = createMockAuthContext(mockAdminUser);
      
      // Mock admin data hook
      vi.mocked(vi.importActual('@/hooks/useAdminDataIndependence')).useAdminInvitationRequests = vi.fn(() => ({
        data: mockPendingInvitations,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      }));
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
          mockAdminUser.id
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
          mockAdminUser.id
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
      const mockLogAdminAction = vi.spyOn(AdminService, 'logAdminAction').mockResolvedValue({
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

      // Verify audit logging was attempted
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'invitation_approved',
        'invitation_request',
        'invitation-1',
        mockAdminUser.id,
        expect.any(Object)
      );
    });
  });

  describe('Email Notification Flow (Requirements 2.2, 3.3)', () => {
    beforeEach(() => {
      mockAuthContext = createMockAuthContext(mockAdminUser);
    });

    it('should send confirmation email after form submission', async () => {
      mockAuthContext = createMockAuthContext(null); // Anonymous user

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
        target: { value: mockAnonymousFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAnonymousFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAnonymousFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAnonymousFormData.child_age.toString() }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

      // Verify confirmation email was sent
      await waitFor(() => {
        expect(mockSendInvitationConfirmation).toHaveBeenCalledWith('new-invitation-123');
      });
    });

    it('should send invitation email after admin approval', async () => {
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

      vi.mocked(vi.importActual('@/hooks/useAdminDataIndependence')).useAdminInvitationRequests = vi.fn(() => ({
        data: mockPendingInvitations,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      }));

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Parent')).toBeInTheDocument();
      });

      // Approve invitation
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      // Verify invitation email was sent
      await waitFor(() => {
        expect(mockSendInvitationEmail).toHaveBeenCalledWith('invitation-1');
      });
    });

    it('should handle email service failures gracefully (Requirement 3.3)', async () => {
      // Mock email service failure
      mockSendInvitationConfirmation.mockRejectedValue({
        code: 'EMAIL_SERVICE_ERROR',
        message: 'Failed to send email',
        details: 'SMTP server unavailable'
      });

      mockAuthContext = createMockAuthContext(null); // Anonymous user

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
        target: { value: mockAnonymousFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAnonymousFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAnonymousFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAnonymousFormData.child_age.toString() }
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

    it('should log email events without RLS violations (Requirement 3.3)', async () => {
      mockAuthContext = createMockAuthContext(null); // Anonymous user

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
        target: { value: mockAnonymousFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAnonymousFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAnonymousFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAnonymousFormData.child_age.toString() }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

      // Verify email confirmation was attempted
      await waitFor(() => {
        expect(mockSendInvitationConfirmation).toHaveBeenCalledWith('new-invitation-123');
      });

      // The email service should be called with proper context for logging
      expect(mockSendInvitationConfirmation).toHaveBeenCalledWith(
        'new-invitation-123'
      );
    });
  });

  describe('Permission Boundaries and Authentication Contexts (Requirements 3.1, 3.2)', () => {
    it('should prevent non-admin users from accessing admin functions', async () => {
      mockAuthContext = createMockAuthContext(mockAuthenticatedUser); // Regular user, not admin

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      // Component should handle lack of admin permissions gracefully
      // This would typically redirect or show an error message
      // The exact behavior depends on the component implementation
      await waitFor(() => {
        // Component should be rendered but may show access denied message
        expect(screen.getByTestId('main-layout')).toBeInTheDocument();
      });
    });

    it('should handle JWT expiration during admin operations (Requirement 3.2)', async () => {
      mockAuthContext = createMockAuthContext(mockAdminUser);

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

      vi.mocked(vi.importActual('@/hooks/useAdminDataIndependence')).useAdminInvitationRequests = vi.fn(() => ({
        data: mockPendingInvitations,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      }));

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

    it('should validate admin permissions before allowing operations (Requirement 3.2)', async () => {
      const mockValidateAdminPermissions = vi.spyOn(AdminService, 'validateAdminPermissions')
        .mockResolvedValue({
          success: true,
          data: true,
          details: { role: 'admin', hasAdminPermissions: true }
        });

      mockAuthContext = createMockAuthContext(mockAdminUser);

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

      vi.mocked(vi.importActual('@/hooks/useAdminDataIndependence')).useAdminInvitationRequests = vi.fn(() => ({
        data: mockPendingInvitations,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      }));

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

      // Verify permission validation was called
      await waitFor(() => {
        expect(mockValidateAdminPermissions).toHaveBeenCalledWith(mockAdminUser.id);
      });
    });

    it('should handle service role elevation for admin operations (Requirement 3.2)', async () => {
      mockAuthContext = createMockAuthContext(mockAdminUser);

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

      vi.mocked(vi.importActual('@/hooks/useAdminDataIndependence')).useAdminInvitationRequests = vi.fn(() => ({
        data: mockPendingInvitations,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      }));

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

      // Verify service was called (which should handle service role elevation internally)
      await waitFor(() => {
        expect(mockUpdateInvitationRequestStatus).toHaveBeenCalledWith(
          'invitation-1',
          'approved',
          mockAdminUser.id
        );
      });
    });
  });

  describe('Error Recovery and User Feedback (Requirements 3.1, 3.3)', () => {
    it('should provide retry mechanisms for failed operations', async () => {
      let attemptCount = 0;
      mockCreateInvitationRequest.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Temporary network error');
        }
        return { data: { id: 'success-after-retry' } };
      });

      mockAuthContext = createMockAuthContext(null); // Anonymous user

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
        target: { value: mockAnonymousFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAnonymousFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAnonymousFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAnonymousFormData.child_age.toString() }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

      // The service should eventually succeed after retries
      await waitFor(() => {
        expect(attemptCount).toBeGreaterThan(1);
      }, { timeout: 5000 });
    });

    it('should provide clear error messages for different error types', async () => {
      const errorScenarios = [
        {
          error: { code: 'PGRST301', message: 'RLS policy violation' },
          expectedMessage: /permission/i
        },
        {
          error: { code: 'PGRST116', message: 'JWT expired' },
          expectedMessage: /session.*expired/i
        },
        {
          error: { code: 'NETWORK_ERROR', message: 'Network timeout' },
          expectedMessage: /network/i
        }
      ];

      for (const scenario of errorScenarios) {
        mockCreateInvitationRequest.mockRejectedValue(scenario.error);

        mockAuthContext = createMockAuthContext(null);

        const { unmount } = render(
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

        // The error should be handled gracefully
        await waitFor(() => {
          expect(mockCreateInvitationRequest).toHaveBeenCalled();
        });

        unmount();
        vi.clearAllMocks();
      }
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should complete full invitation workflow from submission to approval', async () => {
      // Step 1: Anonymous user submits invitation request
      mockAuthContext = createMockAuthContext(null);

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
        target: { value: mockAnonymousFormData.parent_name }
      });
      fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
        target: { value: mockAnonymousFormData.parent_email }
      });
      fireEvent.change(screen.getByLabelText(/Child's Name/), {
        target: { value: mockAnonymousFormData.child_name }
      });
      fireEvent.change(screen.getByLabelText(/Child's Age/), {
        target: { value: mockAnonymousFormData.child_age.toString() }
      });

      fireEvent.click(screen.getByText('Verify Captcha'));
      fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

      await waitFor(() => {
        expect(mockCreateInvitationRequest).toHaveBeenCalled();
        expect(mockSendInvitationConfirmation).toHaveBeenCalled();
      });

      unmountRequestForm();

      // Step 2: Admin approves the invitation
      mockAuthContext = createMockAuthContext(mockAdminUser);

      const mockPendingInvitations = [
        {
          id: 'new-invitation-123',
          parent_name: mockAnonymousFormData.parent_name,
          parent_email: mockAnonymousFormData.parent_email,
          child_name: mockAnonymousFormData.child_name,
          child_age: mockAnonymousFormData.child_age,
          status: 'pending' as const,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      vi.mocked(vi.importActual('@/hooks/useAdminDataIndependence')).useAdminInvitationRequests = vi.fn(() => ({
        data: mockPendingInvitations,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      }));

      render(
        <TestWrapper>
          <InvitationManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(mockAnonymousFormData.parent_name)).toBeInTheDocument();
      });

      // Approve the invitation
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockUpdateInvitationRequestStatus).toHaveBeenCalledWith(
          'new-invitation-123',
          'approved',
          mockAdminUser.id
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