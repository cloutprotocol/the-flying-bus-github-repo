import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Mail, 
  MailCheck, 
  UserCheck, 
  AlertTriangle,
  MailX
} from 'lucide-react';
import type { EnhancedInvitationRequest } from '@/services/enhancedInvitationService';
import { EnhancedInvitationService } from '@/services/enhancedInvitationService';

interface InvitationStatusBadgeProps {
  invitation: EnhancedInvitationRequest;
  showSubstage?: boolean;
}

export const InvitationStatusBadge: React.FC<InvitationStatusBadgeProps> = ({ 
  invitation, 
  showSubstage = false 
}) => {
  const { stage, substage, needsAttention } = EnhancedInvitationService.getInvitationLifecycleStatus(invitation);

  const getBadgeConfig = () => {
    switch (stage) {
      case 'pending':
        return {
          variant: 'outline' as const,
          className: 'text-yellow-600 border-yellow-600',
          icon: Clock,
          text: 'Pending Review'
        };

      case 'denied':
        return {
          variant: 'outline' as const,
          className: 'text-red-600 border-red-600',
          icon: XCircle,
          text: 'Denied'
        };

      case 'approved':
        if (substage === 'notification_failed') {
          return {
            variant: 'outline' as const,
            className: 'text-red-600 border-red-600',
            icon: MailX,
            text: 'Email Failed'
          };
        }
        if (substage === 'notification_pending') {
          return {
            variant: 'outline' as const,
            className: 'text-blue-600 border-blue-600',
            icon: Mail,
            text: 'Sending Email'
          };
        }
        return {
          variant: 'outline' as const,
          className: 'text-green-600 border-green-600',
          icon: CheckCircle,
          text: 'Approved'
        };

      case 'notified':
        const baseConfig = {
          variant: 'outline' as const,
          className: needsAttention ? 'text-orange-600 border-orange-600' : 'text-blue-600 border-blue-600',
          icon: needsAttention ? AlertTriangle : MailCheck,
          text: substage === 'expiring' ? 'Token Expiring' : 'Email Sent'
        };
        return baseConfig;

      case 'claimed':
        return {
          variant: 'outline' as const,
          className: 'text-green-600 border-green-600',
          icon: UserCheck,
          text: 'Account Created'
        };

      default:
        return {
          variant: 'outline' as const,
          className: 'text-gray-600 border-gray-600',
          icon: Clock,
          text: 'Unknown'
        };
    }
  };

  const config = getBadgeConfig();
  const IconComponent = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className={config.className}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
      {needsAttention && (
        <Badge variant="outline" className="text-orange-600 border-orange-600">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Needs Attention
        </Badge>
      )}
    </div>
  );
};

export default InvitationStatusBadge;