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
import { submitArticleForReview } from '@/services/articleService';

interface StatusDropdownProps {
  currentStatus: StatusType;
  onStatusChange: (status: StatusType) => void;
  disabled?: boolean;
  userRole?: 'author' | 'moderator' | 'admin';
  articleId?: string;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ 
  currentStatus, 
  onStatusChange, 
  disabled = false,
  userRole = 'author',
  articleId
}) => {
  const { toast } = useToast();

  const getAvailableStatuses = (): { status: StatusType; label: string; icon: React.ReactNode }[] => {
    const allStatuses: { status: StatusType; label: string; icon: React.ReactNode }[] = [
      { status: 'draft', label: 'Draft', icon: <EyeOff className="h-4 w-4 mr-2" /> },
      { status: 'pending', label: 'Submit for Review', icon: <Clock className="h-4 w-4 mr-2" /> },
      { status: 'published', label: 'Publish', icon: <Check className="h-4 w-4 mr-2" /> },
      { status: 'rejected', label: 'Reject', icon: <XCircle className="h-4 w-4 mr-2" /> },
      { status: 'archived', label: 'Archive', icon: <Archive className="h-4 w-4 mr-2" /> }
    ];

    if (userRole === 'author') {
      return allStatuses.filter(s => 
        ['draft', 'pending', 'archived'].includes(s.status) &&
        !(currentStatus === 'archived' && s.status === 'pending')
      );
    } else if (userRole === 'moderator') {
      return allStatuses.filter(s => 
        !(['moderator', 'admin'].includes(userRole) && s.status === 'pending' && currentStatus === 'published')
      );
    }
    
    return allStatuses;
  };

  const handleStatusChange = async (newStatus: StatusType) => {
    if (newStatus === currentStatus) return;
    
    if (articleId && currentStatus === 'draft' && newStatus === 'pending') {
      try {
        const { success, error } = await submitArticleForReview(articleId);
        
        if (success) {
          onStatusChange(newStatus);
          toast({
            title: "Article submitted for review",
            description: "Your article has been submitted to moderators for review",
          });
        } else {
          toast({
            title: "Submission failed",
            description: error.message || "There was an error submitting your article",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error("Error submitting article:", err);
        toast({
          title: "Submission failed",
          description: "There was an error submitting your article",
          variant: "destructive"
        });
      }
    } else {
      onStatusChange(newStatus);
      
      toast({
        title: "Status updated",
        description: `Article status changed to ${newStatus}`,
      });
    }
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
