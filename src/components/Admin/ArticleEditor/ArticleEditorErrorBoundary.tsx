
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ArticleEditorErrorBoundaryProps {
  children: React.ReactNode;
}

const ArticleEditorErrorBoundary: React.FC<ArticleEditorErrorBoundaryProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleError = (error: Error, errorInfo: any) => {
    console.error('Article Editor Error:', error, errorInfo);
  };

  const fallback = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Article Editor Error
        </h2>
        <p className="text-gray-600 mb-6">
          Something went wrong while loading the article editor. This might be due to a configuration issue or missing data.
        </p>
        <div className="space-y-3">
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full"
          >
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/my-articles')}
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to My Articles
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      onError={handleError}
      fallback={fallback}
      component="ArticleEditor"
    >
      {children}
    </ErrorBoundary>
  );
};

export default ArticleEditorErrorBoundary;
