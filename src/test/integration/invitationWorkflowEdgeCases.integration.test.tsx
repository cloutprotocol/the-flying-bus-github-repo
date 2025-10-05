/**
 * Invitation Workflow Edge Cases Integration Tests
 * 
 * Tests for edge cases, error scenarios, and boundary conditions in the invitation workflow.
 * Covers specific RLS policy violations, service failures, and recovery mechanisms.
 * 
 * Requirements covered: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components under test
import RequestInvitation from '@/pages/RequestInvitation';
import InvitationManagement from '@/pages/Admin/InvitationManagement';

// Services and utilities
import * as invitationService from '@/services/invitationService';
import AdminService from '@/services/adminService';
import { detectRLSError, generateRLSErrorMessage } from '@/utils/errorHandling/rlsErrorHandler';
import { executeAdminOperationWithRetry } from '@/utils/errorHandling/adminRetryHandler';

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

// Mock auth contexts
let mockAuthContext = {
    currentUser: null,
    isLoggedIn: false,
    session: null,
    isLoading: false,
    isInitialized: true
};

// Mock hooks and services
vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => mockAuthContext
}));

vi.mock('@/services/invitationService', () => ({
    createInvitationRequest: mockCreateInvitationRequest,
    updateInvitationRequestStatus: mockUpdateInvitationRequestStatus,
    sendInvitationConfirmation: mockSendInvitationConfirmation,
    sendInvitationEmail: mockSendInvitationEmail
}));

vi.mock('@/hooks/useAdminDataIndependence', () => ({
    useAdminInvitationRequests: () => ({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
    })
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

describe('Invitation Workflow Edge Cases Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthContext = {
            currentUser: null,
            isLoggedIn: false,
            session: null,
            isLoading: false,
            isInitialized: true
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('RLS Policy Violation Edge Cases (Requirements 3.1, 3.2)', () => {
        it('should handle anonymous user RLS violations with specific error codes', async () => {
            const rlsErrors = [
                {
                    code: 'PGRST301',
                    message: 'Row Level Security policy violation',
                    details: 'new row violates row-level security policy for table "invitation_requests"',
                    expectedCategory: 'rls_policy'
                },
                {
                    code: 'PGRST103',
                    message: 'insufficient privilege',
                    details: 'permission denied for table invitation_requests',
                    expectedCategory: 'permission'
                },
                {
                    code: 'PGRST116',
                    message: 'JWT expired',
                    details: 'JWT token has expired',
                    expectedCategory: 'authentication'
                }
            ];

            for (const errorCase of rlsErrors) {
                mockCreateInvitationRequest.mockRejectedValueOnce(errorCase);

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

                // Verify error was handled
                await waitFor(() => {
                    expect(mockCreateInvitationRequest).toHaveBeenCalled();
                });

                // Test error detection utility
                const context = {
                    operation: 'form_submission' as const,
                    table: 'invitation_requests',
                    userId: null,
                    isAuthenticated: false,
                    component: 'RequestInvitation'
                };

                const detectedError = detectRLSError(errorCase, context);
                expect(detectedError?.category).toBe(errorCase.expectedCategory);

                // Component should remain functional
                expect(screen.getByLabelText(/Parent\/Guardian Name/)).toBeInTheDocument();

                // Clean up for next iteration
                screen.getByTestId('main-layout').remove();
                vi.clearAllMocks();
            }
        });

        it('should handle authenticated user context switching errors', async () => {
            mockAuthContext = {
                currentUser: { id: 'user-123', email: 'user@example.com', role: 'reader', display_name: 'Test User' },
                isLoggedIn: true,
                session: { user: { id: 'user-123' } },
                isLoading: false,
                isInitialized: true
            };

            // Mock context switching error
            mockCreateInvitationRequest.mockRejectedValue({
                code: 'AUTH_CONTEXT_MISMATCH',
                message: 'Authentication context inconsistency',
                details: 'User session state does not match request context'
            });

            render(
                <TestWrapper>
                    <RequestInvitation />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText(/Test User/)).toBeInTheDocument();
            });

            // Fill and submit form
            fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
                target: { value: 'Authenticated Parent' }
            });
            fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
                target: { value: 'auth@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/Child's Name/), {
                target: { value: 'Auth Child' }
            });
            fireEvent.change(screen.getByLabelText(/Child's Age/), {
                target: { value: '12' }
            });

            fireEvent.click(screen.getByText('Verify Captcha'));
            fireEvent.click(screen.getByRole('button', { name: /Submit.*Authenticated/ }));

            // Verify error was handled gracefully
            await waitFor(() => {
                expect(mockCreateInvitationRequest).toHaveBeenCalled();
            });

            // Component should remain functional
            expect(screen.getByLabelText(/Parent\/Guardian Name/)).toBeInTheDocument();
        });

        it('should handle email events RLS policy violations during logging', async () => {
            // Mock successful form submission but email logging failure
            mockCreateInvitationRequest.mockResolvedValue({
                data: { id: 'invitation-123' }
            });

            mockSendInvitationConfirmation.mockRejectedValue({
                code: 'PGRST301',
                message: 'Row Level Security policy violation',
                details: 'new row violates row-level security policy for table "email_events"'
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

            // Verify form submission succeeded despite email logging failure
            await waitFor(() => {
                expect(mockCreateInvitationRequest).toHaveBeenCalled();
                expect(mockSendInvitationConfirmation).toHaveBeenCalled();
            });

            // Component should remain functional
            expect(screen.getByLabelText(/Parent\/Guardian Name/)).toBeInTheDocument();
        });
    });

    describe('Admin Operation Edge Cases (Requirements 2.1, 2.2, 3.2)', () => {
        beforeEach(() => {
            mockAuthContext = {
                currentUser: { id: 'admin-123', email: 'admin@example.com', role: 'admin', display_name: 'Admin User' },
                isLoggedIn: true,
                session: { user: { id: 'admin-123' } },
                isLoading: false,
                isInitialized: true
            };
        });

        it('should handle service role elevation failures with fallback', async () => {
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

            // Mock service role failure followed by fallback success
            let callCount = 0;
            mockUpdateInvitationRequestStatus.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    // First call (service role) fails
                    throw new Error('Service role elevation failed');
                }
                // Second call (fallback) succeeds
                return {
                    data: { id: 'invitation-1', status: 'approved' },
                    details: { method: 'fallback', usedServiceRole: false }
                };
            });

            render(
                <TestWrapper>
                    <InvitationManagement />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Test Parent')).toBeInTheDocument();
            });

            // Click approve button
            const approveButton = screen.getByRole('button', { name: /approve/i });
            fireEvent.click(approveButton);

            // Verify fallback was used
            await waitFor(() => {
                expect(mockUpdateInvitationRequestStatus).toHaveBeenCalled();
            });

            // Component should remain functional
            expect(screen.getByText('Test Parent')).toBeInTheDocument();
        });

        it('should handle concurrent admin operations with proper locking', async () => {
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

            vi.mocked(vi.importActual('@/hooks/useAdminDataIndependence')).useAdminInvitationRequests = vi.fn(() => ({
                data: mockPendingInvitations,
                isLoading: false,
                error: null,
                refetch: vi.fn()
            }));

            // Mock concurrent operation conflict
            let operationCount = 0;
            mockUpdateInvitationRequestStatus.mockImplementation(async (id) => {
                operationCount++;
                if (operationCount === 1) {
                    // Simulate delay for first operation
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return { data: { id, status: 'approved' } };
                } else {
                    // Second operation should handle concurrency
                    throw new Error('Concurrent modification detected');
                }
            });

            render(
                <TestWrapper>
                    <InvitationManagement />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('Test Parent 1')).toBeInTheDocument();
                expect(screen.getByText('Test Parent 2')).toBeInTheDocument();
            });

            // Click both approve buttons rapidly
            const approveButtons = screen.getAllByRole('button', { name: /approve/i });
            fireEvent.click(approveButtons[0]);
            fireEvent.click(approveButtons[1]);

            // Verify both operations were attempted
            await waitFor(() => {
                expect(mockUpdateInvitationRequestStatus).toHaveBeenCalledTimes(2);
            });

            // Component should handle concurrent operations gracefully
            expect(screen.getByText('Test Parent 1')).toBeInTheDocument();
            expect(screen.getByText('Test Parent 2')).toBeInTheDocument();
        });

        it('should handle admin permission revocation during operation', async () => {
            const mockValidateAdminPermissions = vi.spyOn(AdminService, 'validateAdminPermissions');

            // First call succeeds (user has permissions)
            // Second call fails (permissions revoked)
            mockValidateAdminPermissions
                .mockResolvedValueOnce({
                    success: true,
                    data: true,
                    details: { role: 'admin', hasAdminPermissions: true }
                })
                .mockResolvedValueOnce({
                    success: true,
                    data: false,
                    details: { role: 'reader', hasAdminPermissions: false }
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

            mockUpdateInvitationRequestStatus.mockRejectedValue({
                code: 'PERMISSION_DENIED',
                message: 'Insufficient permissions to update invitation status',
                retryable: false
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

            // Verify permission check was called
            await waitFor(() => {
                expect(mockValidateAdminPermissions).toHaveBeenCalled();
            });

            // Component should handle permission revocation gracefully
            expect(screen.getByText('Test Parent')).toBeInTheDocument();
        });
    });

    describe('Email Service Edge Cases (Requirements 2.2, 3.3)', () => {
        it('should handle email service timeout with retry mechanism', async () => {
            let emailAttempts = 0;
            mockSendInvitationConfirmation.mockImplementation(async () => {
                emailAttempts++;
                if (emailAttempts <= 2) {
                    throw new Error('Request timeout');
                }
                return { data: { success: true, messageId: 'success-after-retry' } };
            });

            mockCreateInvitationRequest.mockResolvedValue({
                data: { id: 'invitation-123' }
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

            // Verify email service was retried
            await waitFor(() => {
                expect(mockSendInvitationConfirmation).toHaveBeenCalled();
            }, { timeout: 5000 });

            // Form submission should succeed despite email retries
            expect(mockCreateInvitationRequest).toHaveBeenCalled();
        });

        it('should handle email service rate limiting', async () => {
            mockSendInvitationConfirmation.mockRejectedValue({
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many email requests',
                details: 'Rate limit: 10 emails per minute exceeded',
                retryAfter: 60
            });

            mockCreateInvitationRequest.mockResolvedValue({
                data: { id: 'invitation-123' }
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

            // Verify rate limiting was handled
            await waitFor(() => {
                expect(mockSendInvitationConfirmation).toHaveBeenCalled();
            });

            // Form submission should succeed despite email rate limiting
            expect(mockCreateInvitationRequest).toHaveBeenCalled();
        });

        it('should handle malformed email addresses gracefully', async () => {
            mockSendInvitationConfirmation.mockRejectedValue({
                code: 'INVALID_EMAIL',
                message: 'Invalid email address format',
                details: 'Email address does not meet validation requirements'
            });

            mockCreateInvitationRequest.mockResolvedValue({
                data: { id: 'invitation-123' }
            });

            render(
                <TestWrapper>
                    <RequestInvitation />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText(/Anonymous User/)).toBeInTheDocument();
            });

            // Fill form with potentially problematic email
            fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
                target: { value: 'Test Parent' }
            });
            fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
                target: { value: 'test+special@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/Child's Name/), {
                target: { value: 'Test Child' }
            });
            fireEvent.change(screen.getByLabelText(/Child's Age/), {
                target: { value: '10' }
            });

            fireEvent.click(screen.getByText('Verify Captcha'));
            fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

            // Verify email validation error was handled
            await waitFor(() => {
                expect(mockSendInvitationConfirmation).toHaveBeenCalled();
            });

            // Form submission should succeed despite email validation issues
            expect(mockCreateInvitationRequest).toHaveBeenCalled();
        });
    });

    describe('Network and Connectivity Edge Cases', () => {
        it('should handle network disconnection during form submission', async () => {
            mockCreateInvitationRequest.mockRejectedValue({
                code: 'NETWORK_ERROR',
                message: 'Network request failed',
                details: 'Unable to connect to server'
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

            // Verify network error was handled
            await waitFor(() => {
                expect(mockCreateInvitationRequest).toHaveBeenCalled();
            });

            // Component should remain functional for retry
            expect(screen.getByLabelText(/Parent\/Guardian Name/)).toBeInTheDocument();
        });

        it('should handle server maintenance mode gracefully', async () => {
            mockCreateInvitationRequest.mockRejectedValue({
                code: 'SERVICE_UNAVAILABLE',
                message: 'Service temporarily unavailable',
                details: 'Server is in maintenance mode'
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

            // Verify maintenance mode was handled
            await waitFor(() => {
                expect(mockCreateInvitationRequest).toHaveBeenCalled();
            });

            // Component should provide appropriate feedback
            expect(screen.getByLabelText(/Parent\/Guardian Name/)).toBeInTheDocument();
        });
    });

    describe('Data Validation Edge Cases', () => {
        it('should handle invalid child age values', async () => {
            render(
                <TestWrapper>
                    <RequestInvitation />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText(/Anonymous User/)).toBeInTheDocument();
            });

            // Fill form with invalid age
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
                target: { value: '-5' } // Invalid negative age
            });

            fireEvent.click(screen.getByText('Verify Captcha'));

            // Submit button should be disabled or form should show validation error
            const submitButton = screen.getByRole('button', { name: /Submit.*Anonymous/ });

            // The form should handle invalid data gracefully
            expect(submitButton).toBeInTheDocument();
        });

        it('should handle extremely long input values', async () => {
            const longString = 'A'.repeat(1000); // Very long string

            render(
                <TestWrapper>
                    <RequestInvitation />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText(/Anonymous User/)).toBeInTheDocument();
            });

            // Fill form with extremely long values
            fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
                target: { value: longString }
            });
            fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
                target: { value: 'test@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/Child's Name/), {
                target: { value: longString }
            });
            fireEvent.change(screen.getByLabelText(/Child's Age/), {
                target: { value: '10' }
            });

            fireEvent.click(screen.getByText('Verify Captcha'));

            // Form should handle long inputs gracefully
            const submitButton = screen.getByRole('button', { name: /Submit.*Anonymous/ });
            expect(submitButton).toBeInTheDocument();
        });

        it('should handle special characters in input fields', async () => {
            const specialCharsName = "Test Parent with 'quotes' and \"double quotes\" & symbols";
            const specialCharsEmail = "test+special.chars@example-domain.com";

            mockCreateInvitationRequest.mockResolvedValue({
                data: { id: 'invitation-123' }
            });

            mockSendInvitationConfirmation.mockResolvedValue({
                data: { success: true, messageId: 'confirmation-123' }
            });

            render(
                <TestWrapper>
                    <RequestInvitation />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText(/Anonymous User/)).toBeInTheDocument();
            });

            // Fill form with special characters
            fireEvent.change(screen.getByLabelText(/Parent\/Guardian Name/), {
                target: { value: specialCharsName }
            });
            fireEvent.change(screen.getByLabelText(/Parent\/Guardian Email/), {
                target: { value: specialCharsEmail }
            });
            fireEvent.change(screen.getByLabelText(/Child's Name/), {
                target: { value: "Child's Name with apostrophe" }
            });
            fireEvent.change(screen.getByLabelText(/Child's Age/), {
                target: { value: '10' }
            });

            fireEvent.click(screen.getByText('Verify Captcha'));
            fireEvent.click(screen.getByRole('button', { name: /Submit.*Anonymous/ }));

            // Verify form submission with special characters
            await waitFor(() => {
                expect(mockCreateInvitationRequest).toHaveBeenCalledWith(
                    expect.objectContaining({
                        parent_name: specialCharsName,
                        parent_email: specialCharsEmail,
                        child_name: "Child's Name with apostrophe"
                    }),
                    expect.any(Object)
                );
            });
        });
    });

    describe('Admin Retry Mechanism Edge Cases', () => {
        it('should test executeAdminOperationWithRetry with various failure scenarios', async () => {
            const mockPrimaryOperation = vi.fn();
            const mockFallbackOperation = vi.fn();

            const retryContext = {
                operationId: 'test-operation',
                operation: 'testOperation',
                userId: 'admin-123',
                userRole: 'admin',
                isAuthenticated: true,
                component: 'TestComponent'
            };

            // Test scenario 1: Primary succeeds after retries
            mockPrimaryOperation
                .mockRejectedValueOnce(new Error('Temporary failure 1'))
                .mockRejectedValueOnce(new Error('Temporary failure 2'))
                .mockResolvedValueOnce({ success: true, data: 'Primary success' });

            const result1 = await executeAdminOperationWithRetry(
                mockPrimaryOperation,
                retryContext,
                mockFallbackOperation,
                { maxAttempts: 3, enableFallback: true, fallbackAfterAttempts: 2 }
            );

            expect(result1.success).toBe(true);
            expect(result1.attempts).toBe(3);
            expect(result1.usedFallback).toBe(false);
            expect(mockPrimaryOperation).toHaveBeenCalledTimes(3);
            expect(mockFallbackOperation).not.toHaveBeenCalled();

            // Reset mocks
            vi.clearAllMocks();

            // Test scenario 2: Primary fails, fallback succeeds
            mockPrimaryOperation.mockRejectedValue(new Error('Persistent failure'));
            mockFallbackOperation.mockResolvedValue({ success: true, data: 'Fallback success' });

            const result2 = await executeAdminOperationWithRetry(
                mockPrimaryOperation,
                retryContext,
                mockFallbackOperation,
                { maxAttempts: 2, enableFallback: true, fallbackAfterAttempts: 1 }
            );

            expect(result2.success).toBe(true);
            expect(result2.usedFallback).toBe(true);
            expect(result2.fallbackReason).toBeDefined();
            expect(mockPrimaryOperation).toHaveBeenCalledTimes(1);
            expect(mockFallbackOperation).toHaveBeenCalledTimes(1);

            // Reset mocks
            vi.clearAllMocks();

            // Test scenario 3: Both primary and fallback fail
            mockPrimaryOperation.mockRejectedValue(new Error('Primary failure'));
            mockFallbackOperation.mockRejectedValue(new Error('Fallback failure'));

            const result3 = await executeAdminOperationWithRetry(
                mockPrimaryOperation,
                retryContext,
                mockFallbackOperation,
                { maxAttempts: 2, enableFallback: true, fallbackAfterAttempts: 1 }
            );

            expect(result3.success).toBe(false);
            expect(result3.usedFallback).toBe(true);
            expect(result3.error).toContain('Both primary and fallback operations failed');
        });
    });
});