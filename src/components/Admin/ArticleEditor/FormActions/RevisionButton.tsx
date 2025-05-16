
import React from 'react';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';

interface RevisionButtonProps {
  onViewRevisions: () => void;
  disabled?: boolean;
}

const RevisionButton: React.FC<RevisionButtonProps> = ({
  onViewRevisions,
  disabled = false
}) => {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onViewRevisions}
      className="mr-auto"
      disabled={disabled}
    >
      <History className="mr-2 h-4 w-4" /> View Revisions
    </Button>
  );
};

export default RevisionButton;
