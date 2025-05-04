
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
  const confirmClickedRef = useRef(false);
  const { toast } = useToast();
  
  // Track dialog open state in ref to avoid race conditions
  useEffect(() => {
    dialogStateRef.current.isOpen = open;
    if (open) {
      logger.info(LogSource.EDITOR, 'Article submit dialog opened');
      // Reset refs when dialog opens
      confirmClickedRef.current = false;
      setIsSubmitting(false);
      setIsRedirecting(false);
    } else {
      logger.info(LogSource.EDITOR, 'Article submit dialog closed');
    }
  }, [open]);
  
  useEffect(() => {
    if (isRedirecting && dialogStateRef.current.isOpen && !confirmClickedRef.current) {
      // We're redirecting but not from a confirm click, close dialog
      logger.info(LogSource.EDITOR, 'Closing dialog before navigation happens');
      onOpenChange(false);
    }
  }, [isRedirecting, onOpenChange]);
  
  const handleConfirm = async (e: React.MouseEvent) => {
    try {
      // Prevent default behavior to avoid auto-closing
      e.preventDefault();
      e.stopPropagation();
      
      if (isSubmitting || confirmClickedRef.current) {
        console.log("Already submitting or confirmed, ignoring duplicate click");
        return;
      }
      
      // Mark that we've clicked confirm
      confirmClickedRef.current = true;
      setIsSubmitting(true);
      logger.info(LogSource.EDITOR, 'Submit dialog - Confirm button clicked', {
        isSubmitting,
        isRedirecting
      });
      
      // Show processing toast
      toast({
        title: "Processing submission",
        description: "Your article is being prepared for review...",
        duration: 5000,
      });
      
      // Call the parent's confirm callback
      onConfirm();
      
      // After a delay, set redirecting state
      // Using a longer delay to ensure the dialog stays visible
      setTimeout(() => {
        logger.info(LogSource.EDITOR, 'Setting redirecting state to true after delay');
        setIsRedirecting(true);
        
        // Only close the dialog after submission completes
        // We'll let the parent component handle navigation
      }, 3000); // Increased from 2000ms to 3000ms
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error in submit dialog confirmation', error);
      confirmClickedRef.current = false;
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
        // Log the open state change attempt
        console.log(`Dialog state change attempt: ${open} -> ${newOpen}`);
        
        // Prevent closing the dialog when submitting or redirecting
        if ((isSubmitting || isRedirecting || confirmClickedRef.current) && !newOpen) {
          logger.info(LogSource.EDITOR, 'Preventing dialog close during submission', {
            isSubmitting,
            isRedirecting,
            confirmClicked: confirmClickedRef.current
          });
          console.log("Preventing dialog close during submission or redirect");
          return;
        }
        
        logger.info(LogSource.EDITOR, `Dialog state changing to: ${newOpen}`);
        onOpenChange(newOpen);
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(e) => {
          // Prevent escape key from closing dialog during submission
          if (isSubmitting || isRedirecting || confirmClickedRef.current) {
            e.preventDefault();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Submit Article for Review</AlertDialogTitle>
          <AlertDialogDescription>
            {isDirty 
              ? "You have unsaved changes. The article will be saved before submission."
              : "Are you sure you want to submit this article for review?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            disabled={isSubmitting || isRedirecting || confirmClickedRef.current}
            onClick={(e) => {
              // Only handle cancel if we're not already submitting
              if (isSubmitting || isRedirecting || confirmClickedRef.current) {
                e.preventDefault();
                return;
              }
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
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
