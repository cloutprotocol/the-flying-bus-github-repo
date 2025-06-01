import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArticleFormData, articleFormSchema } from '@/types/ArticleEditorTypes';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';
import { publishArticle } from '@/services/articles/publishArticle';
import { useToast } from '@/components/ui/use-toast';
import { useArticleDebug } from '@/hooks/useArticleDebug';
import type { DebugStep } from '@/types/DebugTypes';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useArticleForm = (articleId?: string) => {
  const { toast } = useToast();
  const { addDebugStep } = useArticleDebug();

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      categoryId: '',
      imageUrl: '',
      articleType: 'standard',
      status: 'draft',
      slug: ''
    },
    mode: 'onChange'
  });

  const createDebugStep = (message: string): DebugStep => ({
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    message,
    level: 'info',
    source: 'EDITOR'
  });

  const handleSaveDraft = useCallback(async () => {
    addDebugStep(createDebugStep('Saving draft...'));
    try {
      const data = form.getValues();
      addDebugStep(createDebugStep(`Form values: ${JSON.stringify(data)}`));

      const userId = 'demo-user'; // Replace with actual user ID
      const result = await saveDraftOptimized(userId, data);

      if (result.success) {
        toast({
          title: 'Draft saved',
          description: 'Your article draft has been saved successfully.',
        });
        addDebugStep(createDebugStep('Draft saved successfully.'));
      } else {
        toast({
          title: 'Error saving draft',
          description: result.error || 'Failed to save the draft.',
          variant: 'destructive',
        });
        addDebugStep(createDebugStep(`Error saving draft: ${result.error}`));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error saving draft',
        description: errorMsg,
        variant: 'destructive',
      });
      addDebugStep(createDebugStep(`Exception saving draft: ${errorMsg}`));
    }
  }, [form, toast, addDebugStep]);

  const handleSubmit = useCallback(async (data: any) => {
    addDebugStep(createDebugStep('Submitting article...'));
    try {
      addDebugStep(createDebugStep(`Form values: ${JSON.stringify(data)}`));

      const result = await publishArticle(data.id, data.status === 'published');

      if (result.success) {
        toast({
          title: 'Article submitted',
          description: 'Your article has been submitted successfully.',
        });
        addDebugStep(createDebugStep('Article submitted successfully.'));
      } else {
        toast({
          title: 'Error submitting article',
          description: result.error || 'Failed to submit the article.',
          variant: 'destructive',
        });
        addDebugStep(createDebugStep(`Error submitting article: ${result.error}`));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error submitting article',
        description: errorMsg,
        variant: 'destructive',
      });
      addDebugStep(createDebugStep(`Exception submitting article: ${errorMsg}`));
    }
  }, [toast, addDebugStep]);

  const handleAutoSave = useCallback(async () => {
    addDebugStep(createDebugStep('Auto-saving...'));
    try {
      const data = form.getValues();
       addDebugStep(createDebugStep(`Form values: ${JSON.stringify(data)}`));

      const userId = 'demo-user'; // Replace with actual user ID
      const result = await saveDraftOptimized(userId, data);

      if (result.success) {
        addDebugStep(createDebugStep('Auto-save successful.'));
        logger.info(LogSource.EDITOR, 'Article auto-saved', { articleId: data.id, title: data.title });
      } else {
        addDebugStep(createDebugStep(`Auto-save failed: ${result.error}`));
        logger.error(LogSource.EDITOR, 'Article auto-save failed', { articleId: data.id, title: data.title, error: result.error });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugStep(createDebugStep(`Exception during auto-save: ${errorMsg}`));
      logger.error(LogSource.EDITOR, 'Exception during article auto-save', { articleId: form.getValues().id, title: form.getValues().title, error });
    }
  }, [form, addDebugStep]);

  return {
    form,
    handleSaveDraft,
    handleSubmit,
    handleAutoSave,
  };
};
