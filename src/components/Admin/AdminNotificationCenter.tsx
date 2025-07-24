import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  AlertTriangle, 
  Mail, 
  MailX, 
  Clock, 
  User,
  RefreshCw,
  X
} from 'lucide-react';
import { 
  AdminNotificationService,
  type AdminNotification,
  type AdminNotificationSummary,
  type AdminNotificationType
} from '@/services/adminNotificationService';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminNotificationCenterProps {
  className?: string;
}

export const AdminNotificationCenter: React.FC<AdminNotificationCenterProps> = ({ className }) => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [summary, setSummary] = useState<AdminNotificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadSummary();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      loadSummary();
      if (isOpen) {
        loadNotifications();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await AdminNotificationService.getNotifications(20, 0, false);
      
      if (result.error) {
        console.error('Error loading notifications:', result.error);
        return;
      }

      setNotifications(result.data || []);
    } catch (error) {
      console.error('Exception loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const result = await AdminNotificationService.getNotificationSummary();
      
      if (result.error) {
        console.error('Error loading notification summary:', result.error);
        return;
      }

      setSummary(result.data);
    } catch (error) {
      console.error('Exception loading notification summary:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await AdminNotificationService.markAsRead(notificationId);
      
      if (success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        loadSummary(); // Refresh summary to update unread count
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const success = await AdminNotificationService.markAllAsRead();
      
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        loadSummary();
        toast({
          title: "All notifications marked as read",
          description: "All notifications have been marked as read.",
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: AdminNotificationType) => {
    switch (type) {
      case 'new_author_registration':
        return <User className="w-4 h-4 text-green-600" />;
      case 'email_delivery_failed':
        return <MailX className="w-4 h-4 text-red-600" />;
      case 'invitation_expiring':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'invitation_expired':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'token_regenerated':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: AdminNotificationType) => {
    switch (type) {
      case 'new_author_registration':
        return 'border-l-green-500';
      case 'email_delivery_failed':
        return 'border-l-red-500';
      case 'invitation_expiring':
        return 'border-l-orange-500';
      case 'invitation_expired':
        return 'border-l-red-500';
      case 'token_regenerated':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`relative ${className}`}>
          {summary && summary.unreadCount > 0 ? (
            <BellRing className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {summary && summary.unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {summary.unreadCount > 99 ? '99+' : summary.unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {summary && summary.unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleMarkAllAsRead}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadNotifications}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            
            {summary && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-green-600" />
                  <span>{summary.newAuthorRegistrations} new authors</span>
                </div>
                <div className="flex items-center gap-1">
                  <MailX className="w-3 h-3 text-red-600" />
                  <span>{summary.failedEmails} failed emails</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-orange-600" />
                  <span>{summary.expiringInvitations} expiring</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <span>{summary.expiredInvitations} expired</span>
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-l-4 ${getNotificationColor(notification.type)} ${
                        !notification.is_read ? 'bg-blue-50' : 'bg-white'
                      } hover:bg-gray-50 cursor-pointer`}
                      onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-medium ${
                              !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};

export default AdminNotificationCenter;