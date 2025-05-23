
import React from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizonal, Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

interface SubmitButtonProps {
  onSubmitClick: (e: React.MouseEvent) => void;
  isSubmitting: boolean;
  isProcessingSubmit: boolean;
  disabled?: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  onSubmitClick,
  isSubmitting,
  isProcessingSubmit,
  disabled = false
}) => {
  const isDisabled = disabled || isSubmitting || isProcessingSubmit;
  
  const handleClick = (e: React.MouseEvent) => {
    try {
      logger.info(LogSource.EDITOR, "Submit button clicked", { 
        isSubmitting,
        isProcessingSubmit,
        disabled,
        timestamp: new Date().toISOString()
      });
      
      onSubmitClick(e);
    } catch (error) {
      logger.error(LogSource.EDITOR, "Error in submit button click handler", error);
      // Don't re-throw as we don't want to break the UI if the click handler fails
    }
  };

  return (
    <Button 
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className="min-w-[180px] relative"
      data-submitting={isSubmitting || isProcessingSubmit}
    >
      {isSubmitting || isProcessingSubmit ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
        </>
      ) : (
        <>
          <SendHorizonal className="mr-2 h-4 w-4" /> Submit for Review
        </>
      )}
    </Button>
  );
};

export default SubmitButton;
