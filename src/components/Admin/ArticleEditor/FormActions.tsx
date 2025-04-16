
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send, History } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';

interface FormActionsProps {
  onSaveDraft: () => void;
  onViewRevisions?: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  saveStatus?: DraftSaveStatus;
  hasRevisions?: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({ 
  onSaveDraft,
  onViewRevisions,
  isSubmitting = false,
  isDirty = false,
  isSaving = false,
  saveStatus = 'idle',
  hasRevisions = false
}) => {
  const { toast } = useToast();
  
  useEffect(() => {
    // Show toast for save status changes
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
  
  return (
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
        <Save className="mr-2 h-4 w-4" /> 
        {isSaving ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Draft'}
      </Button>
      
      <Button type="submit" disabled={isSubmitting || !isDirty}>
        <Send className="mr-2 h-4 w-4" /> Submit for Review
      </Button>
    </div>
  );
};

export default FormActions;
