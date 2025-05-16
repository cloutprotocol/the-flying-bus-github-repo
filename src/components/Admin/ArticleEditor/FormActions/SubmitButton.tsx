
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
  const handleClick = (e: React.MouseEvent) => {
    console.log("Submit button clicked, calling onSubmitClick");
    onSubmitClick(e);
  };

  return (
    <Button 
      type="button"
      onClick={handleClick}
      disabled={disabled || isSubmitting || isProcessingSubmit}
      className="min-w-[180px]"
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
