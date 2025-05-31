
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { VideoArticleFormData } from '@/utils/validation/separateFormSchemas';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CategorySelector from '../../CategorySelector';
import RichTextEditor from '../../RichTextEditor';
import MediaSelector from '../../MediaSelector';
import MetadataFields from '../../MetadataFields';

interface VideoFormContentProps {
  form: UseFormReturn<VideoArticleFormData>;
  isSubmitting: boolean;
  preselectedCategoryName?: string;
}

const VideoFormContent: React.FC<VideoFormContentProps> = ({
  form,
  isSubmitting,
  preselectedCategoryName
}) => {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input placeholder="Enter video article title" {...field} disabled={isSubmitting} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <CategorySelector 
        form={form} 
        preselectedName={preselectedCategoryName}
      />

      <MediaSelector form={form} />

      <FormField
        control={form.control}
        name="videoUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Video URL</FormLabel>
            <FormControl>
              <Input 
                placeholder="https://youtube.com/watch?v=..."
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
        name="excerpt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Excerpt (Optional)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Brief description of the video..."
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
            <FormLabel>Content</FormLabel>
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

      <MetadataFields form={form} />
    </div>
  );
};

export default VideoFormContent;
