
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { StandardArticleFormData } from '@/utils/validation/separateFormSchemas';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

interface UseStandardArticleSubmissionProps {
  form: UseFormReturn<StandardArticleFormData>;
  articleId?: string;
}

export const useStandardArticleSubmission = ({ form, articleId }: UseStandardArticleSubmissionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = React.useState(false);

  const submitMutation = useMutation(api.articles.submit);

  const generateSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'untitled';
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!user) {
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
      const slug = formData.slug || generateSlug(formData.title || '');

      const resultId = await submitMutation({
        id: articleId as Id<"articles"> | undefined,
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        imageUrl: formData.imageUrl,
        categoryId: formData.categoryId,
        articleType: 'standard',
        slug: slug,
        shouldHighlight: formData.shouldHighlight,
        status: 'draft',
        publishImmediately: false,
      });

      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully.",
      });

      // Update form with the returned article ID if this was a new article
      if (resultId && !articleId) {
        form.setValue('id' as any, resultId);
      }
    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Save draft error', error);
      console.error('Draft save error:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (data: StandardArticleFormData): Promise<void> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to submit articles.",
        variant: "destructive"
      });
      return;
    }

    try {
      const slug = data.slug || generateSlug(data.title || '');

      await submitMutation({
        id: articleId as Id<"articles"> | undefined,
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        imageUrl: data.imageUrl,
        categoryId: data.categoryId,
        articleType: 'standard',
        slug: slug,
        shouldHighlight: data.shouldHighlight,
        status: 'pending_review',
        publishImmediately: false,
      });

      toast({
        title: "Submission successful",
        description: "Your article has been submitted for review!",
      });
      navigate('/admin/my-articles');
    } catch (error) {
      logger.error(LogSource.ARTICLE, 'Submit error', error);
      console.error('Submission error:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit article. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    isSaving,
    handleSaveDraft,
    handleSubmit
  };
};
