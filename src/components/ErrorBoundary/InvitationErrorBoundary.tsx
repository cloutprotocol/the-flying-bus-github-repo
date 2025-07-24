import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Mail, Home } from 'lucide-react';
import { invitationErrorHandler } from '@/services/invitationErrorHandler';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Error boundary specifically designed for invitation-related components
 * Provides graceful error handling with user-friendly messages and recovery options
 * Requirements: 5.5, 7.1, 7.2
 */
export class InvitationErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      errorInfo,
      errorId
    });

    // Log error with comprehensive context
    logger.error(LogSource.AUTH, 'Invitation component error caught by boundary', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });

    // Handle error through our error handler
    try {
      await invitationErrorHandler.handleError(error, {
        operation: 'component_render',
        additionalData: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          retryCount: this.state.retryCount
        }
      });
    } catch (handlingError) {
      logger.error(LogSource.AUTH, 'Error in error handler', handlingError);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Format error for display
      const errorDisplay = invitationErrorHandler.formatErrorForUI(this.state.error);
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold text-gray-900">
                {errorDisplay.title}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <Alert variant={errorDisplay.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertDescription>
                  {errorDisplay.message}
                </AlertDescription>
              </Alert>

              {errorDisplay.suggestions.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">What you can try:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {errorDisplay.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    className="flex-1"
                    variant="default"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                )}
                
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {errorDisplay.supportInfo.showContact && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Need Help?</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {errorDisplay.supportInfo.message}
                      </p>
                      {this.state.errorId && (
                        <p className="text-xs text-gray-500">
                          Error ID: {this.state.errorId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {import.meta.env.DEV && this.state.error && (
                <details className="bg-gray-100 p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Developer Information
                  </summary>
                  <div className="text-xs text-gray-600 space-y-2">
                    <div>
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with invitation error boundary
 */
export function withInvitationErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <InvitationErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </InvitationErrorBoundary>
  );

  WrappedComponent.displayName = `withInvitationErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default InvitationErrorBoundary;