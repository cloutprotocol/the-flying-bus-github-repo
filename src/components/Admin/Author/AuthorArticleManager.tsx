/**
 * Author Article Manager component
 * Allows authors to manage their own articles with ownership restrictions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PenLine, 
  Eye, 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  Send,
  Calendar,
  User,
  Plus,
  FileText,
  BarChart3
} from 'lucide-react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { 
  getArticlesByOwnership, 
  ArticleWithOwnership,
  ownershipUIUtils 
} from '@/services/articleOwnershipService';
import { requestArticleReview } from '@/services/articles/articleReviewService';
import ArticleReviewStatus from './ArticleReviewStatus';
import AuthorArticleCreator from './AuthorArticleCreator';
import { supabase } from '@/integrations/supabase/client';

// Use the ArticleWithOwnership interface from the service
type Article = ArticleWithOwnership & {
  category?: string;
  views?: number;
  comments_count?: number;
};

interface AuthorArticleManagerProps {
  className?: string;
}

export const AuthorArticleManager: React.FC<AuthorArticleManagerProps> = ({ className }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { user, userRole, canEditArticle } = useRoleBasedAccess();

  useEffect(() => {
    const fetchAuthorArticles = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Use the ownership service to fetch articles with permission flags
        const result = await getArticlesByOwnership(user.id);
        
        if (result.error) {
          throw new Error(result.error);
        }

        // Transform data to include additional fields
        const transformedArticles: Article[] = result.articles.map(article => ({
          ...article,
          category: undefined, // This would need to be fetched separately if needed
          views: 0, // This would need to be calculated from article_views table
          comments_count: 0 // This would need to be calculated from comments table
        }));

        setArticles(transformedArticles);
      } catch (err) {
        console.error('Error fetching author articles:', err);
        setError(err instanceof Error ? err.message : 'Failed to load articles');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorArticles();
  }, [user, userRole]);

  const handleSubmitForReview = async (articleId: string) => {
    try {
      // Use the enhanced review service
      const result = await requestArticleReview(articleId);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to submit article for review');
      }

      // Update local state
      setArticles(prev => prev.map(article => 
        article.id === articleId 
          ? { 
              ...article, 
              status: 'pending_review' as const, 
              submitted_for_review_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              can_edit: false // Can't edit while in review
            }
          : article
      ));

      alert('Article submitted for review successfully!');
    } catch (err) {
      console.error('Error submitting article for review:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit article for review. Please try again.');
    }
  };

  const handleDeleteArticle = async (articleId: string, article: Article) => {
    // Check if user has permission to delete
    if (!article.can_delete) {
      alert('You do not have permission to delete this article.');
      return;
    }

    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)
        .eq('author_id', user?.id); // Ensure user can only delete their own articles

      if (error) {
        throw error;
      }

      // Update local state
      setArticles(prev => prev.filter(article => article.id !== articleId));
      alert('Article deleted successfully!');
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Failed to delete article. Please try again.');
    }
  };

  // Filter articles based on search term and status
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Article['status']) => {
    const color = ownershipUIUtils.getStatusBadgeColor(status);
    const text = ownershipUIUtils.getStatusText(status);
    
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      gray: 'secondary',
      yellow: 'outline',
      green: 'default',
      red: 'destructive',
      blue: 'default'
    };

    return <Badge variant={variantMap[color] || 'secondary'}>{text}</Badge>;
  };

  if (userRole !== 'author') {
    return null;
  }

  const handleArticleCreated = (articleId: string) => {
    // Refresh the articles list
    fetchAuthorArticles();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Author Dashboard</h2>
          <p className="text-muted-foreground">
            Create, manage, and track your articles
          </p>
        </div>
      </div>

      <Tabs defaultValue="articles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            My Articles
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            Create Article
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-6">
          {/* Article Management Content */}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading articles: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PenLine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No articles found</h3>
            <p className="text-muted-foreground mb-4">
              {articles.length === 0 
                ? "You haven't written any articles yet. Start creating your first article!"
                : "No articles match your current filters."
              }
            </p>
            {articles.length === 0 && (
              <Button onClick={() => window.location.href = '/admin/articles/create'}>
                <PenLine className="h-4 w-4 mr-2" />
                Write Your First Article
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <Card key={article.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {article.content.substring(0, 150)}...
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(article.updated_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {article.views || 0} views
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {article.comments_count || 0} comments
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(article.status)}
                  </div>
                </div>
                
                {/* Review Status for non-draft articles */}
                {article.status !== 'draft' && (
                  <div className="mb-4">
                    <ArticleReviewStatus
                      articleId={article.id}
                      articleTitle={article.title}
                      currentStatus={article.status}
                      submittedAt={article.submitted_for_review_at}
                    />
                  </div>
                )}
                
                <div className="flex gap-2">
                  {ownershipUIUtils.shouldShowEditButton(article) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = `/admin/articles/edit/${article.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  
                  {ownershipUIUtils.shouldShowSubmitForReviewButton(article) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSubmitForReview(article.id)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {article.status === 'rejected' ? 'Resubmit' : 'Submit for Review'}
                    </Button>
                  )}
                  
                  {ownershipUIUtils.shouldShowPublishButton(article) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // This would be handled by admin users only
                        alert('Only administrators can publish articles directly.');
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Publish
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = `/articles/${article.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  
                  {ownershipUIUtils.shouldShowDeleteButton(article) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteArticle(article.id, article)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Article Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {articles.filter(a => a.status === 'draft').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Drafts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {articles.filter(a => a.status === 'pending_review').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending Review</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {articles.filter(a => a.status === 'published').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Published</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {articles.filter(a => a.status === 'rejected').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Rejected</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <AuthorArticleCreator onArticleCreated={handleArticleCreated} />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Article Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics coming soon...</p>
                <p className="text-sm">Track your article performance, views, and engagement.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthorArticleManager;