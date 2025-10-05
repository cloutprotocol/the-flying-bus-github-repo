
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from 'lucide-react';
import { logError, getErrorInfo, formatErrorForUser } from '@/utils/errorHandling';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  component?: string;
  showDetails?: boolean;
  fullPage?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

/**
 * Enhanced Error Boundary component with comprehensive error handling
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Generate a unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced logging with our error handling utility
    logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      component: this.props.component || 'unknown',
      errorId: this.state.errorId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString()
    });

    // Legacy logger for compatibility
    logger.error(
      LogSource.APP, 
      `Error in component ${this.props.component || 'unknown'}`,
      { error, errorInfo, errorId: this.state.errorId }
    );

    // Store error info in state
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to external error tracking service if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        },
        tags: {
          errorBoundary: true,
          component: this.props.component,
          errorId: this.state.errorId
        }
      });
    }
  }

  private handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: undefined 
    });
  };

  private handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private handleCopyErrorId = () => {
    if (this.state.errorId && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.state.errorId).then(() => {
        toast({
          title: "Copied",
          description: "Error ID copied to clipboard",
        });
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = this.state.errorId!;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        toast({
          title: "Copied",
          description: "Error ID copied to clipboard",
        });
      });
    }
  };

  private handleReportBug = () => {
    if (typeof window !== 'undefined') {
      const subject = encodeURIComponent(`Bug Report - Error ID: ${this.state.errorId}`);
      const body = encodeURIComponent(`
Error Details:
- Error ID: ${this.state.errorId}
- Component: ${this.props.component || 'unknown'}
- Error Message: ${this.state.error?.message || 'Unknown error'}
- URL: ${window.location.href}
- Time: ${new Date().toISOString()}
- User Agent: ${navigator.userAgent}

Please describe what you were doing when this error occurred:

`);
      
      window.open(`mailto:support@kidsnews.com?subject=${subject}&body=${body}`);
    }
  };

  private renderFullPageError() {
    const error = this.state.error;
    const formattedError = formatErrorForUser(error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-2xl w-full shadow-lg">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Oops! Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {formattedError.message}
              </p>
              
              {this.state.errorId && (
                <div className="bg-gray-100 p-3 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        <strong>Error ID:</strong> {this.state.errorId}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Please include this ID if you contact support
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={this.handleCopyErrorId}
                      className="ml-2"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {this.props.showDetails && error && (
              <details className="bg-red-50 border border-red-200 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-red-800 mb-2">
                  Technical Details
                </summary>
                <div className="text-sm text-red-700 space-y-2">
                  <div>
                    <strong>Error:</strong> {error.message}
                  </div>
                  <div>
                    <strong>Type:</strong> {error.name}
                  </div>
                  <div>
                    <strong>Component:</strong> {this.props.component || 'unknown'}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 text-xs bg-red-100 p-2 rounded overflow-x-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleRefresh}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <Button 
                onClick={this.handleReportBug}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 mx-auto text-gray-600 hover:text-gray-800"
              >
                <Bug className="w-4 h-4" />
                Report this issue
              </Button>
            </div>

            {formattedError.recoveryActions && formattedError.recoveryActions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">What you can do:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {formattedError.recoveryActions.map((action, index) => (
                    <li key={index}>• {action}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  private renderInlineError() {
    const error = this.state.error;
    const formattedError = formatErrorForUser(error);

    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-medium">Something went wrong</h3>
        </div>
        
        <p className="text-sm text-gray-700 mb-4">
          {formattedError.message}
        </p>

        {this.state.errorId && (
          <div className="bg-gray-100 p-2 rounded text-xs mb-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                Error ID: {this.state.errorId}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleCopyErrorId}
                className="h-6 px-2"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
        
        {this.props.showDetails && error && (
          <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-4 overflow-auto max-h-[200px]">
            <div className="mb-2">
              <strong>Component:</strong> {this.props.component || 'unknown'}
            </div>
            <div className="mb-2">
              <strong>Error:</strong> {error.toString()}
            </div>
            {error.stack && (
              <div>
                <strong>Stack:</strong>
                <pre className="mt-1">{error.stack}</pre>
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleReset}
          >
            Try Again
          </Button>
          
          {formattedError.canRetry && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={this.handleReportBug}
            >
              <Bug className="w-3 h-3 mr-1" />
              Report
            </Button>
          )}
        </div>
      </div>
    );
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return this.props.fullPage ? this.renderFullPageError() : this.renderInlineError();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
