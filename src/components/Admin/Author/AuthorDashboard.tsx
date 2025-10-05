/**
 * Author-specific dashboard component
 * Provides a simplified dashboard view for authors with their own content metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PenLine, 
  Eye, 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  BarChart3
} from 'lucide-react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { calculateRoleBasedMetrics } from '@/services/roleBasedMetricsService';
import { DashboardMetrics } from '@/services/dashboardConfigService';

interface AuthorDashboardProps {
  className?: string;
}

export const AuthorDashboard: React.FC<AuthorDashboardProps> = ({ className }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, userRole } = useRoleBasedAccess();

  useEffect(() => {
    const fetchAuthorMetrics = async () => {
      if (userRole !== 'author' || !user) return;
      
      try {
        setLoading(true);
        setError(null);
        const authorMetrics = await calculateRoleBasedMetrics(user);
        setMetrics(authorMetrics);
      } catch (err) {
        console.error('Error fetching author metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorMetrics();
  }, [user, userRole]);

  if (userRole !== 'author') {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Author Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Welcome, {user?.display_name || user?.username}!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Here's an overview of your content performance and writing activity.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.href = '/admin/articles/create'}>
              <PenLine className="h-4 w-4 mr-2" />
              Write New Article
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/admin/articles/my-articles'}>
              <FileText className="h-4 w-4 mr-2" />
              My Articles
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading dashboard: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Author Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Articles</p>
                <p className="text-3xl font-bold">
                  {loading ? '...' : (metrics.myArticles || 0)}
                </p>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                <p className="text-3xl font-bold">
                  {loading ? '...' : (metrics.myArticleViews || 0)}
                </p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Comments</p>
                <p className="text-3xl font-bold">
                  {loading ? '...' : (metrics.myComments || 0)}
                </p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Review</p>
                <p className="text-3xl font-bold">
                  {loading ? '...' : (metrics.articlesInReview || 0)}
                </p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Article Status Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Published Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {loading ? '...' : (metrics.articlesPublished || 0)}
            </div>
            <p className="text-sm text-muted-foreground">
              Articles that have been approved and published
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => window.location.href = '/admin/articles/my-articles?status=published'}
            >
              View Published
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {loading ? '...' : (metrics.articlesInReview || 0)}
            </div>
            <p className="text-sm text-muted-foreground">
              Articles waiting for admin approval
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => window.location.href = '/admin/articles/my-articles?status=pending_review'}
            >
              View Pending
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Authors */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.location.href = '/admin/articles/create'}
            >
              <PenLine className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Write Article</div>
                <div className="text-sm text-muted-foreground">Create new content</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.location.href = '/admin/articles/my-articles'}
            >
              <FileText className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">My Articles</div>
                <div className="text-sm text-muted-foreground">Manage your content</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.location.href = '/admin/analytics/my-content'}
            >
              <BarChart3 className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">My Analytics</div>
                <div className="text-sm text-muted-foreground">View performance</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.location.href = '/admin/comments/my-articles'}
            >
              <MessageSquare className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">My Comments</div>
                <div className="text-sm text-muted-foreground">Moderate comments</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Writing Tips for Authors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Writing Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-1 rounded-full">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Keep it engaging</p>
                <p className="text-sm text-muted-foreground">
                  Use storytelling techniques to keep young readers interested
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1 rounded-full">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Age-appropriate content</p>
                <p className="text-sm text-muted-foreground">
                  Ensure your content is suitable for our young audience
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-1 rounded-full">
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Include visuals</p>
                <p className="text-sm text-muted-foreground">
                  Add images or graphics to make your articles more appealing
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthorDashboard;