
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Send, Loader2 } from 'lucide-react';

interface SimpleFormActionsProps {
  onSaveDraft: () => Promise<void>;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  isDirty: boolean;
  isSaving: boolean;
  disabled?: boolean;
}

const SimpleFormActions: React.FC<SimpleFormActionsProps> = ({
  onSaveDraft,
  onSubmit,
  isSubmitting,
  isDirty,
  isSaving,
  disabled = false
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving || isSubmitting || disabled}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          
          <Button
            type="submit"
            onClick={onSubmit}
            disabled={isSubmitting || isSaving || disabled}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </div>
        
        {isDirty && !isSaving && (
          <p className="text-sm text-muted-foreground mt-2">
            You have unsaved changes
          </p>
        )}
        
        {disabled && (
          <p className="text-sm text-destructive mt-2">
            Category must be loaded before submission
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleFormActions;
