
import React from 'react';
import { Button } from '@/components/ui/button';
import { DrawerClose } from '@/components/ui/drawer';

interface MobileLevelOptionProps {
  level: string | null;
  selectedReadingLevel: string | null;
  onReadingLevelChange: (level: string | null) => void;
}

export const MobileLevelOption: React.FC<MobileLevelOptionProps> = ({
  level,
  selectedReadingLevel,
  onReadingLevelChange
}) => (
  <DrawerClose asChild>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => onReadingLevelChange(level)}
      className={`w-full justify-start text-left ${
        selectedReadingLevel === level 
          ? 'bg-gray-100 font-medium' 
          : ''
      }`}
    >
      {level || 'All Levels'}
      {selectedReadingLevel === level && <span className="ml-auto text-flyingbus-purple">•</span>}
    </Button>
  </DrawerClose>
);
