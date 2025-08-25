/**
 * Article Ownership Service Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    },
    from: vi.fn()
  }
}));

// Mock logger
vi.mock('@/utils/logger/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

import { ownershipUIUtils } from '../articleOwnershipService';

describe('Article Ownership Service', () => {
  describe('ownershipUIUtils', () => {
    const mockArticle = {
      id: 'article-456',
      title: 'Test Article',
      content: 'Test content',
      author_id: 'user-123',
      status: 'draft' as const,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      can_edit: true,
      can_delete: true,
      can_publish: false
    };

    it('should show edit button when user can edit', () => {
      expect(ownershipUIUtils.shouldShowEditButton(mockArticle)).toBe(true);
    });

    it('should show delete button when user can delete', () => {
      expect(ownershipUIUtils.shouldShowDeleteButton(mockArticle)).toBe(true);
    });

    it('should not show publish button for authors', () => {
      expect(ownershipUIUtils.shouldShowPublishButton(mockArticle)).toBe(false);
    });

    it('should show submit for review button for draft articles', () => {
      expect(ownershipUIUtils.shouldShowSubmitForReviewButton(mockArticle)).toBe(true);
    });

    it('should return correct status colors', () => {
      expect(ownershipUIUtils.getStatusBadgeColor('draft')).toBe('gray');
      expect(ownershipUIUtils.getStatusBadgeColor('pending_review')).toBe('yellow');
      expect(ownershipUIUtils.getStatusBadgeColor('approved')).toBe('green');
      expect(ownershipUIUtils.getStatusBadgeColor('rejected')).toBe('red');
      expect(ownershipUIUtils.getStatusBadgeColor('published')).toBe('blue');
    });

    it('should return correct status text', () => {
      expect(ownershipUIUtils.getStatusText('draft')).toBe('Draft');
      expect(ownershipUIUtils.getStatusText('pending_review')).toBe('Pending Review');
      expect(ownershipUIUtils.getStatusText('approved')).toBe('Approved');
      expect(ownershipUIUtils.getStatusText('rejected')).toBe('Rejected');
      expect(ownershipUIUtils.getStatusText('published')).toBe('Published');
    });
  });

});