
// Fixed variant prop type by removing 'subtle' option which is not available

import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Flag, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DrawerAuth } from '@/components/ui/drawer-auth';
import { reportContent, ReportType, ContentType } from '@/services/safety';
import { useValidation } from '@/providers/ValidationProvider';
import { z } from 'zod';

interface ReportContentButtonProps {
  contentId: string;
  contentType: ContentType;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const reportSchema = z.object({
  reason: z.string().min(3, 'Please select a reason').max(100),
  details: z.string().max(500, 'Details must be 500 characters or less'),
});

const ReportContentButton: React.FC<ReportContentButtonProps> = ({
  contentId,
  contentType,
  variant = 'ghost',
  buttonSize = 'sm',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportReason, setReportReason] = useState<ReportType | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const { toast } = useToast();
  const { currentUser, isLoggedIn } = useAuth();
  const { validateForm } = useValidation();
  
  const handleSubmit = async () => {
    const validation = validateForm(reportSchema, { 
      reason: reportReason, 
      details: reportDetails 
    });
    
    if (!validation.isValid) {
      return;
    }
    
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to report content",
        variant: "destructive",
      });
      setOpen(false);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const { success, error } = await reportContent(
        contentId,
        contentType,
        reportReason as ReportType,
        reportDetails,
        currentUser.id
      );
      
      if (success) {
        toast({
          title: "Report Submitted",
          description: "Thank you for your report. Our team will review it shortly.",
        });
        setOpen(false);
        setReportReason('');
        setReportDetails('');
      } else {
        toast({
          title: "Report Failed",
          description: "There was an error submitting your report. Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const reportButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={buttonSize}
          className={className}
        >
          <Flag className="h-4 w-4" />
          {buttonSize !== 'icon' && <span className="ml-2">Report</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Please let us know why you're reporting this content. Our moderators will review your report.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Label>Reason for reporting</Label>
          <RadioGroup value={reportReason} onValueChange={value => setReportReason(value as ReportType)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="harassment" id="harassment" />
              <Label htmlFor="harassment">Harassment or bullying</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="inappropriate" id="inappropriate" />
              <Label htmlFor="inappropriate">Inappropriate content</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="misinformation" id="misinformation" />
              <Label htmlFor="misinformation">Misinformation</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="spam" id="spam" />
              <Label htmlFor="spam">Spam</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="other" />
              <Label htmlFor="other">Other</Label>
            </div>
          </RadioGroup>
          
          <div className="grid w-full gap-1.5">
            <Label htmlFor="reportDetails">Additional details</Label>
            <Textarea
              id="reportDetails"
              placeholder="Please provide any additional details about your report"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="outline" disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!reportReason || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  if (!isLoggedIn) {
    return (
      <DrawerAuth 
        triggerComponent={
          <Button 
            variant={variant} 
            size={buttonSize}
            className={className}
          >
            <Flag className="h-4 w-4" />
            {buttonSize !== 'icon' && <span className="ml-2">Report</span>}
          </Button>
        }
        defaultTab="sign-in"
      />
    );
  }
  
  return reportButton;
};

export default ReportContentButton;
