
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import RichTextEditor from '../RichTextEditor';
import CategorySelector from '../CategorySelector';
import MetadataFields from '../MetadataFields';
import VideoFormSection from '../VideoFormSection';
import DebateFormSection from '../DebateFormSection';
import StoryboardFields from '../StoryboardFields';
import MediaSelector from '../MediaSelector/MediaSelector';
import { ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

interface ArticleFormContentProps {
  form: UseFormReturn<ArticleFormSchemaType>;
  isSubmitting?: boolean;
  preselectedCategoryName?: string;
}

const ArticleFormContent: React.FC<ArticleFormContentProps> = ({
  form,
  isSubmitting = false,
  preselectedCategoryName
}) => {
  const { watch } = form;
  const articleType = watch('articleType');
  const storyboardEpisodes = watch('storyboardEpisodes') || [];
  const categoryId = watch('categoryId');

  // Check if category is pre-selected (either by having a categoryId or preselectedCategoryName)
  const isCategoryPreselected = !!(categoryId || preselectedCategoryName);

  return (
    <div className="space-y-6">
      {/* Basic Article Information */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {articleType === 'storyboard' ? 'Series Title' : 'Title'} *
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={
                    articleType === 'storyboard' 
                      ? "Enter your storyboard series title" 
                      : "Enter your article title"
                  }
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
              <FormLabel>
                {articleType === 'storyboard' ? 'Series Summary' : 'Excerpt'}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={
                    articleType === 'storyboard'
                      ? "Brief summary of your storyboard series"
                      : "Brief summary or excerpt of your article"
                  }
                  rows={3}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label>
            {articleType === 'storyboard' ? 'Series Cover Image' : 'Cover Image'} *
          </Label>
          <MediaSelector form={form} />
        </div>

        {/* Category Selection - Show selector or pre-selected category info */}
        {isCategoryPreselected ? (
          <div className="space-y-2">
            <Label>Category</Label>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Category <strong>{preselectedCategoryName || 'Selected Category'}</strong> has been pre-selected.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <CategorySelector form={form} />
        )}
      </div>

      {/* Content Section - Different for each article type */}
      {articleType === 'storyboard' ? (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Series Description *</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Detailed description of your storyboard series..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <StoryboardFields
            episodes={storyboardEpisodes.map(episode => ({
              title: episode.title || '',
              description: episode.description || '',
              videoUrl: episode.videoUrl || '',
              thumbnailUrl: episode.thumbnailUrl || '',
              duration: episode.duration || '',
              number: episode.number || 1,
              content: episode.content || ''
            }))}
            onEpisodesChange={(episodes) => form.setValue('storyboardEpisodes', episodes)}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : articleType === 'video' ? (
        <div className="space-y-4">
          <VideoFormSection form={form} />
          
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content *</FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Write your article content here..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : articleType === 'debate' ? (
        <div className="space-y-4">
          <DebateFormSection form={form} />
          
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
                    placeholder="Provide additional context for the debate..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : (
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content *</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Write your article content here..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Metadata Fields */}
      <MetadataFields form={form} articleType={articleType} />
    </div>
  );
};

export default ArticleFormContent;
