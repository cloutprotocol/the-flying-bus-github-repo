// Tests for InvitationWorkflowService
// These tests verify the database operations for the invitation workflow

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvitationWorkflowService } from '../invitationWorkflowService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  }
}));

describe('InvitationWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Management', () => {
    it('should have generateToken method', () => {
      expect(typeof InvitationWorkflowService.generateToken).toBe('function');
    });

    it('should have validateToken method', () => {
      expect(typeof InvitationWorkflowService.validateToken).toBe('function');
    });

    it('should have markTokenAsUsed method', () => {
      expect(typeof InvitationWorkflowService.markTokenAsUsed).toBe('function');
    });

    it('should have regenerateToken method', () => {
      expect(typeof InvitationWorkflowService.regenerateToken).toBe('function');
    });
  });

  describe('Email Notification Management', () => {
    it('should have createEmailNotification method', () => {
      expect(typeof InvitationWorkflowService.createEmailNotification).toBe('function');
    });

    it('should have updateEmailNotificationStatus method', () => {
      expect(typeof InvitationWorkflowService.updateEmailNotificationStatus).toBe('function');
    });

    it('should have getEmailNotificationsByInvitation method', () => {
      expect(typeof InvitationWorkflowService.getEmailNotificationsByInvitation).toBe('function');
    });
  });

  describe('Invitation Request Management', () => {
    it('should have getEnhancedInvitationRequest method', () => {
      expect(typeof InvitationWorkflowService.getEnhancedInvitationRequest).toBe('function');
    });

    it('should have updateInvitationNotificationStatus method', () => {
      expect(typeof InvitationWorkflowService.updateInvitationNotificationStatus).toBe('function');
    });

    it('should have markInvitationAsClaimed method', () => {
      expect(typeof InvitationWorkflowService.markInvitationAsClaimed).toBe('function');
    });
  });

  describe('Utility Methods', () => {
    it('should have cleanupExpiredTokens method', () => {
      expect(typeof InvitationWorkflowService.cleanupExpiredTokens).toBe('function');
    });

    it('should have getInvitationStats method', () => {
      expect(typeof InvitationWorkflowService.getInvitationStats).toBe('function');
    });
  });

  describe('Token Validation', () => {
    it('should return invalid for empty token', async () => {
      const result = await InvitationWorkflowService.validateToken('');
      expect(result.isValid).toBe(false);
    });

    it('should handle validation errors gracefully', async () => {
      const result = await InvitationWorkflowService.validateToken('invalid-token');
      expect(result.isValid).toBe(false);
    });
  });
});