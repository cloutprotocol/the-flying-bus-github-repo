
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
    handleSaveDraft,
    saveDraftVoid
  } = useDraftState(articleId);

  const { isSubmitting, handleSubmit } = useSubmissionState({
    content,
    draftId,
    onDraftIdChange: (newId) => handleSaveDraft({ ...form.getValues(), content })
  });

  // Setup auto-save with handleSaveDraft since we need the articleId internally
  useAutoSave(
    () => handleSaveDraft({ ...form.getValues(), content }),
    {
      isDirty: form.formState.isDirty || content !== '',
      isSubmitting,
      isSaving,
      draftId,
      articleType
    }
  );

  return {
    content,
    setContent,
    draftId,
    saveStatus,
    lastSaved,
    isSubmitting,
    isSaving,
    handleSubmit,
    // Use saveDraftVoid for external interface
    handleSaveDraft: () => saveDraftVoid({ ...form.getValues(), content })
  };
};
