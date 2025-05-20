
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useContentManagement } from '../useContentManagement';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import type { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import type { UseFormReturn } from 'react-hook-form';

export interface ArticleFormState {
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  saveStatus: DraftSaveStatus;
  setSaveStatus: (status: DraftSaveStatus) => void;
  lastSaved: Date | null;
  setLastSaved: (date: Date | null) => void;
  draftId: string | undefined;
  setDraftId: (id: string | undefined) => void;
  content: string;
  setContent: (content: string) => void;
  submissionCompletedRef: React.MutableRefObject<boolean>;
  isMountedRef: React.MutableRefObject<boolean>;
}

export function useArticleFormState(
  form: UseFormReturn<any>,
  articleId?: string,
  isNewArticle: boolean = true
): ArticleFormState {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(articleId);
  const { toast } = useToast();
  
  // Content management
  const { content, setContent } = useContentManagement(form, articleId, isNewArticle);
  
  // Track if component is mounted and submission state
  const isMountedRef = useRef(true);
  const submissionCompletedRef = useRef(false);
  
  // Log component initialization for performance tracking
  logger.info(LogSource.EDITOR, 'ArticleForm state initialized', {
    articleId,
    isNewArticle
  });
  
  return {
    isSubmitting,
    setIsSubmitting,
    isSaving,
    setIsSaving,
    saveStatus,
    setSaveStatus,
    lastSaved, 
    setLastSaved,
    draftId,
    setDraftId,
    content,
    setContent,
    submissionCompletedRef,
    isMountedRef
  };
}
