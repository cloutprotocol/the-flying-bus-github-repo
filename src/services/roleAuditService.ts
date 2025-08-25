/**
 * Role Audit Service
 * 
 * Provides comprehensive audit logging for all role changes, article ownership,
 * and review actions. Implements requirements 4.3, 4.4.
 */

import { supabase } from '@/integrations/supabase/client';

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

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action: 'role_change',
          resource_type: 'profile',
          resource_id: auditLog.userId,
          user_email: auditLog.userEmail,
          user_id: auditLog.userId,
          success: true,
          metadata,
          ip_address: auditLog.ipAddress,
          user_agent: auditLog.userAgent,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log role change:', error);
        throw new Error(`Audit logging failed: ${error.message}`);
      }
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

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action: `article_ownership_${auditLog.action}`,
          resource_type: 'article',
          resource_id: auditLog.articleId,
          user_id: auditLog.authorId,
          success: true,
          metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log article ownership change:', error);
        throw new Error(`Audit logging failed: ${error.message}`);
      }
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

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action: `article_review_${auditLog.action}`,
          resource_type: 'article_review',
          resource_id: auditLog.articleId,
          user_id: auditLog.reviewerId,
          success: true,
          metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log article review action:', error);
        throw new Error(`Audit logging failed: ${error.message}`);
      }
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
      let supabaseQuery = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (query.userId) {
        supabaseQuery = supabaseQuery.eq('user_id', query.userId);
      }

      if (query.action) {
        supabaseQuery = supabaseQuery.eq('action', query.action);
      }

      if (query.resourceType) {
        supabaseQuery = supabaseQuery.eq('resource_type', query.resourceType);
      }

      if (query.startDate) {
        supabaseQuery = supabaseQuery.gte('created_at', query.startDate.toISOString());
      }

      if (query.endDate) {
        supabaseQuery = supabaseQuery.lte('created_at', query.endDate.toISOString());
      }

      // Apply pagination
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }

      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, (query.offset + (query.limit || 50)) - 1);
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        console.error('Failed to query audit logs:', error);
        throw new Error(`Audit log query failed: ${error.message}`);
      }

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
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          user_id: userId,
          user_email: userEmail,
          success,
          error_message: errorMessage,
          metadata: metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log audit event:', error);
        throw new Error(`Audit logging failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Audit event logging error:', error);
      throw error;
    }
  }
}

export default RoleAuditService;