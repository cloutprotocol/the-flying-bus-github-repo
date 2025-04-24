
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, History, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import ArticleSubmitDialog from './ArticleSubmitDialog';

interface FormActionsProps {
  onSaveDraft: () => void;
  onSubmit?: () => void; // Made optional with "?"
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
  
  useEffect(() => {
    if (saveStatus === 'saved') {
      toast({
        title: "Draft saved",
        description: "Your draft has been saved successfully",
        variant: "default"
      });
    } else if (saveStatus === 'error') {
      toast({
        title: "Save failed",
        description: "There was an error saving your draft",
        variant: "destructive"
      });
    }
  }, [saveStatus, toast]);
  
  const handleSaveDraft = () => {
    if (!isDirty && saveStatus !== 'error') {
      toast({
        title: "No changes to save",
        description: "Make some changes before saving a draft",
        variant: "default"
      });
      return;
    }
    
    onSaveDraft();
  };
  
  const handleSubmitClick = () => {
    if (!onSubmit) {
      toast({
        title: "Feature not available",
        description: "Submit functionality is not available in this context",
        variant: "default"
      });
      return;
    }
    
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
