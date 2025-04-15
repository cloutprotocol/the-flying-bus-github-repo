
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';

interface SelectionToolbarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  onDeselectAll,
  onDeleteSelected
}) => {
  return (
    <div className="bg-muted p-3 rounded-md flex items-center justify-between mb-4">
      <div className="text-sm">
        {selectedCount} items selected
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={onDeselectAll}>
          Deselect All
        </Button>
        <Button variant="destructive" size="sm" onClick={onDeleteSelected}>
          <Trash className="mr-2 h-4 w-4" />
          Delete Selected
        </Button>
      </div>
    </div>
  );
};

export default SelectionToolbar;
