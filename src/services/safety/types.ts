
/**
 * Safety Service Types
 * Type definitions for content safety and moderation
 */

// Report types
export type ReportType = 'harassment' | 'inappropriate' | 'spam' | 'misinformation' | 'other';
export type ContentType = 'article' | 'comment' | 'profile' | 'media';

// Content warning types
export type WarningLevel = 'none' | 'mild' | 'moderate' | 'high';
export type WarningCategory = 'sensitive_topic' | 'mature_content' | 'controversial' | 'graphic_content';

/**
 * Content warning interface
 */
export interface ContentWarning {
  level: WarningLevel;
  category: WarningCategory;
  message?: string;
}

/**
 * Safety report interface
 */
export interface SafetyReport {
  id: string;
  content_id: string;
  content_type: ContentType;
  reason: string;
  reporter_id: string;
  reviewer_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  reporter?: {
    display_name: string;
    avatar_url: string;
  };
  reviewer?: {
    display_name: string;
    avatar_url: string;
  };
}
