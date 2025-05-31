
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { StoryboardArticleFormData } from '@/utils/validation/separateFormSchemas';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CategorySelector from '../../CategorySelector';
import RichTextEditor from '../../RichTextEditor';
import MediaSelector from '../../MediaSelector';
import MetadataFields from '../../MetadataFields';
import StoryboardFields from '../../StoryboardFields';

interface StoryboardFormContentProps {
  form: UseFormReturn<StoryboardArticleFormData>;
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
              <Input placeholder="Enter storyboard series title" {...field} disabled={isSubmitting} />
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

      <MediaSelector form={form} />

      <FormField
        control={form.control}
        name="excerpt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Series Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Brief description of the series..."
                {...field}
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Series Overview</FormLabel>
            <FormControl>
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <StoryboardFields form={form} />

      <MetadataFields form={form} />
    </div>
  );
};

export default StoryboardFormContent;
