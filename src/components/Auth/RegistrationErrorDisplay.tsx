import React from 'react';
import { AlertCircle, RefreshCw, ExternalLink, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  RegistrationErrorDetails, 
  ErrorRecoveryAction, 
  RegistrationErrorType 
} from '@/types/RegistrationErrorTypes';

interface RegistrationErrorDisplayProps {
  error: RegistrationErrorDetails | null;
  onRetry?: () => void;
  onContactSupport?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const RegistrationErrorDisplay: React.FC<RegistrationErrorDisplayProps> = ({
  error,
  onRetry,
  onContactSupport,
  onDismiss,
  className = ''
}) => {
  if (!error) return null;

  const getErrorIcon = (type: RegistrationErrorType) => {
    switch (type) {
      case 'network':
        return <RefreshCw className="h-4 w-4" />;
      case 'validation':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getErrorVariant = (type: RegistrationErrorType) => {
    switch (type) {
      case 'validation':
        return 'default';
      case 'network':
        return 'default';
      case 'rls':
      case 'session':
      case 'unknown':
        return 'destructive';
      case 'invitation':
        return 'default';
      default:
        return 'destructive';
    }
  };

  const shouldShowRetry = error.retryable && onRetry;
  const shouldShowSupport = ['rls', 'unknown', 'invitation'].includes(error.type) && onContactSupport;

  return (
    <div className={`space-y-3 ${className}`}>
      <Alert variant={getErrorVariant(error.type)}>
        <div className="flex items-start space-x-2">
          {getErrorIcon(error.type)}
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
      {(shouldShowRetry || shouldShowSupport || onDismiss) && (
        <div className="flex flex-wrap gap-2">
          {shouldShowRetry && (
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
          
          {shouldShowSupport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onContactSupport}
              className="flex items-center space-x-1"
            >
              <Mail className="h-3 w-3" />
              <span>Contact Support</span>
            </Button>
          )}
          
          {error.helpUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(error.helpUrl, '_blank')}
              className="flex items-center space-x-1"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Help</span>
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

      {/* Technical details for development */}
      {process.env.NODE_ENV === 'development' && error.technicalDetails && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Technical Details</summary>
          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify({
              code: error.code,
              type: error.type,
              message: error.message,
              technicalDetails: error.technicalDetails,
              context: error.context
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

// Field-specific error display for form validation
interface FieldErrorDisplayProps {
  error?: string;
  className?: string;
}

export const FieldErrorDisplay: React.FC<FieldErrorDisplayProps> = ({
  error,
  className = ''
}) => {
  if (!error) return null;

  return (
    <p className={`text-sm text-destructive flex items-center space-x-1 ${className}`}>
      <AlertCircle className="h-3 w-3" />
      <span>{error}</span>
    </p>
  );
};

// Global error boundary for registration flows
interface RegistrationErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

interface RegistrationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class RegistrationErrorBoundary extends React.Component<
  RegistrationErrorBoundaryProps,
  RegistrationErrorBoundaryState
> {
  constructor(props: RegistrationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RegistrationErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Registration Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return (
        <div className="p-4 border border-destructive rounded-lg">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Registration Error
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Something went wrong during registration. Please try again.
          </p>
          <Button onClick={this.retry} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}