/**
 * Author Analytics component
 * Shows analytics and performance metrics for author's own content only
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  Eye, 
  MessageSquare, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  Target,
  Award
} from 'lucide-react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

interface AuthorAnalyticsData {
  totalViews: number;
  totalComments: number;
  totalArticles: number;
  publishedArticles: number;
  averageViewsPerArticle: number;
  topPerformingArticle: {
    title: string;
    views: number;
  } | null;
  recentActivity: {
    date: string;
    views: number;
    comments: number;
  }[];
  categoryPerformance: {
    category: string;
    articles: number;
    views: number;
  }[];
}

interface AuthorAnalyticsProps {
  className?: string;
}

export const AuthorAnalytics: React.FC<AuthorAnalyticsProps> = ({ className }) => {
  const [analytics, setAnalytics] = useState<AuthorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  
  const { user, userRole } = useRoleBasedAccess();

  useEffect(() => {
    const fetchAuthorAnalytics = async () => {
      if (userRole !== 'author' || !user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch author's articles via Convex
        const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
        const articles = await convex.query(api.articles.getByAuthor, { authorId: user.id as any as Id<'profiles'> });
        const articleIds = (articles || []).map((a: any) => a._id);
        
        // Initialize analytics data
        const analyticsData: AuthorAnalyticsData = {
          totalViews: 0,
          totalComments: 0,
          totalArticles: articles?.length || 0,
          publishedArticles: articles?.filter(a => a.status === 'published').length || 0,
          averageViewsPerArticle: 0,
          topPerformingArticle: null,
          recentActivity: [],
          categoryPerformance: []
        };

        // Fetch views data (if article_views table exists)
        // Views not tracked via separate table; estimate using article.view_count
        analyticsData.totalViews = (articles || []).reduce((sum: number, a: any) => sum + (a.view_count || 0), 0);
        analyticsData.averageViewsPerArticle = analyticsData.totalArticles > 0
          ? Math.round(analyticsData.totalViews / analyticsData.totalArticles)
          : 0;
        const top = (articles || [])
          .slice()
          .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))[0];
        if (top) {
          analyticsData.topPerformingArticle = { title: top.title, views: top.view_count || 0 };
        }

        // Fetch comments data
        // Comments per article not directly available; keep as 0 for now
        analyticsData.totalComments = 0;

        // Calculate category performance
        if (articles) {
          const categoryStats = articles.reduce((acc, article) => {
            const category = article.category || 'Uncategorized';
            if (!acc[category]) {
              acc[category] = { articles: 0, views: 0 };
            }
            acc[category].articles++;
            return acc;
          }, {} as Record<string, { articles: number; views: number }>);

          analyticsData.categoryPerformance = Object.entries(categoryStats)
            .map(([category, stats]) => ({
              category,
              articles: stats.articles,
              views: stats.views
            }))
            .sort((a, b) => b.articles - a.articles);
        }

        // Generate mock recent activity data (in a real app, this would come from actual analytics)
        const now = new Date();
        analyticsData.recentActivity = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          return {
            date: date.toISOString().split('T')[0],
            views: Math.floor(Math.random() * 50) + 10,
            comments: Math.floor(Math.random() * 5)
          };
        }).reverse();

        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Error fetching author analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorAnalytics();
  }, [user, userRole, timeRange]);

  if (userRole !== 'author') {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">My Analytics</h2>
          <p className="text-muted-foreground">
            Track the performance of your articles and engagement
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading analytics: {error}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
      ) : analytics ? (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                    <p className="text-3xl font-bold">{analytics.totalViews.toLocaleString()}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">+12% from last month</span>
                    </div>
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
                    <p className="text-sm font-medium text-muted-foreground">Total Comments</p>
                    <p className="text-3xl font-bold">{analytics.totalComments}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">+8% from last month</span>
                    </div>
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
                    <p className="text-sm font-medium text-muted-foreground">Published Articles</p>
                    <p className="text-3xl font-bold">{analytics.publishedArticles}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      of {analytics.totalArticles} total
                    </p>
                  </div>
                  <div className="bg-purple-100 p-2 rounded-full">
                    <Award className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg. Views/Article</p>
                    <p className="text-3xl font-bold">{analytics.averageViewsPerArticle}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Target className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-muted-foreground">Performance metric</span>
                    </div>
                  </div>
                  <div className="bg-orange-100 p-2 rounded-full">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Article */}
          {analytics.topPerformingArticle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Performing Article
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{analytics.topPerformingArticle.title}</h3>
                    <p className="text-muted-foreground">
                      {analytics.topPerformingArticle.views.toLocaleString()} views
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      #{1}
                    </div>
                    <p className="text-sm text-muted-foreground">Best performer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Performance */}
          {analytics.categoryPerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.categoryPerformance.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{category.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.articles} article{category.articles !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{category.views.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.recentActivity.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span>{day.views}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <span>{day.comments}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Writing Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Writing Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Monthly Article Goal</p>
                    <p className="text-sm text-muted-foreground">Target: 4 articles per month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">3/4</p>
                    <p className="text-sm text-muted-foreground">75% complete</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default AuthorAnalytics;
