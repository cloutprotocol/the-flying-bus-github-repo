
import React from 'react';
import { Button } from '@/components/ui/button';
import { DrawerClose } from '@/components/ui/drawer';

interface MobileSortOptionProps {
  value: 'newest' | 'oldest' | 'a-z';
  label: string;
  icon: React.ReactNode;
  sortBy: 'newest' | 'oldest' | 'a-z';
  onSortChange: (value: 'newest' | 'oldest' | 'a-z') => void;
}

export const MobileSortOption: React.FC<MobileSortOptionProps> = ({
  value,
  label,
  icon,
  sortBy,
  onSortChange
}) => (
  <DrawerClose asChild>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => onSortChange(value)}
      className={`w-full justify-start text-left ${
        sortBy === value 
          ? 'bg-gray-100 font-medium' 
          : ''
      }`}
    >
      {icon}
      {label}
      {sortBy === value && <span className="ml-auto text-flyingbus-purple">•</span>}
    </Button>
  </DrawerClose>
);
