import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, History, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import ArticleSubmitDialog from './ArticleSubmitDialog';
import { usePerformanceMonitoring, usePerformanceMeasurement } from '@/hooks/usePerformanceMonitoring';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { UseFormReturn } from 'react-hook-form';

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
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [startTiming, endTiming] = usePerformanceMeasurement();
  const [toastShown, setToastShown] = useState(false); // Track if we've shown a toast for the current status
  const [isProcessingSubmit, setIsProcessingSubmit] = useState(false);
  
  // Use refs to track state and prevent race conditions
  const isSubmittingRef = useRef(isSubmitting);
  const isProcessingSubmitRef = useRef(false);
  const showSubmitDialogRef = useRef(false);
  
  usePerformanceMonitoring('FormActions', {
    hasSubmit: !!onSubmit,
    hasRevisions
  });
  
  // Update refs when props change
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);
  
  // Track dialog state in ref
  useEffect(() => {
    showSubmitDialogRef.current = showSubmitDialog;
    if (showSubmitDialog) {
      logger.info(LogSource.EDITOR, 'Submit dialog shown in FormActions');
    }
  }, [showSubmitDialog]);
  
  // Reset processing state when isSubmitting becomes false
  useEffect(() => {
    if (!isSubmitting && isProcessingSubmit) {
      logger.info(LogSource.EDITOR, 'Submission completed, resetting processing state');
      setIsProcessingSubmit(false);
      isProcessingSubmitRef.current = false;
    }
  }, [isSubmitting, isProcessingSubmit]);
  
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
  
  // New function to validate the form before showing the dialog
  const performFormValidation = (): boolean => {
    // If custom validation function is provided, use it
    if (validateForm) {
      const { isValid, errors } = validateForm();
      if (!isValid && errors.length > 0) {
        // Display the first error
        toast({
          title: "Validation Error",
          description: errors[0],
          variant: "destructive"
        });
        return false;
      }
      return isValid;
    }
    
    // Otherwise, perform basic validation using form and content
    if (form) {
      // Check title
      const title = form.getValues('title');
      if (!title || title.trim() === '') {
        toast({
          title: "Validation Error",
          description: "Article title is required",
          variant: "destructive"
        });
        form.setError('title', { type: 'required', message: 'Title is required' });
        return false;
      }
      
      // Check category
      const categoryId = form.getValues('categoryId');
      if (!categoryId) {
        toast({
          title: "Validation Error",
          description: "Please select a category",
          variant: "destructive"
        });
        form.setError('categoryId', { type: 'required', message: 'Category is required' });
        return false;
      }
    }
    
    // Check content
    if (!content || content.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Article content is required",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
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
    
    // Validate the form first
    if (!performFormValidation()) {
      logger.info(LogSource.EDITOR, 'Form validation failed');
      return;
    }
    
    // If validation passed, open the submit dialog
    console.log("Form validation passed, setting showSubmitDialog to true");
    logger.info(LogSource.EDITOR, 'Form validation passed, opening submit dialog', { isDirty });
    setShowSubmitDialog(true);
  };
  
  const handleDialogOpenChange = (isOpen: boolean) => {
    // Only allow changing if we're not actively submitting or processing
    if (!isProcessingSubmitRef.current && !isSubmittingRef.current) {
      console.log("Dialog open state changed to:", isOpen);
      logger.info(LogSource.EDITOR, 'Dialog open state manually changed', { isOpen });
      setShowSubmitDialog(isOpen);
    } else {
      console.log("Cannot change dialog state during submission");
    }
  };
  
  const handleDialogConfirm = async () => {
    console.log("Dialog confirmed, starting submission process");
    logger.info(LogSource.EDITOR, 'Dialog confirmed, starting submission');
    
    // Mark that we're processing a submission to prevent state conflicts
    setIsProcessingSubmit(true);
    isProcessingSubmitRef.current = true;
    
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
      
      // The ArticleSubmitDialog will handle the error display
    }
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
