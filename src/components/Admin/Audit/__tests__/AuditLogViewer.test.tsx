/**
 * Tests for Audit Log Viewer Component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditLogViewer } from '../AuditLogViewer';
import { RoleAuditService } from '@/services/roleAuditService';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/services/roleAuditService');
vi.mock('@/hooks/use-toast');

const mockToast = vi.fn();
(useToast as any).mockReturnValue({ toast: mockToast });

const mockAuditLogs = [
  {
    id: '1',
    action: 'role_change',
    resource_type: 'profile',
    resource_id: 'user-123',
    user_email: 'test@example.com',
    user_id: 'user-123',
    success: true,
    metadata: {
      old_role: 'reader',
      new_role: 'author',
      reason: 'Invitation registration'
    },
    created_at: '2023-01-01T00:00:00Z',
    ip_address: '192.168.1.1'
  },
  {
    id: '2',
    action: 'article_ownership_created',
    resource_type: 'article',
    resource_id: 'article-123',
    user_id: 'author-123',
    success: true,
    metadata: {
      article_id: 'article-123',
      author_id: 'author-123',
      reason: 'New article creation'
    },
    created_at: '2023-01-02T00:00:00Z'
  }
];

const mockStatistics = {
  totalEvents: 10,
  roleChanges: 5,
  articleOwnershipChanges: 3,
  articleReviews: 2,
  successfulEvents: 9,
  failedEvents: 1,
  uniqueUsers: 5,
  eventsByDay: {
    '2023-01-01': 5,
    '2023-01-02': 5
  }
};

describe('AuditLogViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (RoleAuditService.queryAuditLogs as any).mockResolvedValue(mockAuditLogs);
    (RoleAuditService.getAuditStatistics as any).mockResolvedValue(mockStatistics);
  });

  it('should render audit log viewer with statistics', async () => {
    render(<AuditLogViewer />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Total Events')).toBeInTheDocument();
    });

    // Check statistics cards
    expect(screen.getByText('10')).toBeInTheDocument(); // Total events
    expect(screen.getByText('5')).toBeInTheDocument(); // Role changes
    expect(screen.getByText('90%')).toBeInTheDocument(); // Success rate
    expect(screen.getByText('5')).toBeInTheDocument(); // Unique users
  });

  it('should render audit logs list', async () => {
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByText('role_change')).toBeInTheDocument();
    });

    // Check first log entry
    expect(screen.getByText('role_change')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('user-123')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();

    // Check second log entry
    expect(screen.getByText('article_ownership_created')).toBeInTheDocument();
    expect(screen.getByText('article-123')).toBeInTheDocument();
  });

  it('should handle filter changes', async () => {
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('User ID')).toBeInTheDocument();
    });

    // Change user ID filter
    const userIdInput = screen.getByPlaceholderText('User ID');
    fireEvent.change(userIdInput, { target: { value: 'user-123' } });

    // Apply filters
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(RoleAuditService.queryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123'
        })
      );
    });
  });

  it('should handle action filter selection', async () => {
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    // Open action select
    const actionSelect = screen.getByText('Action');
    fireEvent.click(actionSelect);

    // Select role change
    await waitFor(() => {
      expect(screen.getByText('Role Change')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Role Change'));

    // Apply filters
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(RoleAuditService.queryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'role_change'
        })
      );
    });
  });

  it('should handle date range filters', async () => {
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Start Date')).toBeInTheDocument();
    });

    // Set date filters
    const startDateInput = screen.getByPlaceholderText('Start Date');
    const endDateInput = screen.getByPlaceholderText('End Date');

    fireEvent.change(startDateInput, { target: { value: '2023-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2023-01-31' } });

    // Apply filters
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(RoleAuditService.queryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31')
        })
      );
    });
  });

  it('should clear filters', async () => {
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('User ID')).toBeInTheDocument();
    });

    // Set a filter
    const userIdInput = screen.getByPlaceholderText('User ID');
    fireEvent.change(userIdInput, { target: { value: 'user-123' } });

    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    // Check that input is cleared
    expect(userIdInput).toHaveValue('');

    await waitFor(() => {
      expect(RoleAuditService.queryAuditLogs).toHaveBeenCalledWith({
        limit: 50,
        offset: 0
      });
    });
  });

  it('should handle load more functionality', async () => {
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    // Click load more
    const loadMoreButton = screen.getByText('Load More');
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(RoleAuditService.queryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 50
        })
      );
    });
  });

  it('should handle loading states', async () => {
    // Mock loading state
    (RoleAuditService.queryAuditLogs as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    render(<AuditLogViewer />);

    // Should show loading message
    expect(screen.getByText('Loading audit logs...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('No audit logs found matching your criteria.')).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    (RoleAuditService.queryAuditLogs as any).mockRejectedValue(
      new Error('Failed to load logs')
    );

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive'
      });
    });
  });

  it('should display error messages for failed events', async () => {
    const logsWithError = [
      {
        ...mockAuditLogs[0],
        success: false,
        error_message: 'Database connection failed'
      }
    ];

    (RoleAuditService.queryAuditLogs as any).mockResolvedValue(logsWithError);

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });
  });

  it('should format metadata correctly', async () => {
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByText(/old_role: reader, new_role: author, reason: Invitation registration/)).toBeInTheDocument();
    });
  });
});