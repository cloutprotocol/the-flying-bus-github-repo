
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { debateArticleSchema, DebateArticleFormData } from '@/utils/validation/separateFormSchemas';
import { useDebateArticleSubmission } from '../hooks/useDebateArticleSubmission';
import DebateFormContent from './sections/DebateFormContent';
import SimpleFormActions from '../SimpleFormActions';

interface DebateArticleFormProps {
  articleId?: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const DebateArticleForm: React.FC<DebateArticleFormProps> = ({
  articleId,
  isNewArticle,
  categorySlug,
  categoryName
}) => {
  const form = useForm<DebateArticleFormData>({
    resolver: zodResolver(debateArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: 'debate',
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
      debateSettings: {
        question: '',
        yesPosition: '',
        noPosition: '',
        votingEnabled: true,
        voting_ends_at: null
      }
    }
  });

  const { handleSubmit, formState: { isDirty, isSubmitting } } = form;
  const { isSaving, handleSaveDraft, handleSubmit: onSubmit } = useDebateArticleSubmission({
    form,
    articleId
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <DebateFormContent 
          form={form}
          isSubmitting={isSubmitting}
          isNewArticle={isNewArticle}
          preselectedCategorySlug={categorySlug}
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

export default DebateArticleForm;
