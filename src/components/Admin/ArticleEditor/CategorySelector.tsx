
import React from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getCategoryIcon } from '@/utils/getCategoryIcon';
import { UseFormReturn } from 'react-hook-form';

interface CategorySelectorProps {
  form: UseFormReturn<any>;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ form }) => {
  const categories = [
    { id: 'headliners', name: 'Headliners' },
    { id: 'debates', name: 'Debates' },
    { id: 'spice-it-up', name: 'Spice It Up' },
    { id: 'in-the-neighborhood', name: 'In the Neighborhood' },
    { id: 'learning', name: 'Learning' },
    { id: 'school-news', name: 'School News' },
    { id: 'storyboard', name: 'Storyboard' },
  ];

  return (
    <FormField
      control={form.control}
      name="categoryId" // Changed from 'category' to 'categoryId'
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>Category</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value}
              className="grid grid-cols-1 gap-2"
            >
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={category.id} id={category.id} />
                  <label
                    htmlFor={category.id}
                    className="flex items-center cursor-pointer text-sm"
                  >
                    <span className="mr-2">{getCategoryIcon(category.name)}</span>
                    {category.name}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CategorySelector;
