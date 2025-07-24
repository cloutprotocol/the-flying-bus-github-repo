import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail, 
  MailCheck, 
  UserCheck, 
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';
import type { EnhancedInvitationRequest } from '@/services/enhancedInvitationService';

interface InvitationTimelineProps {
  invitation: EnhancedInvitationRequest;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'completed' | 'failed' | 'pending';
  details?: string;
}

export const InvitationTimeline: React.FC<InvitationTimelineProps> = ({ invitation }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // 1. Request submitted
    events.push({
      id: 'submitted',
      timestamp: invitation.created_at,
      title: 'Request Submitted',
      description: `${invitation.parent_name} submitted invitation request for ${invitation.child_name}`,
      icon: Clock,
      status: 'completed'
    });

    // 2. Request reviewed
    if (invitation.reviewed_at) {
      events.push({
        id: 'reviewed',
        timestamp: invitation.reviewed_at,
        title: `Request ${invitation.status === 'approved' ? 'Approved' : 'Denied'}`,
        description: `Request was ${invitation.status} by ${invitation.reviewer?.display_name || 'admin'}`,
        icon: invitation.status === 'approved' ? CheckCircle : XCircle,
        status: 'completed'
      });
    }

    // 3. Email notification events
    if (invitation.status === 'approved') {
      const approvalNotifications = invitation.notifications.filter(n => n.email_type === 'approval');
      
      if (approvalNotifications.length > 0) {
        const latestNotification = approvalNotifications[0]; // Already sorted by created_at desc
        
        events.push({
          id: 'email_sent',
          timestamp: latestNotification.sent_at || latestNotification.created_at,
          title: latestNotification.delivery_status === 'sent' ? 'Approval Email Sent' : 'Email Send Failed',
          description: latestNotification.delivery_status === 'sent' 
            ? `Approval email with invitation link sent to ${invitation.parent_email}`
            : `Failed to send approval email: ${latestNotification.error_message || 'Unknown error'}`,
          icon: latestNotification.delivery_status === 'sent' ? MailCheck : AlertTriangle,
          status: latestNotification.delivery_status === 'sent' ? 'completed' : 'failed',
          details: latestNotification.delivery_status === 'failed' ? latestNotification.error_message || undefined : undefined
        });
      } else if (invitation.notification_status === 'pending') {
        events.push({
          id: 'email_pending',
          timestamp: new Date().toISOString(),
          title: 'Email Notification Pending',
          description: 'Approval email is being prepared for sending',
          icon: Mail,
          status: 'pending'
        });
      }
    }

    // 4. Invitation claimed
    if (invitation.invitation_claimed_at) {
      events.push({
        id: 'claimed',
        timestamp: invitation.invitation_claimed_at,
        title: 'Invitation Claimed',
        description: `${invitation.linkedUser?.display_name || 'User'} created account and claimed invitation`,
        icon: UserCheck,
        status: 'completed'
      });
    }

    // 5. Token expiry warning (if applicable)
    if (invitation.token && !invitation.token.used_at) {
      const expiryDate = new Date(invitation.token.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        events.push({
          id: 'expiry_warning',
          timestamp: new Date().toISOString(),
          title: 'Token Expiring Soon',
          description: `Invitation token expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
          icon: AlertTriangle,
          status: 'pending'
        });
      } else if (daysUntilExpiry <= 0) {
        events.push({
          id: 'expired',
          timestamp: invitation.token.expires_at,
          title: 'Token Expired',
          description: 'Invitation token has expired and needs to be regenerated',
          icon: XCircle,
          status: 'failed'
        });
      }
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const events = generateTimelineEvents();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Invitation Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => {
            const IconComponent = event.icon;
            const isLast = index === events.length - 1;
            
            return (
              <div key={event.id} className="flex items-start gap-3">
                {/* Timeline line and icon */}
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full ${getStatusColor(event.status)}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  {!isLast && <div className="w-px h-8 bg-gray-200 mt-2" />}
                </div>
                
                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{event.title}</h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        event.status === 'completed' ? 'border-green-600 text-green-600' :
                        event.status === 'failed' ? 'border-red-600 text-red-600' :
                        'border-yellow-600 text-yellow-600'
                      }`}
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{event.description}</p>
                  <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                  {event.details && (
                    <p className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">
                      {event.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default InvitationTimeline;