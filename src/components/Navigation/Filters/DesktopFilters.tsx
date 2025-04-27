
import React from 'react';
import { Tag, CalendarDays, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface DesktopFiltersProps {
  sortBy: 'newest' | 'oldest' | 'a-z';
  onSortChange: (value: 'newest' | 'oldest' | 'a-z') => void;
  readingLevels?: string[];
  onReadingLevelChange?: (level: string | null) => void;
  selectedReadingLevel?: string | null;
}

export const DesktopFilters: React.FC<DesktopFiltersProps> = ({
  sortBy,
  onSortChange,
  readingLevels = [],
  onReadingLevelChange,
  selectedReadingLevel
}) => (
  <div className="flex items-center gap-3">
    {readingLevels.length > 0 && onReadingLevelChange && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs flex gap-1 items-center border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <Tag size={14} className="text-gray-500" />
            {selectedReadingLevel ? `Level: ${selectedReadingLevel}` : 'Reading Level'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuLabel>Reading Level</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => onReadingLevelChange(null)}>
              <span className={!selectedReadingLevel ? 'font-bold' : ''}>All Levels</span>
            </DropdownMenuItem>
            {readingLevels.map((level) => (
              <DropdownMenuItem 
                key={level} 
                onSelect={() => onReadingLevelChange(level)}
              >
                <span className={selectedReadingLevel === level ? 'font-bold' : ''}>{level}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )}
    
    <Card className="p-1 flex gap-1 bg-white border border-gray-200 rounded-xl">
      <Button 
        variant={sortBy === 'newest' ? 'default' : 'ghost'} 
        size="sm"
        onClick={() => onSortChange('newest')}
        className={`text-xs flex gap-1 items-center ${
          sortBy === 'newest' 
            ? 'bg-gray-800 text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <CalendarDays size={14} /> Newest
      </Button>
      <Button 
        variant={sortBy === 'oldest' ? 'default' : 'ghost'} 
        size="sm"
        onClick={() => onSortChange('oldest')}
        className={`text-xs flex gap-1 items-center ${
          sortBy === 'oldest' 
            ? 'bg-gray-800 text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <CalendarDays size={14} /> Oldest
      </Button>
      <Button 
        variant={sortBy === 'a-z' ? 'default' : 'ghost'} 
        size="sm"
        onClick={() => onSortChange('a-z')}
        className={`text-xs flex gap-1 items-center ${
          sortBy === 'a-z' 
            ? 'bg-gray-800 text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <SortAsc size={14} /> A-Z
      </Button>
    </Card>
  </div>
);
