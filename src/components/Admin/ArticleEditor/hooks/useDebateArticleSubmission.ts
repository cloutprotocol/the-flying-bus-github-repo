
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DebateArticleFormData } from '@/utils/validation/separateFormSchemas';
import { UnifiedSubmissionService } from '@/services/articles/unifiedSubmissionService';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface UseDebateArticleSubmissionProps {
  form: UseFormReturn<DebateArticleFormData>;
  articleId?: string;
}

export const useDebateArticleSubmission = ({ form, articleId }: UseDebateArticleSubmissionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = React.useState(false);

  const convertToArticleFormData = (data: DebateArticleFormData): ArticleFormData => {
    return {
      id: articleId,
      title: data.title,
      content: data.content || '',
      excerpt: data.excerpt || '',
      imageUrl: data.imageUrl || '',
      categoryId: data.categoryId,
      slug: data.slug || '',
      articleType: 'debate',
      status: data.status,
      publishDate: data.publishDate,
      shouldHighlight: data.shouldHighlight,
      allowVoting: data.allowVoting,
      debateSettings: data.debateSettings
    };
  };

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
      
      logger.info(LogSource.ARTICLE, 'Saving debate article draft');
      
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

  const handleSubmit = async (data: DebateArticleFormData): Promise<void> => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    logger.info(LogSource.ARTICLE, 'Starting debate article submission');

    try {
      const formData = convertToArticleFormData(data);
      
      const result = await UnifiedSubmissionService.submitForReview(formData, user.id);
      
      if (result.success) {
        toast({
          title: "Submission successful",
          description: "Your debate article has been submitted for review!",
        });
        navigate('/admin/my-articles');
      } else {
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
    handleSubmit
  };
};
