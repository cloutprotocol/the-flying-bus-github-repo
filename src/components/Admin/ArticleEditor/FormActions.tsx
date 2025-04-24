
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
  onSaveDraft: () => void;
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
  
  usePerformanceMonitoring('FormActions', {
    hasSubmit: !!onSubmit,
    hasRevisions
  });
  
  useEffect(() => {
    if (saveStatus === 'saved') {
      endTiming({ status: 'success' });
      toast({
        title: "Draft saved",
        description: "Your draft has been saved successfully",
        variant: "default"
      });
    } else if (saveStatus === 'error') {
      endTiming({ status: 'error' });
      toast({
        title: "Save failed",
        description: "There was an error saving your draft",
        variant: "destructive"
      });
    }
  }, [saveStatus, toast, endTiming]);
  
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
    onSaveDraft();
  };
  
  const handleSubmitClick = () => {
    if (!onSubmit) {
      logger.info(LogSource.EDITOR, 'Submit functionality not available');
      toast({
        title: "Feature not available",
        description: "Submit functionality is not available in this context",
        variant: "default"
      });
      return;
    }
    
    startTiming('article-submission');
    if (isDirty || saveStatus === 'error') {
      setShowSubmitDialog(true);
    } else {
      onSubmit();
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
          >
            <History className="mr-2 h-4 w-4" /> View Revisions
          </Button>
        )}
        
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting || isSaving || (!isDirty && saveStatus !== 'error')}
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
          disabled={isSubmitting || isSaving || !onSubmit}
        >
          {isSubmitting ? (
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
          onOpenChange={setShowSubmitDialog}
          onConfirm={() => {
            setShowSubmitDialog(false);
            onSubmit();
          }}
          isDirty={isDirty}
        />
      )}
    </>
  );
};

export default FormActions;
