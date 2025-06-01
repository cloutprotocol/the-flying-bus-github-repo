
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '../../RichTextEditor';
import CategorySelector from '../../CategorySelector';
import MediaSelector from '../../MediaSelector';
import MetadataFields from '../../MetadataFields';

interface DebateFormContentProps {
  form: any;
  isSubmitting: boolean;
  isNewArticle?: boolean;
  resolvedCategoryData?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

const DebateFormContent: React.FC<DebateFormContentProps> = ({
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
            <FormLabel>Debate Title</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter debate title..." 
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
            <FormLabel>Featured Image</FormLabel>
            <FormControl>
              <MediaSelector
                value={field.value}
                onChange={field.onChange}
                placeholder="Select or upload featured image"
                accept="image/*"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="debateSettings.question"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Debate Question</FormLabel>
            <FormControl>
              <Input 
                placeholder="What is the main question for this debate?" 
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
        name="debateSettings.yesPosition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Yes Position</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Describe the 'Yes' side of the debate..."
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
        name="debateSettings.noPosition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>No Position</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Describe the 'No' side of the debate..."
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
            <FormLabel>Additional Context</FormLabel>
            <FormControl>
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                placeholder="Provide background information or context for the debate..."
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <MetadataFields form={form} articleType="debate" />
    </div>
  );
};

export default DebateFormContent;
