
/**
 * Types for the moderation system
 */

// Content types for moderation
export type ContentType = 'article' | 'comment' | 'profile' | 'media';

// Moderation action types 
export type ModerationAction = 'approve' | 'reject' | 'flag' | 'review';

// Stats response type
export interface ModerationStatsResponse {
  stats: any;
  error: any;
}

// Performance response type
export interface ModeratorPerformanceResponse {
  performance: any;
  error: any;
}

// Moderation log entry type
export interface ModerationLogEntry {
  contentId: string;
  contentType: ContentType;
  action: ModerationAction;
  moderatorId: string;
  notes?: string;
  success: boolean;
  error: any;
}
