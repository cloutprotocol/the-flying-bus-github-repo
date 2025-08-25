import React from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export interface UserFeedbackProps {
  type: 'error' | 'success' | 'loading' | 'info';
  title?: string;
  message: string;
  details?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  showProgress?: boolean;
  progress?: number;
  estimatedTime?: string;
  nextSteps?: string[];
  className?: string;
}

export const UserFeedback: React.FC<UserFeedbackProps> = ({
  type,
  title,
  message,
  details,
  showRetry = false,
  onRetry,
  retryLabel = 'Try Again',
  showProgress = false,
  progress = 0,
  estimatedTime,
  nextSteps,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'info':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getAlertVariant = () => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'success':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Alert variant={getAlertVariant()} className={`${className}`}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 space-y-2">
          {title && (
            <h4 className="font-medium text-sm">{title}</h4>
          )}
          
          <AlertDescription className="text-sm">
            {message}
          </AlertDescription>

          {details && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                Technical Details
              </summary>
              <p className="mt-1 font-mono bg-muted p-2 rounded text-xs">
                {details}
              </p>
            </details>
          )}

          {showProgress && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress}% complete</span>
                {estimatedTime && <span>Est. {estimatedTime}</span>}
              </div>
            </div>
          )}

          {nextSteps && nextSteps.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Next steps:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
};