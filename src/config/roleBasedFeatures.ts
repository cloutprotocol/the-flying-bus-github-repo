/**
 * Role-based feature configuration system
 * Defines what features are available to each user role
 */

export type UserRole = 'reader' | 'author' | 'moderator' | 'admin';

export interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'management' | 'analytics' | 'system' | 'moderation';
  requiredRole: UserRole;
  icon?: string;
  path?: string;
  component?: string;
}

export interface RolePermissions {
  role: UserRole;
  features: string[];
  dashboardSections: string[];
  quickActions: string[];
  navigationItems: string[];
}

/**
 * Feature definitions - all available features in the system
 */
export const FEATURES: Record<string, FeatureConfig> = {
  // Content Management Features
  CREATE_ARTICLE: {
    id: 'create_article',
    name: 'Create Article',
    description: 'Create new articles',
    category: 'content',
    requiredRole: 'author',
    icon: 'PenLine',
    path: '/admin/articles/create',
    component: 'ArticleCreate'
  },
  EDIT_OWN_ARTICLES: {
    id: 'edit_own_articles',
    name: 'Edit Own Articles',
    description: 'Edit articles you have created',
    category: 'content',
    requiredRole: 'author',
    icon: 'Edit',
    path: '/admin/articles/my-articles',
    component: 'MyArticles'
  },
  EDIT_ALL_ARTICLES: {
    id: 'edit_all_articles',
    name: 'Edit All Articles',
    description: 'Edit any article in the system',
    category: 'content',
    requiredRole: 'moderator',
    icon: 'Edit',
    path: '/admin/articles',
    component: 'AllArticles'
  },
  PUBLISH_ARTICLES: {
    id: 'publish_articles',
    name: 'Publish Articles',
    description: 'Publish articles directly without review',
    category: 'content',
    requiredRole: 'moderator',
    icon: 'Send',
    path: '/admin/articles/publish',
    component: 'PublishArticles'
  },
  SUBMIT_FOR_REVIEW: {
    id: 'submit_for_review',
    name: 'Submit for Review',
    description: 'Submit articles for admin review',
    category: 'content',
    requiredRole: 'author',
    icon: 'CheckCircle',
    component: 'SubmitReview'
  },
  REVIEW_ARTICLES: {
    id: 'review_articles',
    name: 'Review Articles',
    description: 'Review and approve/reject submitted articles',
    category: 'management',
    requiredRole: 'moderator',
    icon: 'FileCheck',
    path: '/admin/articles/review',
    component: 'ArticleReview'
  },

  // Analytics Features
  VIEW_OWN_ANALYTICS: {
    id: 'view_own_analytics',
    name: 'View Own Analytics',
    description: 'View analytics for your own content',
    category: 'analytics',
    requiredRole: 'author',
    icon: 'BarChart3',
    path: '/admin/analytics/my-content',
    component: 'AuthorAnalytics'
  },
  VIEW_ALL_ANALYTICS: {
    id: 'view_all_analytics',
    name: 'View All Analytics',
    description: 'View system-wide analytics',
    category: 'analytics',
    requiredRole: 'moderator',
    icon: 'TrendingUp',
    path: '/admin/analytics',
    component: 'SystemAnalytics'
  },

  // User Management Features
  MANAGE_USERS: {
    id: 'manage_users',
    name: 'Manage Users',
    description: 'Manage user accounts and roles',
    category: 'management',
    requiredRole: 'admin',
    icon: 'Users',
    path: '/admin/users',
    component: 'UserManagement'
  },
  MANAGE_INVITATIONS: {
    id: 'manage_invitations',
    name: 'Manage Invitations',
    description: 'Send and manage user invitations',
    category: 'management',
    requiredRole: 'admin',
    icon: 'UserPlus',
    path: '/admin/invitations',
    component: 'InvitationManagement'
  },

  // Comment Management Features
  MODERATE_OWN_COMMENTS: {
    id: 'moderate_own_comments',
    name: 'Moderate Own Comments',
    description: 'Moderate comments on your articles',
    category: 'moderation',
    requiredRole: 'author',
    icon: 'MessageSquare',
    path: '/admin/comments/my-articles',
    component: 'AuthorCommentModeration'
  },
  MODERATE_ALL_COMMENTS: {
    id: 'moderate_all_comments',
    name: 'Moderate All Comments',
    description: 'Moderate comments across all articles',
    category: 'moderation',
    requiredRole: 'moderator',
    icon: 'Shield',
    path: '/admin/comments',
    component: 'CommentModeration'
  },

  // System Features
  SYSTEM_SETTINGS: {
    id: 'system_settings',
    name: 'System Settings',
    description: 'Configure system settings',
    category: 'system',
    requiredRole: 'admin',
    icon: 'Settings',
    path: '/admin/settings',
    component: 'SystemSettings'
  },
  VIEW_AUDIT_LOGS: {
    id: 'view_audit_logs',
    name: 'View Audit Logs',
    description: 'View system audit logs',
    category: 'system',
    requiredRole: 'admin',
    icon: 'FileText',
    path: '/admin/audit-logs',
    component: 'AuditLogs'
  },
  MANAGE_CATEGORIES: {
    id: 'manage_categories',
    name: 'Manage Categories',
    description: 'Manage article categories',
    category: 'management',
    requiredRole: 'moderator',
    icon: 'Folder',
    path: '/admin/categories',
    component: 'CategoryManagement'
  }
};

/**
 * Role-based permissions configuration
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  reader: {
    role: 'reader',
    features: [],
    dashboardSections: [],
    quickActions: [],
    navigationItems: []
  },
  author: {
    role: 'author',
    features: [
      'create_article',
      'edit_own_articles',
      'submit_for_review',
      'view_own_analytics',
      'moderate_own_comments'
    ],
    dashboardSections: [
      'my_articles',
      'my_analytics',
      'my_comments',
      'quick_actions'
    ],
    quickActions: [
      'create_article',
      'view_own_analytics',
      'moderate_own_comments'
    ],
    navigationItems: [
      'dashboard',
      'my_articles',
      'analytics',
      'comments'
    ]
  },
  moderator: {
    role: 'moderator',
    features: [
      'create_article',
      'edit_own_articles',
      'edit_all_articles',
      'publish_articles',
      'review_articles',
      'view_own_analytics',
      'view_all_analytics',
      'moderate_own_comments',
      'moderate_all_comments',
      'manage_categories'
    ],
    dashboardSections: [
      'all_articles',
      'pending_reviews',
      'system_analytics',
      'comment_moderation',
      'quick_actions'
    ],
    quickActions: [
      'create_article',
      'review_articles',
      'moderate_all_comments',
      'view_all_analytics'
    ],
    navigationItems: [
      'dashboard',
      'articles',
      'reviews',
      'comments',
      'analytics',
      'categories'
    ]
  },
  admin: {
    role: 'admin',
    features: [
      'create_article',
      'edit_own_articles',
      'edit_all_articles',
      'publish_articles',
      'review_articles',
      'view_own_analytics',
      'view_all_analytics',
      'moderate_own_comments',
      'moderate_all_comments',
      'manage_users',
      'manage_invitations',
      'system_settings',
      'view_audit_logs',
      'manage_categories'
    ],
    dashboardSections: [
      'system_overview',
      'user_management',
      'content_management',
      'system_analytics',
      'audit_logs',
      'quick_actions'
    ],
    quickActions: [
      'manage_users',
      'manage_invitations',
      'review_articles',
      'system_settings',
      'view_audit_logs'
    ],
    navigationItems: [
      'dashboard',
      'articles',
      'users',
      'invitations',
      'reviews',
      'comments',
      'analytics',
      'categories',
      'settings',
      'audit-logs'
    ]
  }
};

/**
 * Dashboard section configurations
 */
export const DASHBOARD_SECTIONS = {
  my_articles: {
    id: 'my_articles',
    title: 'My Articles',
    description: 'Articles you have created',
    component: 'MyArticlesSection',
    requiredRole: 'author' as UserRole
  },
  my_analytics: {
    id: 'my_analytics',
    title: 'My Analytics',
    description: 'Performance of your content',
    component: 'AuthorAnalyticsSection',
    requiredRole: 'author' as UserRole
  },
  my_comments: {
    id: 'my_comments',
    title: 'My Comments',
    description: 'Comments on your articles',
    component: 'AuthorCommentsSection',
    requiredRole: 'author' as UserRole
  },
  all_articles: {
    id: 'all_articles',
    title: 'All Articles',
    description: 'All articles in the system',
    component: 'AllArticlesSection',
    requiredRole: 'moderator' as UserRole
  },
  pending_reviews: {
    id: 'pending_reviews',
    title: 'Pending Reviews',
    description: 'Articles awaiting review',
    component: 'PendingReviewsSection',
    requiredRole: 'moderator' as UserRole
  },
  system_analytics: {
    id: 'system_analytics',
    title: 'System Analytics',
    description: 'System-wide performance metrics',
    component: 'SystemAnalyticsSection',
    requiredRole: 'moderator' as UserRole
  },
  comment_moderation: {
    id: 'comment_moderation',
    title: 'Comment Moderation',
    description: 'Moderate comments across the platform',
    component: 'CommentModerationSection',
    requiredRole: 'moderator' as UserRole
  },
  system_overview: {
    id: 'system_overview',
    title: 'System Overview',
    description: 'High-level system metrics',
    component: 'SystemOverviewSection',
    requiredRole: 'admin' as UserRole
  },
  user_management: {
    id: 'user_management',
    title: 'User Management',
    description: 'Manage user accounts and roles',
    component: 'UserManagementSection',
    requiredRole: 'admin' as UserRole
  },
  content_management: {
    id: 'content_management',
    title: 'Content Management',
    description: 'Manage all content across the platform',
    component: 'ContentManagementSection',
    requiredRole: 'admin' as UserRole
  },
  audit_logs: {
    id: 'audit_logs',
    title: 'Audit Logs',
    description: 'System audit and security logs',
    component: 'AuditLogsSection',
    requiredRole: 'admin' as UserRole
  },
  quick_actions: {
    id: 'quick_actions',
    title: 'Quick Actions',
    description: 'Frequently used actions',
    component: 'QuickActionsSection',
    requiredRole: 'author' as UserRole
  }
};