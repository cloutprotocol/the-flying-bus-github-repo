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
  Loader2
} from 'lucide-react';
import { 
  updateInvitationRequestStatus,
  InvitationRequest 
} from '@/services/invitationService';
import { useAdminInvitationRequests } from '@/hooks/useAdminDataIndependence';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const InvitationManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

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
      await refetchInvitations();
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

        {error && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-red-600 mb-4">Error loading invitation requests: {error.message}</p>
              <Button onClick={() => refetchInvitations()} variant="outline">
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
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(invitation.id!, 'approved')}
                        disabled={processingIds.has(invitation.id!)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusUpdate(invitation.id!, 'denied')}
                        disabled={processingIds.has(invitation.id!)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Deny
                      </Button>
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
