
import React, { useEffect, useState } from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import ArticleForm from '@/components/Admin/ArticleEditor/ArticleForm';
import ArticleEditorErrorBoundary from '@/components/Admin/ArticleEditor/ArticleEditorErrorBoundary';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, List, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ArticleEditor = () => {
  const { articleId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const isNewArticle = !articleId;

  // Get article type and category from location state (from modal selection)
  const articleType = location.state?.articleType || 'standard';
  const categorySlug = location.state?.categorySlug;
  const categoryName = location.state?.categoryName;

  useEffect(() => {
    console.log('ArticleEditor: Component mounting with props:', {
      articleId,
      isNewArticle,
      articleType,
      categorySlug,
      categoryName,
      locationState: location.state
    });

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
    
    logger.info(LogSource.EDITOR, 'Article editor opened', { 
      isNewArticle, 
      articleType,
      categorySlug,
      articleId: articleId || undefined,
      currentPath: location.pathname
    });
    
    checkAuth();
  }, [navigate, location.pathname, toast, isNewArticle, articleType, articleId, categorySlug]);

  // Initialize the component after auth check
  useEffect(() => {
    if (isAuthChecked && !authError) {
      console.log('ArticleEditor: Initializing component...');
      setIsInitialized(true);
    }
  }, [isAuthChecked, authError]);

  // Log when component unmounts to detect navigation issues
  useEffect(() => {
    return () => {
      logger.info(LogSource.EDITOR, 'Article editor unmounting', {
        isNewArticle,
        articleId: articleId || undefined
      });
    };
  }, [articleId, isNewArticle]);

  const handleNavigation = (path: string | number, options?: any) => {
    // Convert number to string if path is a number (e.g. -1 for navigate(-1))
    if (typeof path === 'number') {
      logger.info(LogSource.EDITOR, `Navigation requested: going back ${path} steps`);
      navigate(path as any);
    } else {
      const pathValue = String(path);
      logger.info(LogSource.EDITOR, `Navigation requested to ${pathValue}`, { options });
      console.log(`Navigating to ${pathValue}`, options);
      navigate(pathValue, options);
    }
  };

  // Determine page title based on whether we have category information
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

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <AdminPortalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Initializing editor...</p>
          </div>
        </div>
      </AdminPortalLayout>
    );
  }

  return (
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
                onClick={() => {
                  console.log("Navigating to articles list from header");
                  handleNavigation('/admin/my-articles', { replace: true });
                }}
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
  );
};

export default ArticleEditor;
