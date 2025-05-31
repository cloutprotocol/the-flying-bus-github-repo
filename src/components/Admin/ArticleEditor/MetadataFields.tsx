
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface MetadataFieldsProps {
  form: any; // Generic form type to work with all form types
}

const MetadataFields: React.FC<MetadataFieldsProps> = ({ form }) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium">Article Settings</h3>
      
      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>URL Slug (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="article-url-slug" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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
    </div>
  );
};

export default MetadataFields;
