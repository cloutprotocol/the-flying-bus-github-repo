/**
 * Enhanced User Feedback Component
 * 
 * Provides comprehensive user feedback with specific error handling for RLS policy violations,
 * admin operations, and form submissions with retry mechanisms and detailed recovery guidance.
 */

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Loader2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Shield,
  Database,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { detectRLSError, generateRLSErrorMessage, type RLSErrorContext } from '@/utils/errorHandling/rlsErrorHandler';

export interface EnhancedFeedbackState {
  type: 'error' | 'success' | 'loading' | 'info' | 'warning' | null;
  title?: string;
  message: string;
  details?: string;
  showRetry?: boolean;
  retryLabel?: string;
  showProgress?: boolean;
  progress?: number;
  estimatedTime?: string;
  nextSteps?: string[];
  errorCode?: string;
  errorCategory?: 'rls_policy' | 'permission' | 'authentication' | 'database' | 'network' | 'validation';
  retryCount?: number;
  maxRetries?: number;
  isRetrying?: boolean;
  fallbackAvailable?: boolean;
  adminRequired?: boolean;
  context?: RLSErrorContext;
}

interface EnhancedUserFeedbackProps {
  feedback: EnhancedFeedbackState | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showDetailsByDefault?: boolean;
  enableAutoRetry?: boolean;
  autoRetryDelay?: number;
}

export const EnhancedUserFeedback: React.FC<EnhancedUserFeedbackProps> = ({
  feedback,
  onRetry,
  onDismiss,
  className,
  showDetailsByDefault = false,
  enableAutoRetry = false,
  autoRetryDelay = 3000
}) => {
  const [showDetails, setShowDetails] = useState(showDetailsByDefault);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number | null>(null);

  // Auto-retry countdown effect
  useEffect(() => {
    if (enableAutoRetry && feedback?.type === 'error' && feedback?.showRetry && onRetry) {
      let countdown = Math.floor(autoRetryDelay / 1000);
      setAutoRetryCountdown(countdown);

      const interval = setInterval(() => {
        countdown -= 1;
        setAutoRetryCountdown(countdown);

        if (countdown <= 0) {
          clearInterval(interval);
          setAutoRetryCountdown(null);
          onRetry();
        }
      }, 1000);

      return () => {
        clearInterval(interval);
        setAutoRetryCountdown(null);
      };
    }
  }, [feedback, enableAutoRetry, autoRetryDelay, onRetry]);

  if (!feedback) return null;

  const getAlertVariant = () => {
    switch (feedback.type) {
      case 'error':
        return 'destructive';
      case 'success':
        return 'default';
      case 'warning':
        return 'default';
      case 'info':
      case 'loading':
      default:
        return 'default';
    }
  };

  const getIcon = () => {
    switch (feedback.type) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = () => {
    switch (feedback.errorCategory) {
      case 'rls_policy':
        return <Shield className="h-3 w-3" />;
      case 'permission':
        return <User className="h-3 w-3" />;
      case 'database':
        return <Database className="h-3 w-3" />;
      case 'authentication':
        return <User className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getCategoryLabel = () => {
    switch (feedback.errorCategory) {
      case 'rls_policy':
        return 'Security Policy';
      case 'permission':
        return 'Permission';
      case 'authentication':
        return 'Authentication';
      case 'database':
        return 'Database';
      case 'network':
        return 'Network';
      case 'validation':
        return 'Validation';
      default:
        return null;
    }
  };

  const handleRetry = () => {
    setAutoRetryCountdown(null);
    onRetry?.();
  };

  return (
    <Alert 
      variant={getAlertVariant()} 
      className={cn("relative", className)}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {feedback.title && (
                <AlertTitle className="text-sm font-medium">
                  {feedback.title}
                </AlertTitle>
              )}
              
              {feedback.errorCategory && (
                <Badge variant="outline" className="text-xs">
                  {getCategoryIcon()}
                  <span className="ml-1">{getCategoryLabel()}</span>
                </Badge>
              )}
              
              {feedback.errorCode && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {feedback.errorCode}
                </Badge>
              )}
            </div>
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            )}
          </div>

          <AlertDescription className="text-sm">
            {feedback.message}
          </AlertDescription>

          {/* Progress bar for loading states */}
          {feedback.showProgress && feedback.progress !== undefined && (
            <div className="space-y-1">
              <Progress value={feedback.progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{feedback.progress}% complete</span>
                {feedback.estimatedTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {feedback.estimatedTime}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Retry information */}
          {feedback.retryCount !== undefined && feedback.maxRetries !== undefined && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              <span>
                Attempt {feedback.retryCount} of {feedback.maxRetries}
                {feedback.isRetrying && " (retrying...)"}
              </span>
            </div>
          )}

          {/* Details section */}
          {(feedback.details || feedback.nextSteps) && (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-6 p-0 text-xs"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show Details
                  </>
                )}
              </Button>

              {showDetails && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-md">
                  {feedback.details && (
                    <div>
                      <h4 className="text-xs font-medium mb-1">Technical Details:</h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        {feedback.details}
                      </p>
                    </div>
                  )}

                  {feedback.nextSteps && feedback.nextSteps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium mb-2">What you can do:</h4>
                      <ul className="space-y-1">
                        {feedback.nextSteps.map((step, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary font-medium">{index + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.fallbackAvailable && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <div className="flex items-center gap-1 text-blue-700 font-medium mb-1">
                        <Info className="h-3 w-3" />
                        Fallback Available
                      </div>
                      <p className="text-blue-600">
                        The system will automatically try alternative methods to complete your request.
                      </p>
                    </div>
                  )}

                  {feedback.adminRequired && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                      <div className="flex items-center gap-1 text-amber-700 font-medium mb-1">
                        <Shield className="h-3 w-3" />
                        Admin Action Required
                      </div>
                      <p className="text-amber-600">
                        This operation requires administrator permissions or intervention.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            {feedback.showRetry && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={feedback.isRetrying || autoRetryCountdown !== null}
                className="text-xs"
              >
                {feedback.isRetrying ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : autoRetryCountdown !== null ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Auto retry in {autoRetryCountdown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {feedback.retryLabel || 'Try Again'}
                  </>
                )}
              </Button>
            )}

            {feedback.type === 'error' && feedback.context && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Generate and show RLS-specific error message
                  const rlsError = generateRLSErrorMessage({}, feedback.context!);
                  console.log('RLS Error Details:', rlsError);
                }}
                className="text-xs"
              >
                <Info className="h-3 w-3 mr-1" />
                More Help
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  );
};

/**
 * Hook for enhanced user feedback with RLS error detection
 */
export const useEnhancedUserFeedback = () => {
  const [feedback, setFeedback] = useState<EnhancedFeedbackState | null>(null);
  const [retryHandler, setRetryHandler] = useState<(() => void) | null>(null);

  const showError = (
    message: string, 
    options: Partial<EnhancedFeedbackState> & { context?: RLSErrorContext } = {}
  ) => {
    // Detect RLS errors if context is provided
    let enhancedOptions = { ...options };
    
    if (options.context) {
      const rlsError = detectRLSError({ message }, options.context);
      if (rlsError) {
        const rlsMessage = generateRLSErrorMessage({ message }, options.context);
        enhancedOptions = {
          ...enhancedOptions,
          title: rlsMessage.title,
          message: rlsMessage.message,
          details: rlsMessage.details,
          nextSteps: rlsMessage.nextSteps,
          showRetry: rlsMessage.retryable,
          retryLabel: rlsMessage.retryLabel,
          errorCode: rlsError.code,
          errorCategory: rlsError.category,
          fallbackAvailable: rlsError.fallbackAvailable,
          adminRequired: rlsError.adminRequired
        };
      }
    }

    setFeedback({
      type: 'error',
      message,
      ...enhancedOptions
    });
  };

  const showSuccess = (message: string, options: Partial<EnhancedFeedbackState> = {}) => {
    setFeedback({
      type: 'success',
      message,
      ...options
    });
  };

  const showLoading = (message: string, options: Partial<EnhancedFeedbackState> = {}) => {
    setFeedback({
      type: 'loading',
      message,
      ...options
    });
  };

  const showWarning = (message: string, options: Partial<EnhancedFeedbackState> = {}) => {
    setFeedback({
      type: 'warning',
      message,
      ...options
    });
  };

  const showInfo = (message: string, options: Partial<EnhancedFeedbackState> = {}) => {
    setFeedback({
      type: 'info',
      message,
      ...options
    });
  };

  const updateProgress = (progress: number, estimatedTime?: string) => {
    setFeedback(prev => {
      if (!prev || prev.type !== 'loading') return prev;
      return {
        ...prev,
        progress,
        estimatedTime
      };
    });
  };

  const updateRetryInfo = (retryCount: number, maxRetries: number, isRetrying: boolean = false) => {
    setFeedback(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        retryCount,
        maxRetries,
        isRetrying
      };
    });
  };

  const clearFeedback = () => {
    setFeedback(null);
  };

  const retry = () => {
    if (retryHandler) {
      retryHandler();
    }
  };

  const setRetryCallback = (handler: () => void) => {
    setRetryHandler(() => handler);
  };

  return {
    feedback,
    showError,
    showSuccess,
    showLoading,
    showWarning,
    showInfo,
    updateProgress,
    updateRetryInfo,
    clearFeedback,
    retry,
    setRetryCallback
  };
};