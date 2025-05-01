import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  MessageSquare, 
  Flag, 
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CommentModerationFiltersProps {
  filter: string;
  setFilter: (filter: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const CommentModerationFilters: React.FC<CommentModerationFiltersProps> = ({
  filter,
  setFilter,
  searchTerm,
  setSearchTerm
}) => {
  const [inputValue, setInputValue] = useState(searchTerm);
  
  // Keep the local input value in sync with the external searchTerm
  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchTerm(value);
  };
  
  // Handle filter change from either dropdown or tabs
  const handleFilterChange = (value: string) => {
    if (value !== filter) { // Only update if the value actually changed
      setFilter(value);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search comments or users..."
            value={inputValue}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
        
        <Select
          value={filter}
          onValueChange={handleFilterChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Comments</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="reported">User Reported</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Tabs value={filter} onValueChange={handleFilterChange}>
        <TabsList className="w-full sm:w-auto overflow-auto">
          <TabsTrigger value="flagged">
            <Flag className="h-4 w-4 mr-2" />
            Flagged
          </TabsTrigger>
          <TabsTrigger value="reported">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Reported
          </TabsTrigger>
          <TabsTrigger value="pending">
            <MessageSquare className="h-4 w-4 mr-2" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="approved">
            <Check className="h-4 w-4 mr-2" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <X className="h-4 w-4 mr-2" />
            Rejected
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default CommentModerationFilters;
