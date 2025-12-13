/**
 * Role Audit Service
 * 
 * Provides comprehensive audit logging for all role changes, article ownership,
 * and review actions. Implements requirements 4.3, 4.4.
 */
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export interface RoleChangeAuditLog {
  userId: string;
  userEmail: string;
  oldRole: string;
  newRole: string;
  changedBy?: string;
  reason: string;
  context?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ArticleOwnershipAuditLog {
  articleId: string;
  authorId: string;
  action: 'created' | 'transferred' | 'claimed';
  previousAuthorId?: string;
  changedBy?: string;
  reason: string;
  context?: Record<string, any>;
}

export interface ArticleReviewAuditLog {
  articleId: string;
  reviewerId: string;
  authorId: string;
  action: 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  previousStatus?: string;
  newStatus: string;
  feedback?: string;
  context?: Record<string, any>;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class RoleAuditService {
  /**
   * Log a role change with comprehensive audit information
   */
  static async logRoleChange(auditLog: RoleChangeAuditLog): Promise<void> {
    try {
      const metadata = {
        old_role: auditLog.oldRole,
        new_role: auditLog.newRole,
        changed_by: auditLog.changedBy,
        reason: auditLog.reason,
        timestamp: new Date().toISOString(),
        ...auditLog.context
      };
      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      await convex.mutation(api.activities.createAuditLog, {
        user_id: auditLog.userId as unknown as Id<'profiles'>,
        action: 'role_change',
        entity_type: 'profile',
        entity_id: auditLog.userId,
        changes: metadata,
        ip_address: auditLog.ipAddress,
        user_agent: auditLog.userAgent,
      } as any);
    } catch (error) {
      console.error('Role change audit logging error:', error);
      throw error;
    }
  }

  /**
   * Log article ownership changes
   */
  static async logArticleOwnership(auditLog: ArticleOwnershipAuditLog): Promise<void> {
    try {
      const metadata = {
        article_id: auditLog.articleId,
        author_id: auditLog.authorId,
        previous_author_id: auditLog.previousAuthorId,
        changed_by: auditLog.changedBy,
        reason: auditLog.reason,
        timestamp: new Date().toISOString(),
        ...auditLog.context
      };

      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      await convex.mutation(api.activities.createAuditLog, {
        user_id: auditLog.authorId as unknown as Id<'profiles'>,
        action: `article_ownership_${auditLog.action}`,
        entity_type: 'article',
        entity_id: auditLog.articleId,
        changes: metadata,
      } as any);
    } catch (error) {
      console.error('Article ownership audit logging error:', error);
      throw error;
    }
  }

  /**
   * Log article review actions
   */
  static async logArticleReview(auditLog: ArticleReviewAuditLog): Promise<void> {
    try {
      const metadata = {
        article_id: auditLog.articleId,
        reviewer_id: auditLog.reviewerId,
        author_id: auditLog.authorId,
        previous_status: auditLog.previousStatus,
        new_status: auditLog.newStatus,
        feedback: auditLog.feedback,
        timestamp: new Date().toISOString(),
        ...auditLog.context
      };

      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      await convex.mutation(api.activities.createAuditLog, {
        user_id: auditLog.reviewerId as unknown as Id<'profiles'>,
        action: `article_review_${auditLog.action}`,
        entity_type: 'article_review',
        entity_id: auditLog.articleId,
        changes: metadata,
      } as any);
    } catch (error) {
      console.error('Article review audit logging error:', error);
      throw error;
    }
  }

  /**
   * Query audit logs with filtering options
   */
  static async queryAuditLogs(query: AuditLogQuery = {}) {
    try {
      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      const data = await convex.query(api.activities.listAuditLogs, {
        userId: query.userId,
        action: query.action,
        resourceType: query.resourceType,
        startDate: query.startDate ? query.startDate.toISOString() : undefined,
        endDate: query.endDate ? query.endDate.toISOString() : undefined,
        limit: query.limit,
        offset: query.offset,
      } as any);
      return data || [];
    } catch (error) {
      console.error('Audit log query error:', error);
      throw error;
    }
  }

  /**
   * Get role change history for a specific user
   */
  static async getUserRoleHistory(userId: string) {
    return this.queryAuditLogs({
      userId,
      action: 'role_change',
      resourceType: 'profile'
    });
  }

  /**
   * Get article ownership history for a specific article
   */
  static async getArticleOwnershipHistory(articleId: string) {
    return this.queryAuditLogs({
      resourceType: 'article'
    }).then(logs => 
      logs.filter(log => 
        log.action.startsWith('article_ownership_') && 
        log.resource_id === articleId
      )
    );
  }

  /**
   * Get article review history for a specific article
   */
  static async getArticleReviewHistory(articleId: string) {
    return this.queryAuditLogs({
      resourceType: 'article_review'
    }).then(logs => 
      logs.filter(log => 
        log.action.startsWith('article_review_') && 
        log.resource_id === articleId
      )
    );
  }

  /**
   * Get recent audit activity (last 24 hours)
   */
  static async getRecentActivity(limit: number = 50) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return this.queryAuditLogs({
      startDate: yesterday,
      limit
    });
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await this.queryAuditLogs({
        startDate
      });

      const stats = {
        totalEvents: logs.length,
        roleChanges: logs.filter(log => log.action === 'role_change').length,
        articleOwnershipChanges: logs.filter(log => log.action.startsWith('article_ownership_')).length,
        articleReviews: logs.filter(log => log.action.startsWith('article_review_')).length,
        successfulEvents: logs.filter(log => log.success).length,
        failedEvents: logs.filter(log => !log.success).length,
        uniqueUsers: new Set(logs.map(log => log.user_id).filter(Boolean)).size,
        eventsByDay: this.groupEventsByDay(logs)
      };

      return stats;
    } catch (error) {
      console.error('Failed to get audit statistics:', error);
      throw error;
    }
  }

  /**
   * Helper method to group events by day
   */
  private static groupEventsByDay(logs: any[]) {
    const grouped: Record<string, number> = {};
    
    logs.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Log a generic audit event
   */
  static async logEvent(
    action: string,
    resourceType: string,
    resourceId: string,
    success: boolean,
    metadata?: Record<string, any>,
    userId?: string,
    userEmail?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      await convex.mutation(api.activities.createAuditLog, {
        user_id: (userId as unknown as Id<'profiles'>) || undefined,
        action,
        entity_type: resourceType,
        entity_id: resourceId,
        changes: metadata || {},
      } as any);
    } catch (error) {
      console.error('Audit event logging error:', error);
      throw error;
    }
  }
}

export default RoleAuditService;
