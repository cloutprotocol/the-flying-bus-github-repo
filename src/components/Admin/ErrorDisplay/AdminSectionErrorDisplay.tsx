import React from 'react';
import { AlertCircle, RefreshCw, RotateCcw, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AdminErrorState } from '@/services/adminErrorHandlingService';
import { UserFeedback } from '@/components/Common/UserFeedback';

interface AdminSectionErrorDisplayProps {
  errorState: AdminErrorState;
  onRetry?: () => void;
  onRefresh?: () => void;
  className?: string;
  showTechnicalDetails?: boolean;
}

export const AdminSectionErrorDisplay: React.FC<AdminSectionErrorDisplayProps> = ({
  errorState,
  onRetry,
  onRefresh,
  className = '',
  showTechnicalDetails = false
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  if (!errorState.hasError || !errorState.error) {
    return null;
  }

  const { error, retryCount, canRetry, isRetrying, timestamp } = errorState;
  const timeSinceError = Date.now() - timestamp;
  const minutesAgo = Math.floor(timeSinceError / 60000);

  return (
    <div className={`space-y-3 ${className}`}>
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-red-800">
                  {error.title}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {error.message}
                </p>
              </div>
              <div className="flex items-center text-xs text-red-600 ml-4">
                <Clock className="h-3 w-3 mr-1" />
                {minutesAgo === 0 ? 'Just now' : `${minutesAgo}m ago`}
              </div>
            </div>

            {retryCount > 0 && (
              <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                Retry attempts: {retryCount}
              </div>
            )}

            {error.nextSteps && error.nextSteps.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-800 mb-1">What you can do:</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {error.nextSteps.slice(0, 3).map((step, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 text-red-500">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showTechnicalDetails && error.details && (
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-700 hover:bg-red-100 p-0 h-auto"
                  >
                    <span className="text-xs">Technical Details</span>
                    {showDetails ? (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 text-xs font-mono bg-red-100 p-2 rounded text-red-800">
                    {error.details}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        {canRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <RotateCcw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            {error.retryLabel || 'Try Again'}
            {retryCount > 0 && ` (${retryCount})`}
          </Button>
        )}
        
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRetrying}
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            Refresh Section
          </Button>
        )}
      </div>
    </div>
  );
};

interface AdminSectionGracefulDegradationProps {
  sectionName: string;
  errorState: AdminErrorState;
  onRetry?: () => void;
  onRefresh?: () => void;
  fallbackContent?: React.ReactNode;
  className?: string;
}

/**
 * Component that provides graceful degradation for admin dashboard sections
 */
export const AdminSectionGracefulDegradation: React.FC<AdminSectionGracefulDegradationProps> = ({
  sectionName,
  errorState,
  onRetry,
  onRefresh,
  fallbackContent,
  className = ''
}) => {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg bg-gray-50 ${className}`}>
      <div className="text-center space-y-4">
        <div className="text-gray-400">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <h3 className="font-medium text-gray-700">{sectionName} Unavailable</h3>
          <p className="text-sm text-gray-600 mt-1">
            This section is temporarily unavailable, but other parts of the dashboard are still working.
          </p>
        </div>

        {fallbackContent && (
          <div className="border-t pt-4">
            {fallbackContent}
          </div>
        )}

        <AdminSectionErrorDisplay
          errorState={errorState}
          onRetry={onRetry}
          onRefresh={onRefresh}
          showTechnicalDetails={false}
        />
      </div>
    </div>
  );
};

export default AdminSectionErrorDisplay;