
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Flag, 
  AlertTriangle
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search comments or users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select
          value={filter}
          onValueChange={setFilter}
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
      
      <Tabs defaultValue={filter} onValueChange={setFilter}>
        <TabsList>
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
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default CommentModerationFilters;
