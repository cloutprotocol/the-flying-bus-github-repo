import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  MailCheck, 
  MailX, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Eye
} from 'lucide-react';
import type { EmailNotification } from '@/types/InvitationWorkflowTypes';

interface InvitationNotificationHistoryProps {
  notifications: EmailNotification[];
  onRetryEmail?: (notificationId: string) => void;
  onViewDetails?: (notification: EmailNotification) => void;
}

export const InvitationNotificationHistory: React.FC<InvitationNotificationHistoryProps> = ({
  notifications,
  onRetryEmail,
  onViewDetails
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmailTypeLabel = (emailType: string) => {
    switch (emailType) {
      case 'approval':
        return 'Approval Email';
      case 'denial':
        return 'Denial Email';
      case 'welcome':
        return 'Welcome Email';
      case 'expiry_warning':
        return 'Expiry Warning';
      default:
        return emailType;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <MailCheck className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <MailX className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'bounced':
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Bounced
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600">
            {status}
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <MailCheck className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <MailX className="w-4 h-4 text-red-600" />;
      case 'bounced':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">No email notifications sent yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Notifications ({notifications.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(notification.delivery_status)}
                  <div>
                    <h4 className="font-medium text-sm">
                      {getEmailTypeLabel(notification.email_type)}
                    </h4>
                    <p className="text-xs text-gray-500">
                      To: {notification.recipient_email}
                    </p>
                  </div>
                </div>
                {getStatusBadge(notification.delivery_status)}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-3">
                <div>
                  <span className="font-medium">Created:</span> {formatDate(notification.created_at)}
                </div>
                {notification.sent_at && (
                  <div>
                    <span className="font-medium">Sent:</span> {formatDate(notification.sent_at)}
                  </div>
                )}
              </div>

              {notification.error_message && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                  <p className="text-xs text-red-700">
                    <span className="font-medium">Error:</span> {notification.error_message}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                {onViewDetails && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(notification)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Details
                  </Button>
                )}
                
                {notification.delivery_status === 'failed' && onRetryEmail && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRetryEmail(notification.id)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default InvitationNotificationHistory;