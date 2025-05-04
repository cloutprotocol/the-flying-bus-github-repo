
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger/logger";
import { LogSource } from "@/utils/logger/types";

interface ArticleSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDirty: boolean;
}

const ArticleSubmitDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm,
  isDirty 
}: ArticleSubmitDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const dialogStateRef = useRef({ isOpen: false });
  const { toast } = useToast();
  
  // Track dialog open state in ref to avoid race conditions
  useEffect(() => {
    dialogStateRef.current.isOpen = open;
  }, [open]);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      logger.info(LogSource.EDITOR, 'Article submit dialog opened');
      setIsSubmitting(false);
      setIsRedirecting(false);
    }
  }, [open]);
  
  // Listen for redirect state to close dialog before navigation
  useEffect(() => {
    if (isRedirecting && dialogStateRef.current.isOpen) {
      // Close dialog before navigation happens
      logger.info(LogSource.EDITOR, 'Dialog is in redirecting state, closing dialog');
      onOpenChange(false);
    }
  }, [isRedirecting, onOpenChange]);
  
  const handleConfirm = async () => {
    try {
      if (isSubmitting) {
        console.log("Already submitting, ignoring duplicate confirm");
        return;
      }
      
      setIsSubmitting(true);
      logger.info(LogSource.EDITOR, 'Submit dialog - Confirm button clicked');
      
      toast({
        title: "Processing submission",
        description: "Your article is being prepared for review...",
        duration: 5000, // Longer toast to ensure visibility
      });
      
      // Call the onConfirm callback
      onConfirm();
      
      // Set redirecting state which will trigger dialog close in useEffect
      // Small delay to allow the UI to update
      setTimeout(() => {
        logger.info(LogSource.EDITOR, 'Setting redirecting state to true');
        setIsRedirecting(true);
      }, 300);
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error in submit dialog confirmation', error);
      setIsSubmitting(false);
      toast({
        title: "Submission Error",
        description: "An error occurred while processing your submission.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <AlertDialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // Prevent closing the dialog while submitting or redirecting
        if ((isSubmitting || isRedirecting) && !newOpen) {
          logger.info(LogSource.EDITOR, 'Preventing dialog close during submission');
          return;
        }
        logger.info(LogSource.EDITOR, `Dialog state changing to: ${newOpen}`);
        onOpenChange(newOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit Article for Review</AlertDialogTitle>
          <AlertDialogDescription>
            {isDirty 
              ? "You have unsaved changes. The article will be saved before submission."
              : "Are you sure you want to submit this article for review?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting || isRedirecting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              // Prevent default to avoid automatic closing
              e.preventDefault(); 
              handleConfirm();
            }} 
            disabled={isSubmitting || isRedirecting}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting...
              </>
            ) : (
              "Submit"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ArticleSubmitDialog;
