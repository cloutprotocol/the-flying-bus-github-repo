
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  SendHorizonal,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ArticleSubmitDialog from './ArticleSubmitDialog';

interface SimpleFormActionsProps {
  onSaveDraft: () => Promise<void>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  isDirty: boolean;
  isSaving: boolean;
}

const SimpleFormActions: React.FC<SimpleFormActionsProps> = ({
  onSaveDraft,
  onSubmit,
  isSubmitting,
  isDirty,
  isSaving
}) => {
  const { toast } = useToast();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  
  const handleSave = async () => {
    try {
      await onSaveDraft();
    } catch (error) {
      console.error('Error saving draft:', error);
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
      console.error('Error submitting article:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit article. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const handleSubmitClick = () => {
    if (isDirty) {
      setShowSubmitDialog(true);
    } else {
      handleSubmit();
    }
  };
  
  return (
    <>
      <div className="flex flex-wrap justify-end items-center gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isSubmitting || isSaving}
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
          disabled={isSubmitting}
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

export default SimpleFormActions;
