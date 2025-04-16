
import React from 'react';
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";

interface DrawerFormActionsProps {
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onCancel: () => void;
}

const DrawerFormActions: React.FC<DrawerFormActionsProps> = ({
  isSubmitting,
  submitLabel,
  submittingLabel,
  onCancel
}) => {
  return (
    <DrawerFooter className="px-0">
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
        Cancel
      </Button>
    </DrawerFooter>
  );
};

export default DrawerFormActions;
