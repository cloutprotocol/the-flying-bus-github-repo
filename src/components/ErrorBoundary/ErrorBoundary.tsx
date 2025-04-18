
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  component?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch and handle errors in React components
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error(
      LogSource.APP, 
      `Error in component ${this.props.component || 'unknown'}`,
      { error, errorInfo }
    );
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-medium">Something went wrong</h3>
          </div>
          
          <p className="text-sm text-gray-700 mb-4">
            We encountered an error loading this component.
          </p>
          
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-4 overflow-auto max-h-[200px]">
              {this.state.error.toString()}
            </div>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleReset}
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
