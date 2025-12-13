import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  User, 
  Calendar,
  MessageCircle,
  Filter,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import AdminService from '@/services/adminService';
import { useAdminInvitationRequests } from '@/hooks/useAdminDataIndependence';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedUserFeedback, useEnhancedUserFeedback } from '@/components/Common/EnhancedUserFeedback';
import { detectRLSError, type RLSErrorContext } from '@/utils/errorHandling/rlsErrorHandler';

const InvitationManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [operationErrors, setOperationErrors] = useState<Map<string, any>>(new Map());

  // Enhanced user feedback
  const {
    feedback,
    showError,
    showSuccess,
    showLoading,
    updateRetryInfo,
    clearFeedback,
    setRetryCallback
  } = useEnhancedUserFeedback();

  // Use independent data loading for invitation requests
  const { 
    data: invitationsData, 
    isLoading, 
    error, 
    refetch: refetchInvitations 
  } = useAdminInvitationRequests(filterStatus);

  // Transform data to ensure proper typing
  const invitations = (invitationsData || []).map(invitation => ({
    ...invitation,
    status: invitation.status as 'pending' | 'approved' | 'denied'
  }));

  const handleStatusUpdate = async (id: string, status: 'approved' | 'denied', retryAttempt: number = 1) => {
    if (!user?.id) return;

    const maxRetries = 3;
    const isRetrying = retryAttempt > 1;

    // Create RLS error context for enhanced error handling
    const rlsContext: RLSErrorContext = {
      operation: 'admin_operation',
      table: 'invitation_requests',
      userId: user.id,
      userRole: user.role || 'admin',
      isAuthenticated: true,
      component: 'InvitationManagement'
    };

    setProcessingIds(prev => new Set(prev).add(id));
    
    if (isRetrying) {
      setRetryingIds(prev => new Set(prev).add(id));
      updateRetryInfo(retryAttempt, maxRetries, true);
    } else {
      clearFeedback();
      showLoading(`${status === 'approved' ? 'Approving' : 'Denying'} invitation request...`, {
        showProgress: true,
        progress: 20,
        estimatedTime: '10 seconds'
      });
    }
    
    try {
      console.log(`Admin operation: ${status} invitation ${id} (attempt ${retryAttempt}/${maxRetries})`);
      
      const result = await AdminService.updateInvitationRequestStatus(id, status, user.id);
      
      if (result.error) {
        console.error('Status update failed:', result);
        
        // Clear retry state
        setRetryingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });

        // Store error for this operation
        setOperationErrors(prev => new Map(prev).set(id, result));

        // Detect RLS errors and provide enhanced feedback
        const rlsError = detectRLSError(result, rlsContext);
        
        showError(result.error, {
          title: rlsError ? 'Permission Error' : 'Update Failed',
          details: result.details ? JSON.stringify(result.details, null, 2) : result.error,
          errorCode: result.code,
          errorCategory: rlsError?.category || 'database',
          showRetry: result.retryable && retryAttempt < maxRetries,
          retryLabel: `Retry (${retryAttempt}/${maxRetries})`,
          retryCount: retryAttempt,
          maxRetries,
          fallbackAvailable: result.details?.usedFallback === false,
          adminRequired: rlsError?.adminRequired,
          context: rlsContext,
          nextSteps: [
            ...(rlsError?.recoveryActions || []),
            'Check your admin permissions',
            'Try refreshing the page',
            'Contact system administrator if the problem persists'
          ]
        });

        // Set up retry callback
        if (result.retryable && retryAttempt < maxRetries) {
          setRetryCallback(() => {
            handleStatusUpdate(id, status, retryAttempt + 1);
          });
        }

        // Show toast for immediate feedback
        toast({
          title: "Error updating status",
          description: rlsError ? 
            `Permission error: ${rlsError.userMessage}` : 
            result.error,
          variant: "destructive",
        });
        
        return;
      }

      // Success!
      console.log('Status update successful:', result);
      
      // Clear any stored errors for this operation
      setOperationErrors(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      showSuccess(`Invitation request has been ${status}.`, {
        title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        nextSteps: [
          'The parent will be notified by email',
          'The change has been logged in the audit trail',
          'You can continue processing other requests'
        ]
      });

      toast({
        title: `Request ${status}`,
        description: `Invitation request has been ${status} successfully.`,
      });

      // Reload invitations to reflect changes
      await refetchInvitations();
      
    } catch (error) {
      console.error('Unexpected error updating status:', error);
      
      // Clear retry state
      setRetryingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });

      // Store error for this operation
      setOperationErrors(prev => new Map(prev).set(id, error));

      // Handle unexpected errors with RLS context
      const rlsError = detectRLSError(error, rlsContext);
      
      showError(error.message || 'An unexpected error occurred', {
        title: 'Unexpected Error',
        details: error.stack || error.message,
        errorCode: error.code || 'UNEXPECTED_ERROR',
        errorCategory: rlsError?.category || 'database',
        showRetry: retryAttempt < maxRetries,
        retryLabel: `Retry (${retryAttempt}/${maxRetries})`,
        retryCount: retryAttempt,
        maxRetries,
        context: rlsContext,
        nextSteps: [
          'This appears to be an unexpected system error',
          'Try the operation again',
          'Check the browser console for more details',
          'Contact technical support if the problem persists'
        ]
      });

      // Set up retry callback for unexpected errors
      if (retryAttempt < maxRetries) {
        setRetryCallback(() => {
          handleStatusUpdate(id, status, retryAttempt + 1);
        });
      }

      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      
      setRetryingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invitation Management</h1>
            <p className="text-gray-600 mt-1">Review and manage parent invitation requests</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={filterStatus} onValueChange={(value: 'all' | 'pending' | 'approved' | 'denied') => setFilterStatus(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Enhanced User Feedback */}
        {feedback && (
          <EnhancedUserFeedback
            feedback={feedback}
            onRetry={() => {
              // Retry callback is set by the operation that failed
              clearFeedback();
            }}
            onDismiss={clearFeedback}
            showDetailsByDefault={false}
            enableAutoRetry={false}
          />
        )}

        {error && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
                <AlertTriangle className="h-5 w-5" />
                <p>Error loading invitation requests: {error.message}</p>
              </div>
              <Button onClick={() => refetchInvitations()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : invitations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-600">
                {filterStatus === 'all' 
                  ? 'No invitation requests found.' 
                  : `No ${filterStatus} invitation requests found.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        Invitation for {invitation.child_name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Submitted {formatDate(invitation.created_at!)}
                      </p>
                    </div>
                    {getStatusBadge(invitation.status!)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          <strong>Parent:</strong> {invitation.parent_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          <strong>Email:</strong> {invitation.parent_email}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          <strong>Child:</strong> {invitation.child_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">
                          <strong>Age:</strong> {invitation.child_age} years old
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {invitation.message && (
                    <div className="border-t pt-4">
                      <div className="flex items-start gap-2">
                        <MessageCircle className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <strong className="text-sm">Message:</strong>
                          <p className="text-sm text-gray-700 mt-1">{invitation.message}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {invitation.status === 'pending' && (
                    <div className="flex gap-2 pt-4 border-t">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(invitation.id!, 'approved')}
                            disabled={processingIds.has(invitation.id!) || retryingIds.has(invitation.id!)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingIds.has(invitation.id!) ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                {retryingIds.has(invitation.id!) ? 'Retrying...' : 'Approving...'}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusUpdate(invitation.id!, 'denied')}
                            disabled={processingIds.has(invitation.id!) || retryingIds.has(invitation.id!)}
                          >
                            {processingIds.has(invitation.id!) ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                {retryingIds.has(invitation.id!) ? 'Retrying...' : 'Denying...'}
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Deny
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {/* Show error indicator for this specific invitation */}
                        {operationErrors.has(invitation.id!) && (
                          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              Last operation failed. 
                              {operationErrors.get(invitation.id!)?.retryable && ' Retry available.'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {invitation.reviewed_at && (
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Reviewed on {formatDate(invitation.reviewed_at)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminPortalLayout>
  );
};

export default InvitationManagement;
