
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

type ActivityFilterProps = {
  selectedTypes: string[];
  onFilterChange: (types: string[]) => void;
};

const activityTypes = [
  { value: 'article_created', label: 'Article Created' },
  { value: 'article_published', label: 'Article Published' },
  { value: 'comment_added', label: 'Comments' },
];

const ActivityFilters: React.FC<ActivityFilterProps> = ({ selectedTypes, onFilterChange }) => {
  const toggleFilter = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    onFilterChange(newTypes);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {activityTypes.map(({ value, label }) => (
        <Button
          key={value}
          variant={selectedTypes.includes(value) ? "secondary" : "outline"}
          onClick={() => toggleFilter(value)}
          className="flex items-center gap-2"
        >
          {selectedTypes.includes(value) && <Check className="h-4 w-4" />}
          {label}
        </Button>
      ))}
    </div>
  );
};

export default ActivityFilters;
