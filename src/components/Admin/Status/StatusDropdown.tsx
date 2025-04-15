
import React from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Clock, Check, XCircle, Archive, EyeOff, Pencil } from 'lucide-react';
import { StatusType } from './StatusBadge';
import StatusBadge from './StatusBadge';
import { useToast } from '@/components/ui/use-toast';

interface StatusDropdownProps {
  currentStatus: StatusType;
  onStatusChange: (status: StatusType) => void;
  disabled?: boolean;
  userRole?: 'author' | 'moderator' | 'admin';
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ 
  currentStatus, 
  onStatusChange, 
  disabled = false,
  userRole = 'author'
}) => {
  const { toast } = useToast();

  // Define which statuses are available based on current status and user role
  const getAvailableStatuses = (): { status: StatusType; label: string; icon: React.ReactNode }[] => {
    const allStatuses = [
      { status: 'draft', label: 'Draft', icon: <EyeOff className="h-4 w-4 mr-2" /> },
      { status: 'pending', label: 'Submit for Review', icon: <Clock className="h-4 w-4 mr-2" /> },
      { status: 'published', label: 'Publish', icon: <Check className="h-4 w-4 mr-2" /> },
      { status: 'rejected', label: 'Reject', icon: <XCircle className="h-4 w-4 mr-2" /> },
      { status: 'archived', label: 'Archive', icon: <Archive className="h-4 w-4 mr-2" /> }
    ];

    // Filter based on role and current status
    if (userRole === 'author') {
      // Authors can only draft, submit, or archive their own articles
      return allStatuses.filter(s => 
        ['draft', 'pending', 'archived'].includes(s.status) &&
        // Authors can't submit already archived articles
        !(currentStatus === 'archived' && s.status === 'pending')
      );
    } else if (userRole === 'moderator') {
      // Moderators can publish, reject, or return to draft
      return allStatuses.filter(s => 
        !(['moderator', 'admin'].includes(userRole) && s.status === 'pending' && currentStatus === 'published')
      );
    }
    
    // Admins can do everything
    return allStatuses;
  };

  const handleStatusChange = (newStatus: StatusType) => {
    if (newStatus === currentStatus) return;
    
    onStatusChange(newStatus);
    
    toast({
      title: "Status updated",
      description: `Article status changed to ${newStatus}`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="outline" className="flex items-center gap-2">
          <StatusBadge status={currentStatus} />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {getAvailableStatuses().map(({ status, label, icon }) => (
          <DropdownMenuItem 
            key={status} 
            onClick={() => handleStatusChange(status)}
            disabled={status === currentStatus}
            className="flex items-center cursor-pointer"
          >
            {icon}
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusDropdown;
