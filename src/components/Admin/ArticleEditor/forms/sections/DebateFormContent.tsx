
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DebateArticleFormData } from '@/utils/validation/separateFormSchemas';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CategorySelector from '../../CategorySelector';
import RichTextEditor from '../../RichTextEditor';
import MediaSelector from '../../MediaSelector';
import MetadataFields from '../../MetadataFields';

interface DebateFormContentProps {
  form: UseFormReturn<DebateArticleFormData>;
  isSubmitting: boolean;
  preselectedCategoryName?: string;
}

const DebateFormContent: React.FC<DebateFormContentProps> = ({
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
              <Input placeholder="Enter debate article title" {...field} disabled={isSubmitting} />
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
        name="debateSettings.question"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Debate Question</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="What question should readers debate about?"
                {...field}
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="debateSettings.yesPosition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Yes Position</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Argument for the yes side..."
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
                  placeholder="Argument for the no side..."
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="excerpt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Excerpt (Optional)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Brief description of the debate..."
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
            <FormLabel>Additional Content (Optional)</FormLabel>
            <FormControl>
              <RichTextEditor
                value={field.value || ''}
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

export default DebateFormContent;
