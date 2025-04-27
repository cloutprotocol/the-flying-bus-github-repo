
import React from 'react';
import { CalendarDays, SortAsc, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMobileFilter } from '@/hooks/navigation/useMobileFilter';
import { MobileSortOption } from './Filters/MobileSortOption';
import { MobileLevelOption } from './Filters/MobileLevelOption';
import { DesktopFilters } from './Filters/DesktopFilters';

interface CategoryFilterProps {
  sortBy: 'newest' | 'oldest' | 'a-z';
  onSortChange: (value: 'newest' | 'oldest' | 'a-z') => void;
  readingLevels?: string[];
  onReadingLevelChange?: (level: string | null) => void;
  selectedReadingLevel?: string | null;
}

const CategoryFilter: React.FC<CategoryFilterProps> = (props) => {
  const { isMobile } = useMobileFilter();

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs flex gap-1 items-center border-gray-300 text-gray-700"
          >
            <Filter size={14} className="text-gray-500" />
            <span className="whitespace-nowrap">Filter & Sort</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter Articles</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-0">
            {props.readingLevels?.length > 0 && props.onReadingLevelChange && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Reading Level</h3>
                <div className="space-y-1">
                  <MobileLevelOption 
                    level={null}
                    selectedReadingLevel={props.selectedReadingLevel}
                    onReadingLevelChange={props.onReadingLevelChange}
                  />
                  {props.readingLevels.map((level) => (
                    <MobileLevelOption 
                      key={level}
                      level={level}
                      selectedReadingLevel={props.selectedReadingLevel}
                      onReadingLevelChange={props.onReadingLevelChange}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <h3 className="text-sm font-medium mb-2">Sort Articles</h3>
            <div className="space-y-1">
              <MobileSortOption 
                value="newest" 
                label="Newest First" 
                icon={<CalendarDays size={16} className="mr-2" />}
                sortBy={props.sortBy}
                onSortChange={props.onSortChange}
              />
              <MobileSortOption 
                value="oldest" 
                label="Oldest First" 
                icon={<CalendarDays size={16} className="mr-2" />}
                sortBy={props.sortBy}
                onSortChange={props.onSortChange}
              />
              <MobileSortOption 
                value="a-z" 
                label="A-Z" 
                icon={<SortAsc size={16} className="mr-2" />}
                sortBy={props.sortBy}
                onSortChange={props.onSortChange}
              />
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return <DesktopFilters {...props} />;
};

export default CategoryFilter;
