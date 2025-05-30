
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useArticleDebug } from '@/hooks/useArticleDebug';

interface ArticleFormSubmissionProps {
  formData: ArticleFormData;
  submitForReview: () => Promise<boolean>;
  validateForm: () => string[];
  categorySlug?: string;
}

export const useArticleFormSubmission = ({
  formData,
  submitForReview,
  validateForm,
  categorySlug
}: ArticleFormSubmissionProps) => {
  
  const { toast } = useToast();
  const { addDebugStep } = useArticleDebug();

  // Handle submit button click with optimized validation
  const handleSubmitButtonClick = async (): Promise<void> => {
    try {
      // Validate first
      const errors = validateForm();
      if (errors.length > 0) {
        toast({
          title: "Validation failed",
          description: errors.join('. '),
          variant: "destructive"
        });
        return;
      }
      
      addDebugStep('Form validation passed', {
        hasTitle: !!formData.title,
        hasCategoryId: !!formData.categoryId,
        articleType: formData.articleType,
        hasDebateSettings: !!formData.debateSettings,
        categorySlug
      });
      
      logger.debug(LogSource.EDITOR, 'Submitting article data', {
        articleType: formData.articleType,
        hasDebateSettings: !!formData.debateSettings,
        debateQuestion: formData.debateSettings?.question?.substring(0, 30) || 'N/A'
      });
      
      await submitForReview();
      
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

  return {
    handleSubmitButtonClick
  };
};
