
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

  // Helper function to structure debate data properly
  const prepareArticleData = (data: any) => {
    const preparedData = {
      ...data,
      content,
      isDirty: form.formState.isDirty,
      id: draftId || articleId
    };

    // If this is a debate article, structure the debate fields properly
    if (data.articleType === 'debate') {
      // Extract debate fields and structure them in debateSettings
      const { question, yesPosition, noPosition, votingEnabled, votingEndsAt, ...otherData } = preparedData;
      
      preparedData.debateSettings = {
        question: question || '',
        yesPosition: yesPosition || '',
        noPosition: noPosition || '',
        votingEnabled: votingEnabled !== undefined ? votingEnabled : true,
        votingEndsAt: votingEndsAt || null
      };
      
      // Remove the individual debate fields from the root level to avoid duplication
      delete preparedData.question;
      delete preparedData.yesPosition;
      delete preparedData.noPosition;
      delete preparedData.votingEnabled;
      delete preparedData.votingEndsAt;
      
      logger.debug(LogSource.EDITOR, 'Structured debate data for submission', {
        hasDebateSettings: !!preparedData.debateSettings,
        debateQuestion: preparedData.debateSettings?.question?.substring(0, 30)
      });
    }

    return preparedData;
  };

  // Form submission handler with proper data structuring
  const onSubmit = async (data: any) => {
    try {
      // Structure the data properly before submission
      const structuredData = prepareArticleData(data);
      
      addDebugStep('Form validation passed', {
        hasTitle: !!structuredData.title,
        hasCategoryId: !!structuredData.categoryId,
        articleType: structuredData.articleType,
        hasDebateSettings: !!structuredData.debateSettings,
        categorySlug
      });
      
      logger.debug(LogSource.EDITOR, 'Submitting structured article data', {
        dataKeys: Object.keys(structuredData),
        articleType: structuredData.articleType,
        hasDebateSettings: !!structuredData.debateSettings
      });
      
      await handleSubmit(structuredData);
      
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
