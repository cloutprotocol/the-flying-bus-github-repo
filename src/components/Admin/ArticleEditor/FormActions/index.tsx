
import React, { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { usePerformanceMonitoring, usePerformanceMeasurement } from '@/hooks/usePerformanceMonitoring';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { UseFormReturn } from 'react-hook-form';
import ArticleSubmitDialog from '../ArticleSubmitDialog';
import DraftSaveButton from './DraftSaveButton';
import SubmitButton from './SubmitButton';
import RevisionButton from './RevisionButton';
import useFormValidation from './useFormValidation';
import useSubmitDialog from './useSubmitDialog';

interface FormActionsProps {
  onSaveDraft: () => Promise<void>;
  onSubmit?: () => Promise<void>;
  onViewRevisions?: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  saveStatus?: DraftSaveStatus;
  hasRevisions?: boolean;
  form?: UseFormReturn<any>;
  content?: string;
  validateForm?: () => { isValid: boolean; errors: string[] };
}

const FormActions: React.FC<FormActionsProps> = ({ 
  onSaveDraft,
  onSubmit,
  onViewRevisions,
  isSubmitting = false,
  isDirty = false,
  isSaving = false,
  saveStatus = 'idle',
  hasRevisions = false,
  form,
  content = '',
  validateForm
}) => {
  const { toast } = useToast();
  const [startTiming, endTiming] = usePerformanceMeasurement();
  const [toastShown, setToastShown] = useState(false); // Track if we've shown a toast for the current status
  
  const { performFormValidation } = useFormValidation(form, content, validateForm);
  const { 
    showSubmitDialog, 
    isProcessingSubmit,
    submissionError,
    setSubmissionError,
    handleDialogOpenChange,
    isProcessingSubmitRef,
    setIsProcessingSubmit,
    openSubmitDialog
  } = useSubmitDialog(isSubmitting);
  
  usePerformanceMonitoring('FormActions', {
    hasSubmit: !!onSubmit,
    hasRevisions
  });
  
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
    // Prevent any default behavior or event bubbling
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Submit button clicked");
    
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
    if (isSubmitting || isProcessingSubmit || isProcessingSubmitRef.current) {
      console.log("Submission already in progress, ignoring click");
      return;
    }
    
    // Reset the error state when attempting a new submission
    setSubmissionError(null);
    
    // Validate the form first
    if (!performFormValidation()) {
      logger.info(LogSource.EDITOR, 'Form validation failed');
      return;
    }
    
    // If validation passed, open the submit dialog
    console.log("Form validation passed, setting showSubmitDialog to true");
    logger.info(LogSource.EDITOR, 'Form validation passed, opening submit dialog', { isDirty });
    openSubmitDialog();
  };
  
  const handleDialogConfirm = async () => {
    console.log("Dialog confirmed, starting submission process");
    logger.info(LogSource.EDITOR, 'Dialog confirmed, starting submission');
    
    // Mark that we're processing a submission to prevent state conflicts
    setIsProcessingSubmit(true);
    isProcessingSubmitRef.current = true;
    
    // Reset error state
    setSubmissionError(null);
    
    startTiming('article-submission');
    
    try {
      // Allow the dialog to stay open (don't close it here)
      // The dialog will manage its own state during submission
      
      if (onSubmit) {
        // Execute the submission - now properly awaiting the Promise
        await onSubmit();
      }
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error during submission from dialog', error);
      console.error("Submission failed:", error);
      
      // Set error message for the dialog to display
      setSubmissionError(error instanceof Error ? error.message : "Submission failed");
      
      // The ArticleSubmitDialog will handle the error display
    }
  };
  
  return (
    <>
      <div className="flex justify-end gap-3">
        {hasRevisions && onViewRevisions && (
          <RevisionButton 
            onViewRevisions={onViewRevisions}
            disabled={isSubmitting || isSaving || isProcessingSubmit}
          />
        )}
        
        <DraftSaveButton 
          onSaveDraft={handleSaveDraft}
          isSaving={isSaving}
          isDirty={isDirty}
          isSubmitting={isSubmitting}
          isProcessingSubmit={isProcessingSubmit}
          saveStatus={saveStatus}
        />
        
        <SubmitButton 
          onSubmitClick={handleSubmitClick}
          isSubmitting={isSubmitting}
          isProcessingSubmit={isProcessingSubmit}
          disabled={isSaving || !onSubmit}
        />
      </div>
      
      {onSubmit && showSubmitDialog && (
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
