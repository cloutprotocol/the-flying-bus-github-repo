
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';

interface MetadataFieldsProps {
  form: any; // Generic form type to work with all form types
}

const MetadataFields: React.FC<MetadataFieldsProps> = ({ form }) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium">Article Settings</h3>
      
      <div className="flex items-center justify-between">
        <FormField
          control={form.control}
          name="shouldHighlight"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Feature this article</FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allowVoting"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Allow voting</FormLabel>
            </FormItem>
          )}
        />
      </div>
      
      <p className="text-sm text-muted-foreground">
        Article URL will be automatically generated from the title
      </p>
    </div>
  );
};

export default MetadataFields;
