
import React from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Card, CardContent } from '@/components/ui/card';
import { PenLine, Eye, MessageSquare, BarChart3 } from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import RecentArticlesSection from '@/components/Admin/Dashboard/RecentArticlesSection';
import { StatusType } from '@/components/Admin/Status/StatusBadge';

// Define interface to ensure type safety when mapping from API response
interface DashboardRecentArticle {
  id: string;
  title: string;
  status: StatusType;
  lastEdited: string;
}

const Dashboard = () => {
  const { metrics, loading, error, refetchMetrics } = useDashboardMetrics();
  
  // Map API response articles to component-expected format
  const mapArticles = (): DashboardRecentArticle[] => {
    if (!metrics?.recentArticles) return [];
    
    return metrics.recentArticles.map(article => ({
      id: article.id,
      title: article.title,
      // Ensure status is cast to StatusType
      status: article.status as StatusType,
      lastEdited: article.lastEdited
    }));
  };
  
  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to The Flying Bus author portal. Here's an overview of your content.
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Articles</p>
                  <p className="text-3xl font-bold">{metrics?.totalArticles || 0}</p>
                </div>
                <div className="bg-primary/10 p-2 rounded-full">
                  <PenLine className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Article Views</p>
                  <p className="text-3xl font-bold">{metrics?.articleViews || 0}</p>
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
                  <p className="text-3xl font-bold">{metrics?.commentCount || 0}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Engagement Rate</p>
                  <p className="text-3xl font-bold">{metrics?.engagementRate || 0}%</p>
                </div>
                <div className="bg-purple-100 p-2 rounded-full">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <RecentArticlesSection 
          articles={mapArticles()}
          loading={loading}
          onRefresh={refetchMetrics}
        />
      </div>
    </AdminPortalLayout>
  );
};

export default Dashboard;
