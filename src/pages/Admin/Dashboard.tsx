import React, { useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PenLine, 
  Eye, 
  MessageSquare, 
  BarChart3,
  AlertCircle 
} from 'lucide-react';
import useActivityFeed from '@/hooks/useActivityFeed';
import ActivityFeed from '@/components/Admin/Activity/ActivityFeed';
import { CardContent } from '@/components/ui/card';
import useDashboardMetrics from '@/hooks/useDashboardMetrics';
import RecentArticlesSection from '@/components/Admin/Dashboard/RecentArticlesSection';
import { StatusType } from '@/components/Admin/Status/StatusBadge';

interface DashboardRecentArticle {
  id: string;
  title: string;
  status: StatusType;
  lastEdited: string;
}

const ARTICLES_PER_PAGE = 5;

const Dashboard: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { metrics, loading, error, refetchMetrics } = useDashboardMetrics();
  const [totalPages, setTotalPages] = useState(1);
  
  const { 
    activities, 
    loading: activitiesLoading,
    selectedTypes,
    setSelectedTypes 
  } = useActivityFeed(10);

  const mapArticles = (): DashboardRecentArticle[] => {
    if (!metrics?.recentArticles) return [];
    
    return metrics.recentArticles.map(article => ({
      id: article.id,
      title: article.title,
      status: article.status as StatusType,
      lastEdited: article.lastEdited
    }));
  };

  const handlePageChange = async (page: number) => {
    setCurrentPage(page);
    await refetchMetrics(page, ARTICLES_PER_PAGE);
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

        <section>
          <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
          <Card className="p-4">
            <ActivityFeed 
              activities={activities} 
              isLoading={activitiesLoading}
              selectedTypes={selectedTypes}
              onFilterChange={setSelectedTypes}
            />
          </Card>
        </section>

        <RecentArticlesSection 
          articles={mapArticles()}
          loading={loading}
          onRefresh={() => refetchMetrics(currentPage, ARTICLES_PER_PAGE)}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </AdminPortalLayout>
  );
};

export default Dashboard;
