import React, { useState, useEffect, useRef } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Users,
  FileText,
  Clock,
  CheckCircle,
  Folder
} from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Use the Activity type from the service
type Activity = ActivityType;

interface DashboardMetrics {
  totalArticles?: number;
  totalUsers?: number;
  commentCount?: number;
  pendingReviews?: number;
  myArticles?: number;
  myArticleViews?: number;
  myComments?: number;
  articlesInReview?: number;
  articlesPublished?: number;
  categoriesCount?: number;
  systemHealth?: string;
}



// Helper function to determine user role
function getUserRole(user: any): 'admin' | 'moderator' | 'author' | 'reader' {
  if (!user || !user.role) return 'reader';
  const role = user.role.toLowerCase();
  if (['admin', 'moderator', 'author'].includes(role)) {
    return role as 'admin' | 'moderator' | 'author';
  }
  return 'reader';
}

// Helper function to check if user can access dashboard
function canAccessDashboard(user: any): boolean {
  const role = getUserRole(user);
  return ['admin', 'moderator', 'author'].includes(role);
}

// Helper function to get dashboard title based on role
function getDashboardTitle(user: any): string {
  const role = getUserRole(user);
  switch (role) {
    case 'admin': return 'Admin Dashboard';
    case 'moderator': return 'Moderator Dashboard';
    case 'author': return 'Author Dashboard';
    default: return 'Dashboard';
  }
}

// Helper function to get dashboard description based on role
function getDashboardDescription(user: any): string {
  const role = getUserRole(user);
  switch (role) {
    case 'admin': return 'Manage users, content, and system settings for The Flying Bus.';
    case 'moderator': return 'Review content, moderate comments, and manage categories.';
    case 'author': return 'Create and manage your articles, view your analytics, and moderate comments on your content.';
    default: return 'Welcome to The Flying Bus.';
  }
}

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const isLoading = useRef(false);

  // Get auth context
  const { session, currentUser, isInitialized: authInitialized } = useAuth();

  // Determine user role and access
  const userRole = getUserRole(currentUser);
  const hasAccess = canAccessDashboard(currentUser);
  const dashboardTitle = getDashboardTitle(currentUser);
  const dashboardDescription = getDashboardDescription(currentUser);

  // Debug logging
  console.log('Dashboard render - Auth state:', {
    hasCurrentUser: !!currentUser,
    hasSession: !!session,
    userRole,
    hasAccess,
    authInitialized,
    userId: currentUser?.id,
    sessionUserId: session?.user?.id
  });

  // Convex reactive queries
  const metricsQuery = useQuery(api.dashboard.getMetrics, { role: userRole });
  const recentActivities = useQuery(api.dashboard.getRecentActivities, { limit: 5 });

  // Reflect reactive data into local state for existing rendering logic
  useEffect(() => {
    if (metricsQuery) setMetrics(metricsQuery as DashboardMetrics);
    if (recentActivities) setActivities(recentActivities as any);
  }, [metricsQuery, recentActivities]);

  useEffect(() => {
    // Wait for auth to be initialized and ensure we have proper access
    if (!authInitialized || !hasAccess || !currentUser) {
      console.log('Dashboard: Waiting for auth initialization or access', {
        authInitialized,
        hasAccess,
        hasCurrentUser: !!currentUser,
        userRole
      });
      return;
    }

    // Data is reactive via Convex queries; no explicit fetch required
    if (!hasInitialized.current) hasInitialized.current = true;
  }, [authInitialized, hasAccess, userRole, currentUser]);

  // Show loading state while authentication is being determined
  if (!authInitialized || !currentUser) {
    return (
      <AdminPortalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <RefreshCw className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold mb-2">Loading Dashboard</h2>
              <p className="text-muted-foreground">
                Please wait while we load your dashboard...
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminPortalLayout>
    );
  }

  // Redirect if user doesn't have dashboard access
  if (!hasAccess) {
    return (
      <AdminPortalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground mb-4">
                You don't have permission to access the admin dashboard.
                <br />
                <small>Current role: {userRole}</small>
              </p>
              <Button onClick={() => window.location.href = '/'}>
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminPortalLayout>
    );
  }



  // Get role-specific metrics display
  const getMetricCards = () => {
    const cards = [];

    if (userRole === 'admin') {
      cards.push(
        { key: 'totalUsers', title: 'Total Users', icon: 'Users', color: 'blue' },
        { key: 'totalArticles', title: 'Total Articles', icon: 'FileText', color: 'green' },
        { key: 'commentCount', title: 'Total Comments', icon: 'MessageSquare', color: 'purple' },
        { key: 'pendingReviews', title: 'Pending Reviews', icon: 'Clock', color: 'orange' }
      );
    } else if (userRole === 'moderator') {
      cards.push(
        { key: 'totalArticles', title: 'Total Articles', icon: 'FileText', color: 'green' },
        { key: 'commentCount', title: 'Total Comments', icon: 'MessageSquare', color: 'purple' },
        { key: 'pendingReviews', title: 'Pending Reviews', icon: 'Clock', color: 'orange' },
        { key: 'categoriesCount', title: 'Categories', icon: 'Folder', color: 'blue' }
      );
    } else if (userRole === 'author') {
      cards.push(
        { key: 'myArticles', title: 'My Articles', icon: 'FileText', color: 'green' },
        { key: 'articlesPublished', title: 'Published', icon: 'CheckCircle', color: 'blue' },
        { key: 'articlesInReview', title: 'In Review', icon: 'Clock', color: 'orange' },
        { key: 'myComments', title: 'Comments', icon: 'MessageSquare', color: 'purple' }
      );
    }

    return cards;
  };

  const metricCards = getMetricCards();

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{dashboardTitle}</h1>
            <p className="text-muted-foreground">
              {dashboardDescription}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Error loading dashboard: {error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}



        {/* Role-based Metrics Grid */}
        {!metricsQuery ? (
          <div className={`grid gap-4 ${metricCards.length <= 2 ? 'md:grid-cols-2' : metricCards.length <= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-5'}`}>
            {Array.from({ length: metricCards.length || 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : metricCards.length > 0 ? (
          <div className={`grid gap-4 ${metricCards.length <= 2 ? 'md:grid-cols-2' : metricCards.length <= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-5'}`}>
            {metricCards.map((card) => {
              const getIcon = (iconName: string) => {
                switch (iconName) {
                  case 'Users': return <Users className="h-5 w-5" />;
                  case 'FileText': return <FileText className="h-5 w-5" />;
                  case 'MessageSquare': return <MessageSquare className="h-5 w-5" />;
                  case 'Clock': return <Clock className="h-5 w-5" />;
                  case 'CheckCircle': return <CheckCircle className="h-5 w-5" />;
                  case 'Folder': return <Folder className="h-5 w-5" />;
                  case 'MessageCircle': return <MessageCircle className="h-5 w-5" />;
                  default: return <BarChart3 className="h-5 w-5" />;
                }
              };

              const value = metrics[card.key as keyof DashboardMetrics] || 0;

              // Color mapping for different metric types
              const colorClasses = {
                blue: 'bg-blue-100 text-blue-600',
                green: 'bg-green-100 text-green-600',
                orange: 'bg-orange-100 text-orange-600',
                purple: 'bg-purple-100 text-purple-600',
                red: 'bg-red-100 text-red-600'
              };

              return (
                <Card key={card.key}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
                      </div>
                      <div className={`p-2 rounded-full ${colorClasses[card.color as keyof typeof colorClasses] || colorClasses.blue}`}>
                        {getIcon(card.icon)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}

        {/* Recent Activity */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex space-x-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity to display
              </div>
            ) : (
              <div className="space-y-3">
            {activities.map((activity) => {
                  // Get user info from profile or fallback
                  const displayName = activity.profile?.display_name || 'Unknown User';
                  const avatarUrl = activity.profile?.avatar_url;
                  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  
                  // Create description from metadata or fallback
                  const description = activity.metadata?.description || 
                    `${displayName} performed ${activity.activity_type?.replace('_', ' ') || 'an action'}`;
                  
                  return (
                    <div key={activity.id} className="flex space-x-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={avatarUrl} alt={displayName} />
                          <AvatarFallback className="text-xs font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPortalLayout>
  );
};

export default Dashboard;
