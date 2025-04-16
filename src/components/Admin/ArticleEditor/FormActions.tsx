
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FormActionsProps {
  onSaveDraft: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({ 
  onSaveDraft,
  isSubmitting = false,
  isDirty = false,
  isSaving = false
}) => {
  const { toast } = useToast();
  
  const handleSaveDraft = () => {
    if (!isDirty) {
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
      <Button
        type="button"
        variant="outline"
        onClick={handleSaveDraft}
        disabled={isSubmitting || isSaving || !isDirty}
      >
        <Save className="mr-2 h-4 w-4" /> 
        {isSaving ? 'Saving...' : 'Save Draft'}
      </Button>
      <Button type="submit" disabled={isSubmitting || !isDirty}>
        <Send className="mr-2 h-4 w-4" /> Submit for Review
      </Button>
    </div>
  );
};

export default FormActions;
