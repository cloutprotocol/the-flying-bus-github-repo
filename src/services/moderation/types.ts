
/**
 * Moderation service type definitions
 */

// Content types for moderation
export type ContentType = 'article' | 'comment' | 'profile' | 'media';

// Moderation action types
export type ModerationAction = 'approve' | 'reject' | 'flag' | 'review';

// Moderation log record
export interface ModerationLog {
  contentId: string;
  contentType: ContentType;
  action: ModerationAction;
  moderatorId: string;
  notes?: string;
}

// Moderation statistics 
export interface ModerationStats {
  counts: {
    byStatus: any[];
    byType: any[];
  };
  recentActivity: any[];
}

// Moderator performance metrics
export interface ModeratorPerformance {
  moderatorActivity: any[];
}

// Function response types
export type ModerationLogResponse = { success: boolean; error: any };
export type ModerationStatsResponse = { stats: ModerationStats | null; error: any };
export type ModeratorPerformanceResponse = { performance: ModeratorPerformance | null; error: any };
