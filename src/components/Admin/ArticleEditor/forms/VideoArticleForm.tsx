
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { videoArticleSchema, VideoArticleFormData } from '@/utils/validation/separateFormSchemas';
import { useVideoArticleSubmission } from '../hooks/useVideoArticleSubmission';
import VideoFormContent from './sections/VideoFormContent';
import SimpleFormActions from '../SimpleFormActions';

interface VideoArticleFormProps {
  articleId?: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const VideoArticleForm: React.FC<VideoArticleFormProps> = ({
  articleId,
  isNewArticle,
  categorySlug,
  categoryName
}) => {
  const form = useForm<VideoArticleFormData>({
    resolver: zodResolver(videoArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: 'video',
      videoUrl: '',
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false
    }
  });

  const { handleSubmit, formState: { isDirty, isSubmitting } } = form;
  const { isSaving, handleSaveDraft, handleSubmit: onSubmit } = useVideoArticleSubmission({
    form,
    articleId
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <VideoFormContent 
          form={form}
          isSubmitting={isSubmitting}
          preselectedCategoryName={categoryName}
        />
        
        <SimpleFormActions 
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={isSubmitting}
          isDirty={isDirty}
          isSaving={isSaving}
        />
      </form>
    </Form>
  );
};

export default VideoArticleForm;
