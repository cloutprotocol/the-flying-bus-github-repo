
import React, { useState } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { useModeration } from '@/hooks/useModeration';
import { useAuth } from '@/hooks/useAuth';

type ContentType = 'article' | 'comment' | 'profile' | 'media';

interface ReportContentButtonProps {
  contentId: string;
  contentType: ContentType;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive' | 'link';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  onReportSubmitted?: () => void;
}

const ReportContentButton: React.FC<ReportContentButtonProps> = ({
  contentId,
  contentType,
  variant = 'outline',
  buttonSize = 'sm',
  onReportSubmitted,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [reasonCategory, setReasonCategory] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const { toast } = useToast();
  const { isLoggedIn } = useAuth();
  const { handleFlag, processingIds } = useModeration();
  const isProcessing = processingIds.includes(contentId);
  
  const reasonOptions = [
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'harmful', label: 'Harmful or dangerous' },
    { value: 'misinformation', label: 'Misinformation' },
    { value: 'privacy', label: 'Violates privacy' },
    { value: 'other', label: 'Other reason' },
  ];
  
  const handleReportSubmit = async () => {
    if (!reasonCategory) {
      toast({
        title: "Please select a reason",
        description: "We need to understand why you're reporting this content",
        variant: "destructive",
      });
      return;
    }
    
    const reportReason = reasonCategory === 'other' 
      ? otherReason 
      : reasonOptions.find(option => option.value === reasonCategory)?.label || '';
    
    if (reasonCategory === 'other' && !otherReason.trim()) {
      toast({
        title: "Please provide details",
        description: "We need more information about your report",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (contentType === 'comment') {
        await handleFlag(contentId, reportReason);
      } else {
        // For other content types, we'd have different handlers
        toast({
          title: "Content reported",
          description: "Thank you for helping keep our platform safe",
        });
      }
      
      setIsOpen(false);
      setReason('');
      setReasonCategory('');
      setOtherReason('');
      
      if (onReportSubmitted) {
        onReportSubmitted();
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "There was a problem submitting your report",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={buttonSize}
          className="text-muted-foreground"
          disabled={isProcessing || !isLoggedIn}
        >
          {buttonSize === 'icon' ? (
            <Flag className="h-4 w-4" />
          ) : (
            <>
              <Flag className="h-4 w-4 mr-2" />
              Report
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Report Content
          </DialogTitle>
          <DialogDescription>
            Help us understand why this content should be reviewed by our moderation team.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for reporting</Label>
            <Select 
              value={reasonCategory} 
              onValueChange={setReasonCategory}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {reasonCategory === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="details">Please provide details</Label>
              <Textarea
                id="details"
                placeholder="Tell us more about why you're reporting this content..."
                value={otherReason}
                onChange={e => setOtherReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReportSubmit}
            disabled={isProcessing}
          >
            {isProcessing ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportContentButton;
