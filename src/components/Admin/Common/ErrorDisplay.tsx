
import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Error',
  message,
  details,
  onRetry,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Alert variant="destructive" className={`bg-red-50 ${className}`}>
      <AlertCircle className="h-4 w-4 mr-2" />
      <div className="space-y-2">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="text-sm">
          {message}
        </AlertDescription>
        
        {details && (
          <div className="mt-2">
            {showDetails ? (
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-[200px] mt-2">
                {details}
              </pre>
            ) : (
              <Button 
                variant="link" 
                size="sm"
                className="p-0 h-auto text-xs"
                onClick={() => setShowDetails(true)}
              >
                Show details
              </Button>
            )}
          </div>
        )}
        
        {onRetry && (
          <div className="mt-3">
            <Button
              variant="default"
              size="sm"
              onClick={onRetry}
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </Alert>
  );
};

export default ErrorDisplay;
