
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Send } from 'lucide-react';

interface FormActionsProps {
  onSaveDraft: () => void;
  isSubmitting?: boolean;
}

const FormActions: React.FC<FormActionsProps> = ({ 
  onSaveDraft,
  isSubmitting = false
}) => {
  return (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={onSaveDraft}
        disabled={isSubmitting}
      >
        <Save className="mr-2 h-4 w-4" /> Save Draft
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        <Send className="mr-2 h-4 w-4" /> Submit for Review
      </Button>
    </div>
  );
};

export default FormActions;
