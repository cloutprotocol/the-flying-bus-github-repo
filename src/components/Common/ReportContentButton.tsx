
import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Flag,
  AlertCircle,
  X,
  MessageSquare,
  FileText,
  User,
  CheckCircle
} from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { reportContent } from '@/services/moderationService';
import { reportSafetyConcern, ReportType } from '@/services/safetyService';
import { ContentType } from '@/services/moderationService';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ReportContentButtonProps {
  contentId: string;
  contentType: ContentType;
  variant?: 'default' | 'ghost' | 'outline' | 'subtle';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
}

const ReportContentButton: React.FC<ReportContentButtonProps> = ({
  contentId,
  contentType,
  variant = 'ghost',
  buttonSize = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('inappropriate');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // First report as safety concern
      const safetyResult = await reportSafetyConcern(
        contentId,
        contentType,
        reportType,
        description,
        currentUser?.id
      );
      
      // Also flag content for moderation
      const moderationResult = await reportContent(
        contentId,
        contentType,
        `User reported - ${reportType}: ${description}`,
        currentUser?.id
      );
      
      if (safetyResult.success && moderationResult.success) {
        setIsSuccess(true);
        toast({
          title: "Report submitted",
          description: "Thank you for helping keep our platform safe. Our team will review this content.",
        });
        
        // Reset form after a delay
        setTimeout(() => {
          setIsOpen(false);
          setIsSuccess(false);
          setReportType('inappropriate');
          setDescription('');
        }, 2000);
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error submitting report",
        description: "There was a problem submitting your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContentTypeIcon = () => {
    switch (contentType) {
      case 'article':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 mr-2" />;
      case 'profile':
        return <User className="h-4 w-4 mr-2" />;
      default:
        return <AlertCircle className="h-4 w-4 mr-2" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={buttonSize}>
          <Flag className={buttonSize === 'icon' ? 'h-4 w-4' : 'h-4 w-4 mr-2'} />
          {buttonSize !== 'icon' && 'Report'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="bg-green-100 p-3 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle>Thank You</DialogTitle>
            <DialogDescription className="text-center mt-2">
              Your report has been submitted. Our team will review the content.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report Content</DialogTitle>
              <DialogDescription>
                Help us keep The Flying Bus safe. Tell us what's wrong with this {contentType}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>What's the problem?</Label>
                <RadioGroup 
                  value={reportType} 
                  onValueChange={(value) => setReportType(value as ReportType)}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inappropriate" id="inappropriate" />
                    <Label htmlFor="inappropriate" className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                      Inappropriate content
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="harassment" id="harassment" />
                    <Label htmlFor="harassment" className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                      Harassment or bullying
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="privacy" id="privacy" />
                    <Label htmlFor="privacy" className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-blue-500" />
                      Privacy concern
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="misinformation" id="misinformation" />
                    <Label htmlFor="misinformation" className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-purple-500" />
                      Misinformation
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="flex items-center">
                      <Flag className="h-4 w-4 mr-2 text-gray-500" />
                      Something else
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Additional details</Label>
                <Textarea
                  id="description"
                  placeholder="Please explain what's wrong with this content..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || description.trim().length < 3}
              >
                <Flag className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportContentButton;
