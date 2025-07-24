import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Eye,
  AlertTriangle,
  SortAsc,
  SortDesc,
  UserCheck
} from 'lucide-react';
import { 
  updateInvitationRequestStatus,
  InvitationRequest 
} from '@/services/invitationService';
import { 
  EnhancedInvitationService,
  type EnhancedInvitationRequest 
} from '@/services/enhancedInvitationService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InvitationStatusBadge from '@/components/Admin/InvitationStatusBadge';
import InvitationTimeline from '@/components/Admin/InvitationTimeline';
import InvitationNotificationHistory from '@/components/Admin/InvitationNotificationHistory';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const InvitationManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<EnhancedInvitationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'denied' | 'needs_attention'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'status' | 'notification_status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedInvitation, setSelectedInvitation] = useState<EnhancedInvitationRequest | null>(null);

  useEffect(() => {
    loadInvitations();
  }, [filterStatus, sortBy, sortOrder]);

  const loadInvitations = async () => {
    setIsLoading(true);
    try {
      let result;
      
      if (filterStatus === 'needs_attention') {
        result = await EnhancedInvitationService.getInvitationsNeedingAttention();
      } else {
        result = await EnhancedInvitationService.getEnhancedInvitationRequests(
          filterStatus === 'all' ? undefined : filterStatus,
          sortBy,
          sortOrder
        );
      }
      
      if (result.error) {
        toast({
          title: "Error loading invitations",
          description: result.error.message || 'Failed to load invitations',
          variant: "destructive",
        });
        return;
      }

      setInvitations(result.data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast({
        title: "Error",
        description: "Failed to load invitation requests.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'denied') => {
    if (!user?.id) return;

    setProcessingIds(prev => new Set(prev).add(id));
    
    try {
      const result = await updateInvitationRequestStatus(id, status, user.id);
      
      if (result.error) {
        toast({
          title: "Error updating status",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: `Request ${status}`,
        description: `Invitation request has been ${status}.`,
      });

      // Reload invitations to reflect changes
      loadInvitations();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update invitation status.",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleRegenerateToken = async (invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    
    try {
      const result = await EnhancedInvitationService.regenerateInvitationToken(invitationId);
      
      if (result.error) {
        toast({
          title: "Error regenerating token",
          description: result.error.message || 'Failed to regenerate token',
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Token regenerated",
        description: "A new invitation token has been generated and will be sent via email.",
      });

      // Reload invitations to reflect changes
      loadInvitations();
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate invitation token.",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const handleRetryEmail = async (notificationId: string) => {
    // This would integrate with the email notification service
    toast({
      title: "Feature coming soon",
      description: "Email retry functionality will be implemented in the next phase.",
    });
  };

  const handleViewNotificationDetails = (notification: any) => {
    // This would show detailed notification information
    toast({
      title: "Notification Details",
      description: `${notification.email_type} email - Status: ${notification.delivery_status}`,
    });
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
          
          <div className="flex items-center gap-4">
            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={filterStatus} onValueChange={(value: typeof filterStatus) => setFilterStatus(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                  <SelectItem value="needs_attention">Needs Attention</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="notification_status">Email Status</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading invitation requests...</div>
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
                        Submitted {formatDate(invitation.created_at)}
                      </p>
                    </div>
                    <InvitationStatusBadge invitation={invitation} />
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

                      {/* Email notification status */}
                      {invitation.notifications.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            <strong>Email Status:</strong> {invitation.notification_status}
                            {invitation.notification_sent_at && ` (${formatDate(invitation.notification_sent_at)})`}
                          </span>
                        </div>
                      )}
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

                      {/* Linked user information */}
                      {invitation.linkedUser && (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            <strong>Linked User:</strong> {invitation.linkedUser.display_name} (@{invitation.linkedUser.username})
                          </span>
                        </div>
                      )}

                      {/* Token expiry information */}
                      {invitation.token && !invitation.token.used_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            <strong>Token Expires:</strong> {formatDate(invitation.token.expires_at)}
                          </span>
                        </div>
                      )}
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
                  
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {invitation.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(invitation.id, 'approved')}
                          disabled={processingIds.has(invitation.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusUpdate(invitation.id, 'denied')}
                          disabled={processingIds.has(invitation.id)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Deny
                        </Button>
                      </>
                    )}

                    {/* Token regeneration for approved invitations */}
                    {invitation.status === 'approved' && invitation.token && !invitation.invitation_claimed_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRegenerateToken(invitation.id)}
                        disabled={processingIds.has(invitation.id)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Regenerate Token
                      </Button>
                    )}

                    {/* View details dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Invitation Details - {invitation.child_name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6">
                          <InvitationTimeline invitation={invitation} />
                          <InvitationNotificationHistory 
                            notifications={invitation.notifications}
                            onRetryEmail={handleRetryEmail}
                            onViewDetails={handleViewNotificationDetails}
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {invitation.reviewed_at && (
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Reviewed on {formatDate(invitation.reviewed_at)} 
                      {invitation.reviewer && ` by ${invitation.reviewer.display_name}`}
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
