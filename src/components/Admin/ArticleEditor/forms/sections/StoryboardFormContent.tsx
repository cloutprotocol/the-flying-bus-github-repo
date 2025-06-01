
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CategorySelector from '../../CategorySelector';
import MediaSelector from '../../MediaSelector';
import MetadataFields from '../../MetadataFields';
import StoryboardFields from '../../StoryboardFields';

interface StoryboardFormContentProps {
  form: any;
  isSubmitting: boolean;
  isNewArticle?: boolean;
  resolvedCategoryData?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

const StoryboardFormContent: React.FC<StoryboardFormContentProps> = ({
  form,
  isSubmitting,
  isNewArticle = false,
  resolvedCategoryData
}) => {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Series Title</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter series title..." 
                {...field} 
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <CategorySelector 
        form={form}
        isNewArticle={isNewArticle}
        resolvedCategoryData={resolvedCategoryData}
      />

      <FormField
        control={form.control}
        name="imageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Series Cover Image</FormLabel>
            <FormControl>
              <MediaSelector
                value={field.value}
                onChange={field.onChange}
                placeholder="Select or upload series cover image"
                accept="image/*"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="excerpt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Series Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Brief description of the storyboard series..."
                className="resize-none"
                rows={3}
                {...field}
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <StoryboardFields form={form} disabled={isSubmitting} />

      <MetadataFields form={form} articleType="storyboard" />
    </div>
  );
};

export default StoryboardFormContent;
