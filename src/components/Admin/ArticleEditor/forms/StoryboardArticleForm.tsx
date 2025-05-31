
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { storyboardArticleSchema, StoryboardArticleFormData } from '@/utils/validation/separateFormSchemas';
import { useStoryboardArticleSubmission } from '../hooks/useStoryboardArticleSubmission';
import StoryboardFormContent from './sections/StoryboardFormContent';
import EnhancedFormActions from '../EnhancedFormActions';

interface StoryboardArticleFormProps {
  articleId?: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const StoryboardArticleForm: React.FC<StoryboardArticleFormProps> = ({
  articleId,
  isNewArticle,
  categorySlug,
  categoryName
}) => {
  const form = useForm<StoryboardArticleFormData>({
    resolver: zodResolver(storyboardArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: 'storyboard',
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
      storyboardEpisodes: [{
        title: 'Episode 1',
        description: '',
        videoUrl: '',
        thumbnailUrl: '',
        duration: '',
        number: 1,
        content: ''
      }]
    }
  });

  const { handleSubmit, watch, formState: { isDirty, isSubmitting } } = form;
  const { isSaving, handleSaveDraft, handleSubmit: onSubmit } = useStoryboardArticleSubmission({
    form,
    articleId
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <StoryboardFormContent 
          form={form}
          isSubmitting={isSubmitting}
          preselectedCategoryName={categoryName}
        />
        
        <EnhancedFormActions 
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit(onSubmit)}
          onViewRevisions={undefined}
          isSubmitting={isSubmitting}
          isDirty={isDirty}
          isSaving={isSaving}
          saveStatus={isDirty ? 'idle' : 'saved'}
          hasRevisions={false}
          form={form}
          content={watch('content')}
        />
      </form>
    </Form>
  );
};

export default StoryboardArticleForm;
