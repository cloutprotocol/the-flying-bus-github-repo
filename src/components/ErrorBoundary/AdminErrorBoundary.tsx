import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{error: Error, retry: () => void}>;
  section?: string;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  lastRetryTime: number;
}

const MAX_RETRIES = 3;
const RETRY_COOLDOWN = 5000; // 5 seconds

export class AdminErrorBoundary extends Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      lastRetryTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AdminErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging without affecting user experience
    console.error(`Admin Dashboard Error in ${this.props.section || 'unknown section'}:`, error, errorInfo);
    
    // Optional: Send to monitoring service
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      (window as any).errorReporting.captureException(error, {
        section: this.props.section,
        errorInfo
      });
    }
  }

  handleRetry = () => {
    const now = Date.now();
    const { retryCount, lastRetryTime } = this.state;

    // Prevent rapid retries that could cause infinite loops
    if (now - lastRetryTime < RETRY_COOLDOWN) {
      return;
    }

    // Prevent excessive retries
    if (retryCount >= MAX_RETRIES) {
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      retryCount: retryCount + 1,
      lastRetryTime: now
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent } = this.props;
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <DefaultErrorFallback 
          error={this.state.error}
          section={this.props.section}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          canRetry={this.state.retryCount < MAX_RETRIES}
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error | null;
  section?: string;
  retryCount: number;
  onRetry: () => void;
  canRetry: boolean;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  section,
  retryCount,
  onRetry,
  canRetry
}) => {
  const sectionName = section || 'section';
  
  return (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <Alert className="border-red-200">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="space-y-2">
            <p className="font-medium">
              Failed to load {sectionName}
            </p>
            <p className="text-sm text-red-600">
              {error?.message || 'An unexpected error occurred'}
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-red-500">
                Retry attempts: {retryCount}/{MAX_RETRIES}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
      
      <div className="mt-3 flex gap-2">
        {canRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.reload()}
          className="text-red-700 hover:bg-red-100"
        >
          Refresh Page
        </Button>
      </div>
    </div>
  );
};

export default AdminErrorBoundary;