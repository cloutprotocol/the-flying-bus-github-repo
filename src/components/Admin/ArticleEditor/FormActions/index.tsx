
import React, { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { UseFormReturn } from 'react-hook-form';
import ArticleSubmitDialog from '../ArticleSubmitDialog';
import DraftSaveButton from './DraftSaveButton';
import SubmitButton from './SubmitButton';
import RevisionButton from './RevisionButton';
import useFormValidation from './useFormValidation';
import useSubmitDialog from './useSubmitDialog';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

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
  const [toastShown, setToastShown] = useState(false);
  const submissionCompleted = useRef(false);
  const errorCountRef = useRef(0);
  
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
  
  // Reset submission state when component mounts
  useEffect(() => {
    submissionCompleted.current = false;
    errorCountRef.current = 0;
    return () => {
      submissionCompleted.current = false;
    };
  }, []);
  
  // Handle save status notifications with reduced frequency
  useEffect(() => {
    if (saveStatus === 'saved' && !toastShown) {
      setToastShown(true);
    } else if (saveStatus === 'error' && !toastShown) {
      toast({
        title: "Save failed",
        description: "There was an error saving your draft",
        variant: "destructive"
      });
      setToastShown(true);
      
      // Track error count for logging
      errorCountRef.current += 1;
      logger.error(LogSource.EDITOR, `Draft save error #${errorCountRef.current}`, {
        isDirty,
        hasForm: !!form,
        contentLength: content.length
      });
    } else if (saveStatus === 'idle' || saveStatus === 'saving') {
      setToastShown(false);
    }
  }, [saveStatus, toast, toastShown, isDirty, content.length, form]);
  
  const handleSaveDraft = async () => {
    // Don't save if submission is completed
    if (submissionCompleted.current) {
      return Promise.resolve();
    }
    
    if (!isDirty && saveStatus !== 'error') {
      toast({
        title: "No changes to save",
        description: "Make some changes before saving a draft",
        variant: "default"
      });
      return Promise.resolve();
    }
    
    logger.info(LogSource.EDITOR, "Manual draft save initiated", {
      isDirty,
      saveStatus,
      contentLength: content.length
    });
    
    return onSaveDraft();
  };
  
  const handleSubmitClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onSubmit) {
      toast({
        title: "Feature not available",
        description: "Submit functionality is not available in this context",
        variant: "default"
      });
      return;
    }
    
    if (isSubmitting || isProcessingSubmit || isProcessingSubmitRef.current) {
      logger.info(LogSource.EDITOR, "Submission already in progress, ignoring duplicate click");
      return;
    }
    
    setSubmissionError(null);
    
    logger.info(LogSource.EDITOR, "Submit button clicked", {
      isDirty,
      saveStatus,
      contentLength: content.length
    });
    
    if (!performFormValidation()) {
      logger.warn(LogSource.EDITOR, "Form validation failed on submission");
      return;
    }
    
    // Set submission completed to prevent auto-save
    submissionCompleted.current = true;
    
    // Open dialog if changes need to be saved, otherwise submit directly
    // This optimization reduces steps for the user
    if (isDirty && saveStatus !== 'saved') {
      logger.info(LogSource.EDITOR, "Opening submit dialog for unsaved changes");
      openSubmitDialog();
    } else {
      logger.info(LogSource.EDITOR, "No unsaved changes, proceeding with direct submission");
      handleDialogConfirm();
    }
  };
  
  const handleDialogConfirm = async () => {
    setIsProcessingSubmit(true);
    isProcessingSubmitRef.current = true;
    setSubmissionError(null);
    
    logger.info(LogSource.EDITOR, "Submission dialog confirmed, proceeding with submission");
    
    try {
      if (onSubmit) {
        await onSubmit();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Submission failed";
      setSubmissionError(errorMessage);
      
      logger.error(LogSource.EDITOR, "Error during submission after dialog confirmation", {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
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
