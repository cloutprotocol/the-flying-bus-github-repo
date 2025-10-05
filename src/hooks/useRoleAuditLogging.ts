/**
 * Role Audit Logging Hook
 * 
 * Provides easy integration of audit logging into role management operations.
 * Automatically captures context and user information.
 */

import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { RoleAuditService } from '@/services/roleAuditService';

export const useRoleAuditLogging = () => {
  const { user } = useAuth();

  const logRoleChange = useCallback(async (
    targetUserId: string,
    targetUserEmail: string,
    oldRole: string,
    newRole: string,
    reason: string,
    context?: Record<string, any>
  ) => {
    try {
      await RoleAuditService.logRoleChange({
        userId: targetUserId,
        userEmail: targetUserEmail,
        oldRole,
        newRole,
        changedBy: user?.id,
        reason,
        context: {
          ...context,
          changed_by_email: user?.email,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log role change:', error);
      // Don't throw - audit logging shouldn't break the main operation
    }
  }, [user]);

  const logArticleOwnership = useCallback(async (
    articleId: string,
    authorId: string,
    action: 'created' | 'transferred' | 'claimed',
    reason: string,
    previousAuthorId?: string,
    context?: Record<string, any>
  ) => {
    try {
      await RoleAuditService.logArticleOwnership({
        articleId,
        authorId,
        action,
        previousAuthorId,
        changedBy: user?.id,
        reason,
        context: {
          ...context,
          changed_by_email: user?.email,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log article ownership change:', error);
      // Don't throw - audit logging shouldn't break the main operation
    }
  }, [user]);

  const logArticleReview = useCallback(async (
    articleId: string,
    authorId: string,
    action: 'submitted' | 'approved' | 'rejected' | 'changes_requested',
    previousStatus: string,
    newStatus: string,
    feedback?: string,
    context?: Record<string, any>
  ) => {
    try {
      await RoleAuditService.logArticleReview({
        articleId,
        reviewerId: user?.id || '',
        authorId,
        action,
        previousStatus,
        newStatus,
        feedback,
        context: {
          ...context,
          reviewer_email: user?.email,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log article review action:', error);
      // Don't throw - audit logging shouldn't break the main operation
    }
  }, [user]);

  const logGenericEvent = useCallback(async (
    action: string,
    resourceType: string,
    resourceId: string,
    success: boolean,
    metadata?: Record<string, any>,
    errorMessage?: string
  ) => {
    try {
      await RoleAuditService.logEvent(
        action,
        resourceType,
        resourceId,
        success,
        {
          ...metadata,
          performed_by: user?.id,
          performed_by_email: user?.email,
          timestamp: new Date().toISOString()
        },
        user?.id,
        user?.email,
        errorMessage
      );
    } catch (error) {
      console.error('Failed to log generic audit event:', error);
      // Don't throw - audit logging shouldn't break the main operation
    }
  }, [user]);

  return {
    logRoleChange,
    logArticleOwnership,
    logArticleReview,
    logGenericEvent
  };
};

export default useRoleAuditLogging;