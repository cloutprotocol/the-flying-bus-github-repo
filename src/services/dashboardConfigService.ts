/**
 * Dashboard configuration service
 * Provides role-specific dashboard configurations and metrics
 */

import { ReaderProfile } from '@/types/ReaderProfile';
import { getUserRole, getRoleSpecificMetrics } from '@/utils/roleBasedAccess';
import { UserRole } from '@/config/roleBasedFeatures';

export interface DashboardMetrics {
  // Common metrics
  totalArticles?: number;
  articleViews?: number;
  commentCount?: number;
  
  // Author-specific metrics
  myArticles?: number;
  myArticleViews?: number;
  myComments?: number;
  articlesInReview?: number;
  articlesPublished?: number;
  
  // Moderator-specific metrics
  pendingReviews?: number;
  pendingComments?: number;
  categoriesCount?: number;
  
  // Admin-specific metrics
  totalUsers?: number;
  pendingInvitations?: number;
  systemHealth?: 'good' | 'warning' | 'error';
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  path?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'destructive';
  badge?: string | number;
}

export interface DashboardConfig {
  title: string;
  description: string;
  metrics: string[];
  quickActions: QuickAction[];
  sections: string[];
}

/**
 * Get role-specific dashboard configuration
 */
export function getDashboardConfig(user: ReaderProfile | null): DashboardConfig {
  const userRole = getUserRole(user);
  const metrics = getRoleSpecificMetrics(user);
  
  switch (userRole) {
    case 'admin':
      return getAdminDashboardConfig(metrics);
    case 'moderator':
      return getModeratorDashboardConfig(metrics);
    case 'author':
      return getAuthorDashboardConfig(metrics);
    default:
      return getDefaultDashboardConfig();
  }
}

/**
 * Admin dashboard configuration
 */
function getAdminDashboardConfig(metrics: string[]): DashboardConfig {
  return {
    title: 'Admin Dashboard',
    description: 'Manage users, content, and system settings for The Flying Bus.',
    metrics,
    quickActions: [
      {
        id: 'manage_users',
        title: 'Manage Users',
        description: 'Add, edit, and manage user accounts',
        icon: 'Users',
        path: '/admin/users'
      },
      {
        id: 'manage_invitations',
        title: 'Send Invitations',
        description: 'Invite new authors to the platform',
        icon: 'UserPlus',
        path: '/admin/invitations'
      },
      {
        id: 'review_articles',
        title: 'Review Articles',
        description: 'Review pending article submissions',
        icon: 'FileCheck',
        path: '/admin/articles/review',
        badge: 'pending_reviews'
      },
      {
        id: 'system_settings',
        title: 'System Settings',
        description: 'Configure system settings',
        icon: 'Settings',
        path: '/admin/settings'
      },
      {
        id: 'view_audit_logs',
        title: 'Audit Logs',
        description: 'View system audit and security logs',
        icon: 'FileText',
        path: '/admin/audit-logs'
      },
      {
        id: 'moderate_comments',
        title: 'Moderate Comments',
        description: 'Review and moderate user comments',
        icon: 'Shield',
        path: '/admin/comments',
        badge: 'pending_comments'
      }
    ],
    sections: [
      'system_overview',
      'user_management',
      'content_management',
      'system_analytics',
      'audit_logs',
      'quick_actions'
    ]
  };
}

/**
 * Moderator dashboard configuration
 */
function getModeratorDashboardConfig(metrics: string[]): DashboardConfig {
  return {
    title: 'Moderator Dashboard',
    description: 'Review content, moderate comments, and manage categories.',
    metrics,
    quickActions: [
      {
        id: 'create_article',
        title: 'Create Article',
        description: 'Write and publish new content',
        icon: 'PenLine',
        path: '/admin/articles/create'
      },
      {
        id: 'review_articles',
        title: 'Review Articles',
        description: 'Review pending article submissions',
        icon: 'FileCheck',
        path: '/admin/articles/review',
        badge: 'pending_reviews'
      },
      {
        id: 'moderate_comments',
        title: 'Moderate Comments',
        description: 'Review and moderate user comments',
        icon: 'Shield',
        path: '/admin/comments',
        badge: 'pending_comments'
      },
      {
        id: 'view_analytics',
        title: 'View Analytics',
        description: 'View system-wide performance metrics',
        icon: 'BarChart3',
        path: '/admin/analytics'
      },
      {
        id: 'manage_categories',
        title: 'Manage Categories',
        description: 'Add and organize article categories',
        icon: 'Folder',
        path: '/admin/categories'
      }
    ],
    sections: [
      'all_articles',
      'pending_reviews',
      'system_analytics',
      'comment_moderation',
      'quick_actions'
    ]
  };
}

/**
 * Author dashboard configuration
 */
function getAuthorDashboardConfig(metrics: string[]): DashboardConfig {
  return {
    title: 'Author Dashboard',
    description: 'Create and manage your articles, view your analytics, and moderate comments on your content.',
    metrics,
    quickActions: [
      {
        id: 'create_article',
        title: 'Create Article',
        description: 'Write new content for review',
        icon: 'PenLine',
        path: '/admin/articles/create'
      },
      {
        id: 'view_my_articles',
        title: 'My Articles',
        description: 'View and edit your articles',
        icon: 'FileText',
        path: '/admin/articles/my-articles'
      },
      {
        id: 'view_analytics',
        title: 'My Analytics',
        description: 'View performance of your content',
        icon: 'BarChart3',
        path: '/admin/analytics/my-content'
      },
      {
        id: 'moderate_comments',
        title: 'My Comments',
        description: 'Moderate comments on your articles',
        icon: 'MessageSquare',
        path: '/admin/comments/my-articles'
      }
    ],
    sections: [
      'my_articles',
      'my_analytics',
      'my_comments',
      'quick_actions'
    ]
  };
}

/**
 * Default dashboard configuration (for readers or unauthenticated users)
 */
function getDefaultDashboardConfig(): DashboardConfig {
  return {
    title: 'Dashboard',
    description: 'Welcome to The Flying Bus.',
    metrics: [],
    quickActions: [],
    sections: []
  };
}

/**
 * Get role-specific quick actions with dynamic badges
 */
export function getQuickActionsWithBadges(
  user: ReaderProfile | null, 
  metrics: DashboardMetrics
): QuickAction[] {
  const config = getDashboardConfig(user);
  
  return config.quickActions.map(action => {
    // Add dynamic badges based on metrics
    let badge = action.badge;
    if (badge && typeof badge === 'string' && metrics[badge as keyof DashboardMetrics]) {
      badge = metrics[badge as keyof DashboardMetrics] as string | number;
    }
    
    return {
      ...action,
      badge: badge && badge !== action.badge ? badge : undefined
    };
  });
}

/**
 * Get role-specific metric display configuration
 */
export interface MetricDisplayConfig {
  key: string;
  title: string;
  icon: string;
  color: string;
  description?: string;
  format?: 'number' | 'percentage' | 'currency';
}

export function getMetricDisplayConfigs(user: ReaderProfile | null): MetricDisplayConfig[] {
  const userRole = getUserRole(user);
  
  const commonConfigs: Record<string, MetricDisplayConfig> = {
    total_articles: {
      key: 'totalArticles',
      title: 'Total Articles',
      icon: 'PenLine',
      color: 'primary',
      description: 'Total number of articles'
    },
    article_views: {
      key: 'articleViews',
      title: 'Article Views',
      icon: 'Eye',
      color: 'blue',
      description: 'Total article views'
    },
    comment_count: {
      key: 'commentCount',
      title: 'Comments',
      icon: 'MessageSquare',
      color: 'green',
      description: 'Total comments'
    },
    my_articles: {
      key: 'myArticles',
      title: 'My Articles',
      icon: 'FileText',
      color: 'primary',
      description: 'Articles you have created'
    },
    my_article_views: {
      key: 'myArticleViews',
      title: 'My Views',
      icon: 'Eye',
      color: 'blue',
      description: 'Views on your articles'
    },
    my_comments: {
      key: 'myComments',
      title: 'My Comments',
      icon: 'MessageSquare',
      color: 'green',
      description: 'Comments on your articles'
    },
    articles_in_review: {
      key: 'articlesInReview',
      title: 'In Review',
      icon: 'Clock',
      color: 'orange',
      description: 'Articles pending review'
    },
    articles_published: {
      key: 'articlesPublished',
      title: 'Published',
      icon: 'CheckCircle',
      color: 'green',
      description: 'Published articles'
    },
    pending_reviews: {
      key: 'pendingReviews',
      title: 'Pending Reviews',
      icon: 'AlertCircle',
      color: 'orange',
      description: 'Articles awaiting review'
    },
    pending_comments: {
      key: 'pendingComments',
      title: 'Pending Comments',
      icon: 'MessageCircle',
      color: 'orange',
      description: 'Comments awaiting moderation'
    },
    total_users: {
      key: 'totalUsers',
      title: 'Total Users',
      icon: 'Users',
      color: 'purple',
      description: 'Registered users'
    },
    pending_invitations: {
      key: 'pendingInvitations',
      title: 'Pending Invitations',
      icon: 'UserPlus',
      color: 'blue',
      description: 'Invitations awaiting approval'
    },
    system_health: {
      key: 'systemHealth',
      title: 'System Health',
      icon: 'Activity',
      color: 'green',
      description: 'Overall system status'
    },
    categories_count: {
      key: 'categoriesCount',
      title: 'Categories',
      icon: 'Folder',
      color: 'purple',
      description: 'Article categories'
    }
  };
  
  const roleMetrics = getRoleSpecificMetrics(user);
  return roleMetrics
    .map(metric => commonConfigs[metric])
    .filter(Boolean);
}

/**
 * Check if user should see a specific dashboard section
 */
export function shouldShowDashboardSection(
  user: ReaderProfile | null, 
  sectionId: string
): boolean {
  const config = getDashboardConfig(user);
  return config.sections.includes(sectionId);
}

/**
 * Get navigation items for role-based sidebar
 */
export interface NavigationItem {
  id: string;
  title: string;
  icon: string;
  path: string;
  badge?: string | number;
  children?: NavigationItem[];
}

export function getRoleBasedNavigation(user: ReaderProfile | null): NavigationItem[] {
  const userRole = getUserRole(user);
  
  const baseNavigation: NavigationItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'LayoutDashboard',
      path: '/admin/dashboard'
    }
  ];
  
  switch (userRole) {
    case 'admin':
      return [
        ...baseNavigation,
        {
          id: 'articles',
          title: 'Articles',
          icon: 'FileText',
          path: '/admin/articles',
          children: [
            { id: 'all-articles', title: 'All Articles', icon: 'List', path: '/admin/articles' },
            { id: 'create-article', title: 'Create Article', icon: 'Plus', path: '/admin/articles/create' },
            { id: 'review-articles', title: 'Review Articles', icon: 'FileCheck', path: '/admin/articles/review' }
          ]
        },
        {
          id: 'users',
          title: 'Users',
          icon: 'Users',
          path: '/admin/users'
        },
        {
          id: 'invitations',
          title: 'Invitations',
          icon: 'UserPlus',
          path: '/admin/invitations'
        },
        {
          id: 'comments',
          title: 'Comments',
          icon: 'MessageSquare',
          path: '/admin/comments'
        },
        {
          id: 'analytics',
          title: 'Analytics',
          icon: 'BarChart3',
          path: '/admin/analytics'
        },
        {
          id: 'categories',
          title: 'Categories',
          icon: 'Folder',
          path: '/admin/categories'
        },
        {
          id: 'settings',
          title: 'Settings',
          icon: 'Settings',
          path: '/admin/settings'
        },
        {
          id: 'audit-logs',
          title: 'Audit Logs',
          icon: 'FileText',
          path: '/admin/audit-logs'
        }
      ];
      
    case 'moderator':
      return [
        ...baseNavigation,
        {
          id: 'articles',
          title: 'Articles',
          icon: 'FileText',
          path: '/admin/articles',
          children: [
            { id: 'all-articles', title: 'All Articles', icon: 'List', path: '/admin/articles' },
            { id: 'create-article', title: 'Create Article', icon: 'Plus', path: '/admin/articles/create' },
            { id: 'review-articles', title: 'Review Articles', icon: 'FileCheck', path: '/admin/articles/review' }
          ]
        },
        {
          id: 'comments',
          title: 'Comments',
          icon: 'MessageSquare',
          path: '/admin/comments'
        },
        {
          id: 'analytics',
          title: 'Analytics',
          icon: 'BarChart3',
          path: '/admin/analytics'
        },
        {
          id: 'categories',
          title: 'Categories',
          icon: 'Folder',
          path: '/admin/categories'
        }
      ];
      
    case 'author':
      return [
        ...baseNavigation,
        {
          id: 'my-articles',
          title: 'My Articles',
          icon: 'FileText',
          path: '/admin/articles/my-articles'
        },
        {
          id: 'create-article',
          title: 'Create Article',
          icon: 'Plus',
          path: '/admin/articles/create'
        },
        {
          id: 'analytics',
          title: 'My Analytics',
          icon: 'BarChart3',
          path: '/admin/analytics/my-content'
        },
        {
          id: 'comments',
          title: 'My Comments',
          icon: 'MessageSquare',
          path: '/admin/comments/my-articles'
        }
      ];
      
    default:
      return baseNavigation;
  }
}