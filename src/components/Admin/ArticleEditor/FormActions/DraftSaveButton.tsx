
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';

interface DraftSaveButtonProps {
  onSaveDraft: () => Promise<void>;
  isSaving?: boolean;
  isDirty?: boolean;
  isSubmitting?: boolean;
  isProcessingSubmit?: boolean;
  saveStatus?: DraftSaveStatus;
}

const DraftSaveButton: React.FC<DraftSaveButtonProps> = ({
  onSaveDraft,
  isSaving = false,
  isDirty = false,
  isSubmitting = false,
  isProcessingSubmit = false,
  saveStatus = 'idle'
}) => {
  const handleSaveDraft = () => {
    if (!isDirty && saveStatus !== 'error') {
      logger.info(LogSource.EDITOR, 'No changes to save', {
        isDirty,
        saveStatus
      });
      return;
    }
    
    console.log("Save Draft button clicked, calling onSaveDraft");
    onSaveDraft();
  };

  return (
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
  );
};

export default DraftSaveButton;
