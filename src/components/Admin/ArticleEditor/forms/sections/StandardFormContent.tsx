
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '../../RichTextEditor';
import CategorySelector from '../../CategorySelector';
import MediaSelector from '../../MediaSelector';
import MetadataFields from '../../MetadataFields';

interface StandardFormContentProps {
  form: any;
  isSubmitting: boolean;
  isNewArticle?: boolean;
  resolvedCategoryData?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

const StandardFormContent: React.FC<StandardFormContentProps> = ({
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
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter article title..." 
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

      <div>
        <FormLabel>Featured Image</FormLabel>
        <MediaSelector form={form} />
      </div>

      <FormField
        control={form.control}
        name="excerpt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Excerpt</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Brief description of the article..."
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
                placeholder="Write your article content here..."
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <MetadataFields form={form} articleType="standard" />
    </div>
  );
};

export default StandardFormContent;
