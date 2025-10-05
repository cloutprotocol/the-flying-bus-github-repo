import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RegistrationErrorDetails } from '@/types/RegistrationErrorTypes';

interface RegistrationErrorDisplayProps {
  error: RegistrationErrorDetails | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const RegistrationErrorDisplay: React.FC<RegistrationErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = ''
}) => {
  if (!error) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <Alert variant="destructive">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4" />
          <div className="flex-1">
            <AlertDescription className="text-sm">
              {error.userMessage}
            </AlertDescription>
            
            {error.suggestedAction && (
              <p className="text-xs text-muted-foreground mt-1">
                {error.suggestedAction}
              </p>
            )}
          </div>
        </div>
      </Alert>

      {/* Action buttons */}
      {(onRetry || onDismiss) && (
        <div className="flex flex-wrap gap-2">
          {error.retryable && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Try Again</span>
            </Button>
          )}
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </div>
      )}
    </div>
  );
};