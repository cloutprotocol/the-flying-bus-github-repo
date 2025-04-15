
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Grid2X2, List } from 'lucide-react';

interface MediaToolbarProps {
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
}

const MediaToolbar: React.FC<MediaToolbarProps> = ({
  viewMode,
  setViewMode,
  filterOpen,
  setFilterOpen
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setFilterOpen(!filterOpen)}
      >
        <Filter className="h-4 w-4" />
      </Button>
      
      <div className="relative w-[200px] sm:w-[300px]">
        <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search media..."
          className="pl-8"
        />
      </div>
      
      <div className="flex border rounded-md">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-10 rounded-r-none"
          onClick={() => setViewMode('grid')}
        >
          <Grid2X2 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-10 rounded-l-none"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MediaToolbar;
