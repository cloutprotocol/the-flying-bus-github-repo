/**
 * Author Article Manager component
 * Allows authors to manage their own articles with ownership restrictions
 */

import React, { useState } from 'react';
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
  Calendar,
  AlertCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  Send,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import ArticleReviewStatus from './ArticleReviewStatus';
import AuthorArticleCreator from './AuthorArticleCreator';
import AuthorAnalytics from './AuthorAnalytics';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

interface AuthorArticleManagerProps {
  className?: string;
}

export const AuthorArticleManager: React.FC<AuthorArticleManagerProps> = ({ className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { user, userRole } = useRoleBasedAccess();

  // Convex Hooks
  const articles = useQuery(api.articles.getByAuthor, user ? {} : "skip");
  const requestReviewMutation = useMutation(api.articles.requestReview);
  const deleteMutation = useMutation(api.articles.remove);
  const updateStatusMutation = useMutation(api.articles.updateStatus);

  const handleSubmitForReview = async (articleId: Id<"articles">) => {
    try {
      await requestReviewMutation({ articleId });
      alert('Article submitted for review successfully!');
    } catch (err) {
      console.error('Error submitting article for review:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit article for review.');
    }
  };

  const handlePublishArticle = async (articleId: Id<"articles">) => {
    try {
      if (!confirm('Are you sure you want to publish this article immediately?')) return;
      await updateStatusMutation({ id: articleId, status: 'published' });
      alert('Article published successfully!');
    } catch (err) {
      console.error('Error publishing article:', err);
      alert('Failed to publish article.');
    }
  };

  const handleDeleteArticle = async (articleId: Id<"articles">) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMutation({ id: articleId });
      alert('Article deleted successfully!');
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Failed to delete article. Please try again.');
    }
  };

  // UI Helper Logic (Replacements for ownershipUIUtils)
  const shouldShowEditButton = (status: string) => status !== 'pending_review';
  const shouldShowSubmitForReviewButton = (status: string) =>
    status === 'draft' || status === 'rejected' || status === 'needs_changes';
  const shouldShowDeleteButton = (status: string) => true; // Authors can usually delete their own stuff

  // Filter articles
  const filteredArticles = articles?.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      pending_review: 'outline',
      published: 'default',
      rejected: 'destructive',
      needs_changes: 'destructive'
    };

    // Normalize status string for display
    const label = status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return <Badge variant={variantMap[status] || 'secondary'}>{label}</Badge>;
  };

  if (userRole !== 'author' && userRole !== 'admin') {
    return null; // Or show unauthorized message
  }

  const handleArticleCreated = () => {
    // Convex automatically updates the query
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
            <FileTextIcon className="h-4 w-4" />
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
                    <option value="published">Published</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Articles List */}
          {articles === undefined ? (
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
                  {articles && articles.length === 0
                    ? "You haven't written any articles yet. Start creating your first article!"
                    : "No articles match your current filters."
                  }
                </p>
                {articles && articles.length === 0 && (
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
                <Card key={article._id}>
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
                            {article.view_count || 0} views
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {article.comment_count || 0} comments
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
                          articleId={article._id}
                          articleTitle={article.title}
                          currentStatus={article.status as any}
                          submittedAt={article.submitted_for_review_at}
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {shouldShowEditButton(article.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/admin/articles/edit/${article._id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}

                      {shouldShowSubmitForReviewButton(article.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitForReview(article._id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {article.status === 'rejected' ? 'Resubmit' : 'Submit for Review'}
                        </Button>
                      )}

                      {/* Publish button - Admin only placeholder logic */}
                      {userRole === 'admin' && article.status !== 'published' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePublishArticle(article._id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Publish
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/article/${article._id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>

                      {shouldShowDeleteButton(article.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteArticle(article._id)}
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
          {articles && (
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
          )}
        </TabsContent>

        <TabsContent value="create">
          <AuthorArticleCreator onArticleCreated={handleArticleCreated} />
        </TabsContent>

        <TabsContent value="analytics">
          <AuthorAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper component icon
const FileTextIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
);

export default AuthorArticleManager;