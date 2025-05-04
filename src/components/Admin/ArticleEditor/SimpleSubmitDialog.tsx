
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface SimpleSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * A simpler dialog component that uses Dialog instead of AlertDialog
 * This component has more predictable behavior since Dialog gives more control
 */
const SimpleSubmitDialog: React.FC<SimpleSubmitDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Submit",
  cancelLabel = "Cancel"
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleConfirm = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      logger.info(LogSource.EDITOR, 'Simple dialog - Confirm clicked');
      
      // Execute the confirm callback
      await onConfirm();
      
      // We intentionally don't close the dialog here
      // The parent component should handle that based on the operation result
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error in simple dialog confirmation', error);
      // Reset submit state on error
      setIsSubmitting(false);
    }
  };
  
  // Only allow closing if not submitting
  const handleOpenChange = (newOpen: boolean) => {
    if (isSubmitting && !newOpen) {
      logger.info(LogSource.EDITOR, 'Preventing dialog close during submission');
      return;
    }
    onOpenChange(newOpen);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleSubmitDialog;
