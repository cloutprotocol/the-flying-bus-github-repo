
import React, { useState, useEffect } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Search, Filter, Eye, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useArticleTypeSelection } from '@/contexts/ArticleTypeSelectionContext';
import { useUserArticles } from '@/hooks/useUserArticles';
import { useAuth } from '@/hooks/useAuth';
import MyArticlesErrorBoundary from '@/components/Admin/Common/MyArticlesErrorBoundary';
import ErrorDisplay from '@/components/Admin/Common/ErrorDisplay';
import { Link } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import ArticlePaginationControls from '@/components/Admin/Dashboard/ArticlePaginationControls';

const MyArticlesContent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isContextReady, setIsContextReady] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);
  
  // Add error handling for context
  let openModal: (() => void) | null = null;
  try {
    const context = useArticleTypeSelection();
    openModal = context?.openModal || null;
  } catch (error) {
    console.error('Error accessing ArticleTypeSelection context:', error);
  }

  // Add error handling for auth
  let currentUser: any = null;
  try {
    const auth = useAuth();
    currentUser = auth?.currentUser || null;
    console.log('MyArticles - Auth state:', { 
      isLoggedIn: !!currentUser, 
      userId: currentUser?.id?.substring(0, 8) 
    });
  } catch (error) {
    console.error('Error accessing Auth context:', error);
  }

  // Add error handling for user articles
  let articlesData: any = {
    articles: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    totalPages: 1,
    handlePageChange: () => {},
    deleteArticle: async () => {},
    refreshArticles: () => {}
  };

  try {
    articlesData = useUserArticles();
    console.log('MyArticles - Articles data:', {
      articlesCount: articlesData.articles?.length || 0,
      isLoading: articlesData.isLoading,
      hasError: !!articlesData.error
    });
  } catch (error) {
    console.error('Error accessing user articles:', error);
  }

  const { 
    articles, 
    isLoading, 
    error, 
    totalCount, 
    currentPage, 
    totalPages, 
    handlePageChange, 
    deleteArticle, 
    refreshArticles 
  } = articlesData;

  useEffect(() => {
    console.log('MyArticles component mounting...');
    try {
      setIsContextReady(true);
      console.log('MyArticles component mounted successfully');
    } catch (error) {
      console.error('Error during MyArticles mount:', error);
    }
  }, []);

  // Handle missing context gracefully
  const handleNewArticle = () => {
    if (openModal) {
      openModal();
    } else {
      console.warn('Article type selection context not available');
      // Fallback navigation
      window.location.href = '/admin/articles/new';
    }
  };

  const handleDelete = async () => {
    if (!articleToDelete) return;
    
    try {
      await deleteArticle(articleToDelete);
    } catch (error) {
      console.error('Error deleting article:', error);
    }
    
    setArticleToDelete(null);
  };

  const isViewable = (status: string) => {
    return status === 'published';
  };

  const getViewTooltipContent = (status: string) => {
    if (status === 'published') return 'View article';
    return `Article must be published to view (current status: ${status})`;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'published':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Show error state if there are critical issues
  if (error && !isLoading) {
    return (
      <div className="p-6">
        <ErrorDisplay
          title="Failed to Load Articles"
          message={error.message || "Unable to load your articles at this time."}
          onRetry={refreshArticles}
        />
      </div>
    );
  }

  if (!isContextReady) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p>Loading articles...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Articles</h1>
            <p className="text-muted-foreground">
              Manage and view all your articles
            </p>
          </div>
          <Button onClick={handleNewArticle} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Article
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2">
                  <div className="space-y-1">
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : articles && articles.length > 0 ? (
            <div className="space-y-2">
              {articles.map((article: any) => (
                <div key={article.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{article.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Last edited {new Date(article.updated_at).toLocaleDateString()}</span>
                      <Badge variant={getStatusVariant(article.status)} className="text-xs">
                        {article.status}
                      </Badge>
                      <span>Type: {article.article_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={!isViewable(article.status)}
                            className={!isViewable(article.status) ? 'opacity-50 cursor-not-allowed' : ''}
                            asChild={isViewable(article.status)}
                          >
                            {isViewable(article.status) ? (
                              <Link to={`/articles/${article.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {getViewTooltipContent(article.status)}
                      </TooltipContent>
                    </Tooltip>
                    
                    <Link to={`/admin/articles/${article.id}`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setArticleToDelete(article.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <ArticlePaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No articles found. Create your first article to get started!</p>
              <Button onClick={handleNewArticle} className="mt-4">
                Create Your First Article
              </Button>
            </div>
          )}
        </Card>

        <AlertDialog open={!!articleToDelete} onOpenChange={() => setArticleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                article and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

const MyArticles = () => {
  console.log('MyArticles wrapper component rendering...');
  
  return (
    <MyArticlesErrorBoundary>
      <AdminPortalLayout>
        <MyArticlesContent />
      </AdminPortalLayout>
    </MyArticlesErrorBoundary>
  );
};

export default MyArticles;
