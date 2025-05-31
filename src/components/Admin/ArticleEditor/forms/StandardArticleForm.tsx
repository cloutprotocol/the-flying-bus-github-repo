
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { standardArticleSchema, StandardArticleFormData } from '@/utils/validation/separateFormSchemas';
import { useStandardArticleSubmission } from '../hooks/useStandardArticleSubmission';
import { useCategoryResolver } from '@/hooks/article/useCategoryResolver';
import StandardFormContent from './sections/StandardFormContent';
import SimpleFormActions from '../SimpleFormActions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface StandardArticleFormProps {
  articleId?: string;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

const StandardArticleForm: React.FC<StandardArticleFormProps> = ({
  articleId,
  isNewArticle,
  categorySlug,
  categoryName
}) => {
  // Pre-resolve category for new articles
  const { categoryData, isLoading: isCategoryLoading, error: categoryError } = useCategoryResolver(
    isNewArticle ? categorySlug : undefined,
    isNewArticle ? categoryName : undefined
  );

  const form = useForm<StandardArticleFormData>({
    resolver: zodResolver(standardArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: isNewArticle && categoryData ? categoryData.id : '',
      slug: '',
      articleType: 'standard',
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false
    }
  });

  // Update categoryId when category data is resolved
  React.useEffect(() => {
    if (isNewArticle && categoryData && !form.getValues('categoryId')) {
      form.setValue('categoryId', categoryData.id);
    }
  }, [categoryData, isNewArticle, form]);

  const { handleSubmit, formState: { isDirty, isSubmitting } } = form;
  const { isSaving, handleSaveDraft, handleSubmit: onSubmit } = useStandardArticleSubmission({
    form,
    articleId
  });

  // Show loading state while resolving category for new articles
  if (isNewArticle && isCategoryLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing article form...</p>
        </div>
      </div>
    );
  }

  // Show error if category resolution failed
  if (isNewArticle && categoryError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {categoryError}. Please try again or select a different category.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <StandardFormContent 
          form={form}
          isSubmitting={isSubmitting}
          isNewArticle={isNewArticle}
          resolvedCategoryData={isNewArticle ? categoryData : undefined}
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

export default StandardArticleForm;
