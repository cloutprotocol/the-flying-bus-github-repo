
import { useContentManagement } from './useContentManagement';
import { useAutoSave } from './useAutoSave';
import { useDraftState } from './useDraftState';
import { useSubmissionState } from './useSubmissionState';
import type { UseFormReturn } from 'react-hook-form';

export const useOptimizedArticleForm = (
  form: UseFormReturn<any>,
  articleId?: string,
  articleType: string = 'standard',
  isNewArticle: boolean = true
) => {
  const { content, setContent } = useContentManagement(form, articleId, isNewArticle);
  
  const {
    draftId,
    isSaving,
    saveStatus,
    lastSaved,
    handleSaveDraft: saveDraft
  } = useDraftState(articleId);

  const { isSubmitting, handleSubmit } = useSubmissionState({
    content,
    draftId,
    onDraftIdChange: (newId) => saveDraft({ ...form.getValues(), content })
  });

  // Setup auto-save
  useAutoSave(
    () => saveDraft({ ...form.getValues(), content }),
    {
      isDirty: form.formState.isDirty || content !== '',
      isSubmitting,
      isSaving,
      draftId,
      articleType
    }
  );

  // Create a void-returning wrapper for saveDraft
  const handleSaveDraft = async (): Promise<void> => {
    await saveDraft({ ...form.getValues(), content });
  };

  return {
    content,
    setContent,
    draftId,
    saveStatus,
    lastSaved,
    isSubmitting,
    isSaving,
    handleSubmit,
    handleSaveDraft
  };
};
