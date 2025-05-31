
import React, { useEffect, useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import ArticleForm from '@/components/Admin/ArticleEditor/ArticleForm';
import ArticleEditorErrorBoundary from '@/components/Admin/ArticleEditor/ArticleEditorErrorBoundary';
import { DebugProvider } from '@/providers/DebugProvider';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, List, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ArticleEditor = () => {
  const { articleId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  const isNewArticle = !articleId;
  
  // Safely extract location state with defaults
  const locationState = location.state || {};
  const articleType = locationState.articleType || 'standard';
  const categorySlug = locationState.categorySlug;
  const categoryName = locationState.categoryName;

  useEffect(() => {
    console.log('ArticleEditor: Component mounting with props:', {
      articleId,
      isNewArticle,
      articleType,
      categorySlug,
      categoryName,
      locationState
    });

    // Validate required data for new articles
    if (isNewArticle && !categorySlug && !categoryName) {
      console.warn('ArticleEditor: New article without category information');
      setInitializationError('Missing category information for new article');
    }

    const checkAuth = async () => {
      try {
        console.log('ArticleEditor: Checking authentication...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('ArticleEditor: Auth error:', error);
          setAuthError(error.message);
          return;
        }
        
        if (!session) {
          console.log('ArticleEditor: No session found, redirecting to login');
          toast({
            title: "Authentication required",
            description: "You need to be signed in to create or edit articles.",
            variant: "destructive"
          });
          navigate('/login', { state: { returnTo: location.pathname } });
          return;
        }
        
        console.log('ArticleEditor: Authentication successful, user:', session.user.email);
        setIsAuthChecked(true);
      } catch (error) {
        console.error('ArticleEditor: Exception during auth check:', error);
        setAuthError(error instanceof Error ? error.message : 'Unknown auth error');
      }
    };
    
    checkAuth();
  }, [navigate, location.pathname, toast, isNewArticle, articleType, articleId, categorySlug, categoryName]);

  const handleNavigation = (path: string | number) => {
    if (typeof path === 'number') {
      navigate(path as any);
    } else {
      console.log(`Navigating to ${path}`);
      navigate(path);
    }
  };

  const getPageTitle = () => {
    if (isNewArticle && categoryName) {
      return `Create New ${categoryName} Article`;
    }
    return isNewArticle ? 'Create New Article' : 'Edit Article';
  };

  const getPageDescription = () => {
    if (isNewArticle && categoryName) {
      return `Create a new article for the ${categoryName} category`;
    }
    return isNewArticle
      ? 'Create a new article for publication'
      : 'Make changes to your article';
  };

  // Show loading state while checking auth
  if (!isAuthChecked) {
    return (
      <AdminPortalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </AdminPortalLayout>
    );
  }

  // Show auth error if there is one
  if (authError) {
    return (
      <AdminPortalLayout>
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Authentication Error: {authError}
            </AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </AdminPortalLayout>
    );
  }

  // Show initialization error for new articles without proper category data
  if (initializationError) {
    return (
      <AdminPortalLayout>
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {initializationError}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/my-articles')}>
              Go to My Articles
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/articles/new')}
            >
              Try Again
            </Button>
          </div>
        </div>
      </AdminPortalLayout>
    );
  }

  return (
    <DebugProvider>
      <ArticleEditorErrorBoundary>
        <AdminPortalLayout>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {getPageTitle()}
                </h1>
                <p className="text-muted-foreground">
                  {getPageDescription()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleNavigation(-1)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleNavigation('/admin/my-articles')}
                >
                  <List className="h-4 w-4 mr-1" /> All Articles
                </Button>
              </div>
            </div>
            
            <ArticleForm 
              articleId={articleId} 
              articleType={articleType}
              isNewArticle={isNewArticle}
              categorySlug={categorySlug}
              categoryName={categoryName}
            />
          </div>
        </AdminPortalLayout>
      </ArticleEditorErrorBoundary>
    </DebugProvider>
  );
};

export default ArticleEditor;
