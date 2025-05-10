
import React, { useState, useEffect, useRef } from "react";
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
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger/logger";
import { LogSource } from "@/utils/logger/types";

interface ArticleSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
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
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
      setHasError(false);
      setErrorMessage("");
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
  
  const handleDialogCleanup = () => {
    // Reset dialog state
    setIsSubmitting(false);
    confirmClickedRef.current = false;
    
    // Close the dialog
    if (dialogStateRef.current.isOpen) {
      logger.info(LogSource.EDITOR, 'Cleaning up dialog state');
      onOpenChange(false);
    }
  };
  
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
      setHasError(false);
      setErrorMessage("");
      
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
      
      try {
        // Call the parent's confirm callback with error handling
        await onConfirm();
        
        // After a delay, set redirecting state
        setTimeout(() => {
          if (dialogStateRef.current.isOpen) {
            logger.info(LogSource.EDITOR, 'Setting redirecting state to true after delay');
            setIsRedirecting(true);
            
            // Ensure dialog closes after submission
            setTimeout(() => {
              handleDialogCleanup();
            }, 1500);
          }
        }, 1000);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        logger.error(LogSource.EDITOR, 'Error from onConfirm callback', { error, errorMsg });
        setHasError(true);
        setErrorMessage(errorMsg);
        confirmClickedRef.current = false;
        setIsSubmitting(false);
        
        toast({
          title: "Submission Error",
          description: errorMsg || "There was a problem submitting your article. Please try again.",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error in submit dialog confirmation', error);
      confirmClickedRef.current = false;
      setIsSubmitting(false);
      setHasError(true);
      
      toast({
        title: "Submission Error",
        description: "An error occurred while processing your submission.",
        variant: "destructive"
      });
    }
  };
  
  const handleCancel = () => {
    // Allow closing the dialog when there's an error
    if (hasError) {
      logger.info(LogSource.EDITOR, 'Closing dialog after error');
      onOpenChange(false);
      return;
    }
    
    // Don't allow closing if submitting or redirecting
    if (isSubmitting || isRedirecting || confirmClickedRef.current) {
      logger.info(LogSource.EDITOR, 'Attempted to cancel during submission, preventing');
      return;
    }
    
    onOpenChange(false);
  };
  
  return (
    <AlertDialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // Log the open state change attempt
        console.log(`Dialog state change attempt: ${open} -> ${newOpen}`);
        
        // Allow closing if there's an error
        if (hasError && !newOpen) {
          logger.info(LogSource.EDITOR, 'Allowing dialog close after error');
          onOpenChange(false);
          return;
        }
        
        // Prevent closing the dialog when submitting or redirecting
        if ((isSubmitting || isRedirecting || confirmClickedRef.current) && !newOpen) {
          logger.info(LogSource.EDITOR, 'Preventing dialog close during submission', {
            isSubmitting,
            isRedirecting,
            confirmClicked: confirmClickedRef.current,
            hasError
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
          // Allow escape key if there's an error
          if (hasError) {
            return;
          }
          
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
          
          {hasError && (
            <div className="mt-4 p-3 border border-red-200 bg-red-50 rounded-md text-red-800 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Submission failed</p>
                <p className="text-sm mt-1">{errorMessage || "There was an error submitting your article. Please try again."}</p>
              </div>
            </div>
          )}
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={isSubmitting && !hasError}
          >
            Cancel
          </AlertDialogCancel>
          
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-primary hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Submitting...
              </>
            ) : hasError ? (
              "Try Again"
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
