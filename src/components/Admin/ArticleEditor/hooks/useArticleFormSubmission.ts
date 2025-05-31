
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { ArticleFormSchemaType, articleFormSchema } from '@/utils/validation/articleFormSchema';
import { UnifiedSubmissionService } from '@/services/articles/unifiedSubmissionService';
import { mapFormDataToDatabase } from '@/utils/article/articleDataMapper';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface UseArticleFormSubmissionProps {
  form: UseFormReturn<ArticleFormSchemaType>;
  articleId?: string;
}

export const useArticleFormSubmission = ({ form, articleId }: UseArticleFormSubmissionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = React.useState(false);

  // Validate form data using Zod schema before conversion
  const validateFormData = (data: ArticleFormSchemaType): boolean => {
    try {
      logger.debug(LogSource.ARTICLE, 'Validating form data before submission', {
        hasTitle: !!data.title,
        hasContent: !!data.content,
        articleType: data.articleType
      });
      
      const result = articleFormSchema.safeParse(data);
      
      if (!result.success) {
        logger.error(LogSource.ARTICLE, 'Form validation failed', { 
          errors: result.error.format() 
        });
        toast({
          title: "Validation Error",
          description: "Please check all required fields are filled correctly.",
          variant: "destructive"
        });
        return false;
      }
      
      logger.debug(LogSource.ARTICLE, 'Form validation passed');
      return true;
    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Exception during validation', error);
      toast({
        title: "Validation Error", 
        description: "There was an error validating your form data.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Convert form data to clean database format using the new mapper
  const convertToArticleFormData = (data: ArticleFormSchemaType): ArticleFormData => {
    logger.debug(LogSource.ARTICLE, 'Converting form data', {
      articleType: data.articleType,
      hasId: !!articleId
    });
    
    return {
      id: articleId,
      title: data.title?.trim() || '',
      content: data.content?.trim() || '',
      excerpt: data.excerpt?.trim() || '',
      imageUrl: data.imageUrl?.trim() || '',
      categoryId: data.categoryId?.trim() || '',
      slug: data.slug?.trim() || '',
      articleType: data.articleType,
      status: data.status,
      publishDate: data.publishDate,
      shouldHighlight: data.shouldHighlight,
      allowVoting: data.allowVoting,
      videoUrl: data.videoUrl?.trim() || '',
      debateSettings: data.debateSettings,
      storyboardEpisodes: data.storyboardEpisodes
    };
  };

  // Save draft function using unified service
  const handleSaveDraft = async (): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to save drafts.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const formData = form.getValues();
      const convertedData = convertToArticleFormData(formData);
      
      logger.info(LogSource.ARTICLE, 'Saving draft with unified service', {
        articleType: convertedData.articleType
      });
      
      const result = await UnifiedSubmissionService.saveDraft(convertedData, user.id);
      
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
        });
      } else {
        throw new Error(result.error || 'Failed to save draft');
      }
    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Save draft error', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Submit function using unified service
  const handleSubmit = async (data: ArticleFormSchemaType): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    logger.info(LogSource.ARTICLE, 'Starting article submission with unified service', {
      articleType: data.articleType,
      hasId: !!articleId
    });

    try {
      // Validate using Zod schema before submission
      if (!validateFormData(data)) {
        return;
      }
      
      const formData = convertToArticleFormData(data);
      
      const result = await UnifiedSubmissionService.submitForReview(formData, user.id);
      
      if (result.success) {
        toast({
          title: "Submission successful",
          description: "Your article has been submitted for review!",
        });
        navigate('/admin/my-articles');
      } else {
        logger.error(LogSource.ARTICLE, 'Submission failed with result', { error: result.error });
        throw new Error(result.error || 'Failed to submit article');
      }
    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Submit error', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit article. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    isSaving,
    handleSaveDraft,
    handleSubmit,
    convertToArticleFormData
  };
};
