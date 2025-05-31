
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  SendHorizonal,
  History,
  Loader2
} from 'lucide-react';
import type { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { useToast } from '@/hooks/use-toast';
import ArticleSubmitDialog from './ArticleSubmitDialog';
import { UseFormReturn } from 'react-hook-form';

interface EnhancedFormActionsProps {
  onSaveDraft: () => Promise<void>;
  onSubmit: () => Promise<void>;
  onViewRevisions?: () => void;
  isSubmitting: boolean;
  isDirty: boolean;
  isSaving: boolean;
  saveStatus: DraftSaveStatus;
  hasRevisions: boolean;
  disableSubmit?: boolean;
  form?: UseFormReturn<any>;
  content?: string;
}

const EnhancedFormActions: React.FC<EnhancedFormActionsProps> = ({
  onSaveDraft,
  onSubmit,
  onViewRevisions,
  isSubmitting,
  isDirty,
  isSaving,
  saveStatus,
  hasRevisions,
  disableSubmit = false,
  form,
  content
}) => {
  const { toast } = useToast();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  
  const handleSave = async () => {
    try {
      await onSaveDraft();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save draft. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const handleSubmit = async () => {
    try {
      await onSubmit();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit article. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const validateFormFields = (): boolean => {
    if (!form) return true;
    
    // Simple validation - check for required fields
    const formData = form.getValues();
    const missingFields = [];
    
    if (!formData.title?.trim()) missingFields.push('Title');
    if (!formData.content?.trim()) missingFields.push('Content');
    if (!formData.imageUrl?.trim()) missingFields.push('Featured Image');
    if (!formData.categoryId?.trim()) missingFields.push('Category');
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }
    
    console.log('Form validation passed for data:', formData);
    return true;
  };
  
  const handleSubmitClick = () => {
    // Validate form fields first
    if (!validateFormFields()) {
      return;
    }
    
    if (isDirty || saveStatus === 'error') {
      setShowSubmitDialog(true);
    } else {
      handleSubmit();
    }
  };
  
  return (
    <>
      <div className="flex flex-wrap justify-end items-center gap-3 pt-4 border-t">
        {hasRevisions && onViewRevisions && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onViewRevisions}
            disabled={isSubmitting}
          >
            <History className="mr-2 h-4 w-4" />
            View Revisions
          </Button>
        )}
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isSubmitting || isSaving || !isDirty}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </>
          )}
        </Button>
        
        <Button
          type="button"
          onClick={handleSubmitClick}
          disabled={isSubmitting || disableSubmit}
          size="sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <SendHorizonal className="mr-2 h-4 w-4" />
              Submit for Review
            </>
          )}
        </Button>
        
        {saveStatus === 'saved' && (
          <span className="text-xs text-green-600 ml-2">
            Draft saved
          </span>
        )}
        
        {saveStatus === 'error' && (
          <span className="text-xs text-red-600 ml-2">
            Error saving draft
          </span>
        )}
      </div>
      
      <ArticleSubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={async () => {
          setShowSubmitDialog(false);
          return handleSubmit();
        }}
        isDirty={isDirty}
      />
    </>
  );
};

export default EnhancedFormActions;
