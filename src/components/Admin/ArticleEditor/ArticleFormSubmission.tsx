
import { UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useArticleDebug } from '@/hooks/useArticleDebug';

interface ArticleFormSubmissionProps {
  form: UseFormReturn<any>;
  content: string;
  handleSubmit: (data: any) => Promise<any>;
  draftId?: string;
  articleId?: string;
  categorySlug?: string;
}

export const useArticleFormSubmission = ({
  form,
  content,
  handleSubmit,
  draftId,
  articleId,
  categorySlug
}: ArticleFormSubmissionProps) => {
  
  const { toast } = useToast();
  const { addDebugStep } = useArticleDebug();

  // Form submission handler - data is already properly structured by ArticleForm
  const onSubmit = async (data: any) => {
    try {
      // Data comes pre-structured from ArticleForm, just add content and metadata
      const submissionData = {
        ...data,
        content,
        isDirty: form.formState.isDirty,
        id: draftId || articleId
      };
      
      addDebugStep('Form validation passed', {
        hasTitle: !!submissionData.title,
        hasCategoryId: !!submissionData.categoryId,
        articleType: submissionData.articleType,
        hasDebateSettings: !!submissionData.debateSettings,
        categorySlug
      });
      
      logger.debug(LogSource.EDITOR, 'Submitting article data (no additional processing)', {
        dataKeys: Object.keys(submissionData),
        articleType: submissionData.articleType,
        hasDebateSettings: !!submissionData.debateSettings,
        debateQuestion: submissionData.debateSettings?.question?.substring(0, 30) || 'N/A'
      });
      
      await handleSubmit(submissionData);
      
    } catch (error) {
      console.error("Form submission error:", error);
      logger.error(LogSource.EDITOR, 'Article submission failed', error);
      toast({
        title: 'Error',
        description: 'Failed to submit article for review. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Handle submit button click with optimized validation
  const handleSubmitButtonClick = async (): Promise<void> => {
    // Skip validation if form is invalid to reduce processing
    if (!form.formState.isValid) {
      return Promise.resolve();
    }
    
    return form.handleSubmit(onSubmit)();
  };

  return {
    onSubmit,
    handleSubmitButtonClick
  };
};
