
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { submitArticleOptimized, ArticleSubmissionResult } from '@/services/articles/articleSubmissionService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useArticleSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const submitArticle = async (formData: ArticleFormData): Promise<ArticleSubmissionResult> => {
    if (!user?.id) {
      throw new Error('User authentication required');
    }

    setIsSubmitting(true);

    try {
      logger.info(LogSource.ARTICLE, 'Submitting article', {
        articleType: formData.articleType,
        title: formData.title
      });

      const result = await submitArticleOptimized(user.id, formData, false);

      if (result.success) {
        toast({
          title: "Article submitted",
          description: "Your article has been submitted for review!",
        });

        // Navigate based on article type
        if (formData.articleType === 'storyboard' && result.articleId) {
          navigate(`/storyboard/${result.articleId}`);
        } else {
          navigate('/admin/my-articles');
        }
      } else {
        throw new Error(result.error || 'Submission failed');
      }

      return result;

    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Error submitting article', error);
      
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit article. Please try again.",
        variant: "destructive"
      });

      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitArticle,
    isSubmitting
  };
};
