
import React, { useState } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Clock, Check, XCircle, Archive, EyeOff, Loader2 } from 'lucide-react';
import { StatusType } from './StatusBadge';
import StatusBadge from './StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { updateArticleStatus } from '@/services/articles/status/articleStatusService';
import { requestArticleReview } from '@/services/articles/articleReviewService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (newStatus === currentStatus || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      logger.info(LogSource.EDITOR, 'Status change requested', { 
        from: currentStatus, 
        to: newStatus,
        articleId,
        hasArticleId: !!articleId
      });
      
      if (articleId && currentStatus === 'draft' && newStatus === 'pending') {
        logger.info(LogSource.EDITOR, 'Attempting to submit article for review', { 
          articleId,
          currentStatus,
          newStatus 
        });
        
        // Using requestArticleReview which accepts just the articleId parameter
        const { success, error } = await requestArticleReview(articleId);
        
        if (success) {
          onStatusChange(newStatus);
          toast({
            title: "Article submitted for review",
            description: "Your article has been submitted to moderators for review",
          });
          
          logger.info(LogSource.EDITOR, 'Article successfully submitted for review', { 
            articleId,
            newStatus 
          });
        } else {
          const errorMessage = error?.message || "There was an error submitting your article";
          
          toast({
            title: "Submission failed",
            description: errorMessage,
            variant: "destructive"
          });
          
          logger.error(LogSource.EDITOR, 'Article submission failed', { 
            articleId,
            error 
          });
        }
      } else {
        logger.info(LogSource.EDITOR, 'Direct status change', {
          articleId,
          newStatus,
          currentStatus
        });
        
        if (articleId) {
          // Cast the newStatus to the accepted type for updateArticleStatus
          const { success, error } = await updateArticleStatus(
            articleId, 
            newStatus as 'draft' | 'pending' | 'published' | 'rejected' | 'archived'
          );
          
          if (!success) {
            toast({
              title: "Status update failed",
              description: error?.message || "Failed to update article status",
              variant: "destructive"
            });
            return;
          }
        }
        
        onStatusChange(newStatus);
        
        toast({
          title: "Status updated",
          description: `Article status changed to ${newStatus}`,
        });
      }
    } catch (err) {
      logger.error(LogSource.EDITOR, "Error changing article status", err);
      
      toast({
        title: "Status update failed",
        description: "There was an error updating the article status",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || isSubmitting}>
        <Button variant="outline" className="flex items-center gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              <StatusBadge status={currentStatus} />
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {getAvailableStatuses().map(({ status, label, icon }) => (
          <DropdownMenuItem 
            key={status} 
            onClick={() => handleStatusChange(status)}
            disabled={status === currentStatus || isSubmitting}
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
