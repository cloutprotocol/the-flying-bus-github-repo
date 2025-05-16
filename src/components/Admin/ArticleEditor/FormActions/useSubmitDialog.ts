
import { useState, useRef, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

export const useSubmitDialog = (
  isSubmitting: boolean = false
) => {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isProcessingSubmit, setIsProcessingSubmit] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Use refs to track state and prevent race conditions
  const isSubmittingRef = useRef(isSubmitting);
  const isProcessingSubmitRef = useRef(false);
  const showSubmitDialogRef = useRef(false);
  
  // Update refs when props change
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
    
    // Reset error state when submission completes
    if (!isSubmitting && submissionError) {
      setSubmissionError(null);
    }
  }, [isSubmitting, submissionError]);
  
  // Track dialog state in ref
  useEffect(() => {
    showSubmitDialogRef.current = showSubmitDialog;
    if (showSubmitDialog) {
      logger.info(LogSource.EDITOR, 'Submit dialog shown');
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
  
  const openSubmitDialog = () => {
    logger.info(LogSource.EDITOR, 'Opening submit dialog');
    setShowSubmitDialog(true);
  };

  return {
    showSubmitDialog,
    setShowSubmitDialog,
    isProcessingSubmit,
    setIsProcessingSubmit,
    submissionError,
    setSubmissionError,
    isProcessingSubmitRef,
    handleDialogOpenChange,
    openSubmitDialog
  };
};

export default useSubmitDialog;
