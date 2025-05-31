
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FormErrorBoundaryProps {
  children: React.ReactNode;
}

const FormErrorBoundary: React.FC<FormErrorBoundaryProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleError = (error: Error, errorInfo: any) => {
    console.error('Form Error:', error, errorInfo);
    
    // Log specific form-related errors
    if (error.message.includes('getFieldState') || error.message.includes('form context')) {
      console.error('React Hook Form context error detected');
    }
  };

  const fallback = (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Form Loading Error</p>
            <p className="text-sm">
              There was an issue loading the article form. This might be due to missing form context or invalid data.
            </p>
          </div>
        </AlertDescription>
      </Alert>
      
      <div className="flex gap-3">
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reload Page
        </Button>
        <Button 
          onClick={() => navigate('/admin/my-articles')}
          className="flex items-center gap-2"
        >
          Return to Articles
        </Button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      onError={handleError}
      fallback={fallback}
      component="ArticleForm"
    >
      {children}
    </ErrorBoundary>
  );
};

export default FormErrorBoundary;
