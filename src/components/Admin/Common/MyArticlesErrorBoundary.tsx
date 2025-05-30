
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import ErrorDisplay from '@/components/Admin/Common/ErrorDisplay';

interface MyArticlesErrorBoundaryProps {
  children: React.ReactNode;
}

const MyArticlesErrorBoundary: React.FC<MyArticlesErrorBoundaryProps> = ({ children }) => {
  const handleError = (error: Error, errorInfo: any) => {
    console.error('MyArticles component error:', error, errorInfo);
  };

  const fallback = (
    <div className="p-6">
      <ErrorDisplay
        title="Unable to Load Articles"
        message="There was an error loading your articles page. Please try refreshing the page."
        onRetry={() => window.location.reload()}
      />
    </div>
  );

  return (
    <ErrorBoundary 
      onError={handleError}
      fallback={fallback}
      component="MyArticles"
    >
      {children}
    </ErrorBoundary>
  );
};

export default MyArticlesErrorBoundary;
