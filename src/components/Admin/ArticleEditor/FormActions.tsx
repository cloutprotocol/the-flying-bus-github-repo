
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, History, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import ArticleSubmitDialog from './ArticleSubmitDialog';
import { usePerformanceMonitoring, usePerformanceMeasurement } from '@/hooks/usePerformanceMonitoring';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

interface FormActionsProps {
  onSaveDraft: () => Promise<void>;
  onSubmit?: () => void;
  onViewRevisions?: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  saveStatus?: DraftSaveStatus;
  hasRevisions?: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({ 
  onSaveDraft,
  onSubmit,
  onViewRevisions,
  isSubmitting = false,
  isDirty = false,
  isSaving = false,
  saveStatus = 'idle',
  hasRevisions = false
}) => {
  const { toast } = useToast();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [startTiming, endTiming] = usePerformanceMeasurement();
  const [toastShown, setToastShown] = useState(false); // Track if we've shown a toast for the current status
  const [isProcessingSubmit, setIsProcessingSubmit] = useState(false);
  
  usePerformanceMonitoring('FormActions', {
    hasSubmit: !!onSubmit,
    hasRevisions
  });
  
  // Reset processing state when isSubmitting becomes false
  useEffect(() => {
    if (!isSubmitting && isProcessingSubmit) {
      logger.info(LogSource.EDITOR, 'Submission completed, resetting processing state');
      setIsProcessingSubmit(false);
    }
  }, [isSubmitting, isProcessingSubmit]);
  
  // Separate effect to handle dialog closing ONLY after submission completes
  useEffect(() => {
    if (!isSubmitting && showSubmitDialog) {
      // Add a small delay before closing the dialog to avoid UI flash
      const timer = setTimeout(() => {
        logger.info(LogSource.EDITOR, 'Submission completed, closing dialog with delay');
        setShowSubmitDialog(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isSubmitting, showSubmitDialog]);
  
  useEffect(() => {
    // Only show toast notifications when the status changes, not on initial render
    if (saveStatus === 'saved' && !toastShown) {
      endTiming({ status: 'success' });
      toast({
        title: "Draft saved",
        description: "Your draft has been saved successfully",
        variant: "default"
      });
      setToastShown(true);
    } else if (saveStatus === 'error' && !toastShown) {
      endTiming({ status: 'error' });
      toast({
        title: "Save failed",
        description: "There was an error saving your draft",
        variant: "destructive"
      });
      setToastShown(true);
    } else if (saveStatus === 'idle' || saveStatus === 'saving') {
      // Reset toast shown status when we start a new save operation
      setToastShown(false);
    }
  }, [saveStatus, toast, endTiming, toastShown]);
  
  const handleSaveDraft = () => {
    if (!isDirty && saveStatus !== 'error') {
      logger.info(LogSource.EDITOR, 'No changes to save', {
        isDirty,
        saveStatus
      });
      toast({
        title: "No changes to save",
        description: "Make some changes before saving a draft",
        variant: "default"
      });
      return;
    }
    
    startTiming('draft-save');
    console.log("Save Draft button clicked, calling onSaveDraft");
    onSaveDraft();
  };
  
  const handleSubmitClick = (e: React.MouseEvent) => {
    console.log("Submit button clicked");
    
    // Prevent any default behavior or event bubbling
    e.preventDefault();
    e.stopPropagation();
    
    if (!onSubmit) {
      logger.info(LogSource.EDITOR, 'Submit functionality not available');
      toast({
        title: "Feature not available",
        description: "Submit functionality is not available in this context",
        variant: "default"
      });
      return;
    }
    
    // Disable submit button if submission is already in progress
    if (isSubmitting || isProcessingSubmit) {
      console.log("Submission already in progress, ignoring click");
      return;
    }
    
    setIsProcessingSubmit(true);
    startTiming('article-submission');
    if (isDirty || saveStatus === 'error') {
      console.log("Show submit dialog due to unsaved changes");
      setShowSubmitDialog(true);
    } else {
      console.log("Calling onSubmit directly");
      toast({
        title: "Preparing submission",
        description: "Your article is being processed for submission...",
      });
      onSubmit();
    }
  };
  
  const handleDialogOpenChange = (isOpen: boolean) => {
    // Only allow changing if we're not actively submitting
    if (!isProcessingSubmit && !isSubmitting) {
      console.log("Dialog open state changed to:", isOpen);
      setShowSubmitDialog(isOpen);
    } else {
      console.log("Cannot change dialog state during submission");
    }
  };
  
  const handleDialogConfirm = () => {
    console.log("Dialog confirmed, calling onSubmit");
    if (onSubmit) {
      onSubmit();
    }
    // Dialog will be closed by the effect when submission completes
  };
  
  return (
    <>
      <div className="flex justify-end gap-3">
        {hasRevisions && onViewRevisions && (
          <Button
            type="button"
            variant="ghost"
            onClick={onViewRevisions}
            className="mr-auto"
            disabled={isSubmitting || isSaving || isProcessingSubmit}
          >
            <History className="mr-2 h-4 w-4" /> View Revisions
          </Button>
        )}
        
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting || isSaving || (!isDirty && saveStatus !== 'error') || isProcessingSubmit}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> 
              {saveStatus === 'saved' ? 'Saved' : 'Save Draft'}
            </>
          )}
        </Button>
        
        <Button 
          type="button"
          onClick={handleSubmitClick}
          disabled={isSubmitting || isSaving || !onSubmit || isProcessingSubmit}
          className="min-w-[180px]"
        >
          {isSubmitting || isProcessingSubmit ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" /> Submit for Review
            </>
          )}
        </Button>
      </div>
      
      {onSubmit && (
        <ArticleSubmitDialog
          open={showSubmitDialog}
          onOpenChange={handleDialogOpenChange}
          onConfirm={handleDialogConfirm}
          isDirty={isDirty}
        />
      )}
    </>
  );
};

export default FormActions;
