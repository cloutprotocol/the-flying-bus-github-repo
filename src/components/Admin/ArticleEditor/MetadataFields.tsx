
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { UseFormReturn } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MetadataFieldsProps {
  form: UseFormReturn<any>;
  articleType: string;
}

const MetadataFields: React.FC<MetadataFieldsProps> = ({ form, articleType }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publishing Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="publishDate"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Schedule Publication</FormLabel>
                <Switch 
                  checked={!!field.value}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      form.setValue('publishDate', null);
                    } else {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      form.setValue('publishDate', tomorrow.toISOString().split('T')[0]);
                    }
                  }}
                />
              </div>
              {field.value && (
                <FormControl>
                  <Input
                    type="date"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
              )}
              <FormDescription>
                Set a future date to schedule article publication
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="shouldHighlight"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Feature Article</FormLabel>
                <FormDescription>
                  Display this article as a featured article on the homepage
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        {articleType === 'debate' && (
          <FormField
            control={form.control}
            name="allowVoting"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Voting</FormLabel>
                  <FormDescription>
                    Allow readers to vote on this debate topic
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default MetadataFields;
