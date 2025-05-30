
import React, { useState, useEffect } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useArticleTypeSelection } from '@/contexts/ArticleTypeSelectionContext';
import { useUserArticles } from '@/hooks/useUserArticles';
import { useAuth } from '@/hooks/useAuth';
import MyArticlesErrorBoundary from '@/components/Admin/Common/MyArticlesErrorBoundary';
import ErrorDisplay from '@/components/Admin/Common/ErrorDisplay';

const MyArticlesContent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isContextReady, setIsContextReady] = useState(false);
  
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
          <div className="text-center py-8">
            <p>Loading your articles...</p>
          </div>
        ) : articles && articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article: any) => (
              <div key={article.id} className="border-b pb-4">
                <h3 className="font-medium">{article.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Status: {article.status} | Type: {article.article_type}
                </p>
              </div>
            ))}
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
    </div>
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
