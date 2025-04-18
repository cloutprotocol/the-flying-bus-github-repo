
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import type { DraftSaveStatus } from '@/types/ArticleEditorTypes';
import { useArticleDebug } from '@/hooks/useArticleDebug';

interface ArticleEditorContextType {
  content: string;
  setContent: (content: string) => void;
  saveStatus: DraftSaveStatus;
  setSaveStatus: (status: DraftSaveStatus) => void;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  lastSaved: Date | null;
  setLastSaved: (date: Date | null) => void;
  handleSave: (formData: any, isDraft?: boolean) => Promise<{ success: boolean; articleId?: string }>;
  handleSubmit: (formData: any, isDraft?: boolean) => Promise<void>;
  draftId: string | undefined;
  setDraftId: (id: string | undefined) => void;
}

interface ArticleEditorProviderProps {
  children: ReactNode;
  initialContent?: string;
  articleId?: string;
  onSave?: (formData: any, isDraft: boolean) => Promise<{ success: boolean; articleId?: string }>;
  onSubmit?: (formData: any, isDraft: boolean) => Promise<boolean>;
}

const ArticleEditorContext = createContext<ArticleEditorContextType | undefined>(undefined);

export const ArticleEditorProvider: React.FC<ArticleEditorProviderProps> = ({
  children,
  initialContent = '',
  articleId,
  onSave,
  onSubmit
}) => {
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | undefined>(articleId);
  
  const { toast } = useToast();
  const { addDebugStep, updateLastStep } = useArticleDebug();
  
  const handleSave = useCallback(async (formData: any, isDraft = true) => {
    try {
      setSaveStatus('saving');
      
      addDebugStep('Saving article content', {
        draftId,
        isDraft,
        contentLength: content.length
      });
      
      if (onSave) {
        const result = await onSave({
          ...formData,
          content
        }, isDraft);
        
        if (result.success) {
          setSaveStatus('saved');
          setLastSaved(new Date());
          updateLastStep('success', { articleId: result.articleId });
          
          if (result.articleId && !draftId) {
            setDraftId(result.articleId);
          }
          
          return result;
        } else {
          setSaveStatus('error');
          updateLastStep('error', { error: 'Save failed' });
          
          toast({
            title: "Error",
            description: "Failed to save content",
            variant: "destructive"
          });
          
          return { success: false };
        }
      }
      
      // No onSave handler provided
      logger.warn(LogSource.EDITOR, 'No save handler provided');
      setSaveStatus('error');
      updateLastStep('error', { error: 'No save handler provided' });
      
      return { success: false };
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception during save', error);
      setSaveStatus('error');
      updateLastStep('error', { error });
      
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      
      return { success: false };
    }
  }, [content, draftId, onSave, toast, addDebugStep, updateLastStep]);
  
  const handleSubmit = useCallback(async (formData: any, isDraft = false) => {
    try {
      setIsSubmitting(true);
      
      addDebugStep('Submitting article', {
        draftId,
        isDraft
      });
      
      // First, save the content
      const saveResult = await handleSave(formData, isDraft);
      
      if (!saveResult.success) {
        updateLastStep('error', { error: 'Failed to save before submission' });
        return;
      }
      
      if (onSubmit && saveResult.articleId) {
        const result = await onSubmit(formData, isDraft);
        
        if (result) {
          updateLastStep('success', { status: isDraft ? 'Draft saved' : 'Submitted for review' });
          
          toast({
            title: isDraft ? "Draft Saved" : "Submitted",
            description: isDraft 
              ? "Your draft has been saved successfully" 
              : "Your article has been submitted for review"
          });
        } else {
          updateLastStep('error', { error: 'Submission failed' });
          
          toast({
            title: "Error",
            description: "Failed to submit article",
            variant: "destructive"
          });
        }
      } else if (!saveResult.articleId) {
        updateLastStep('error', { error: 'No article ID available for submission' });
        
        toast({
          title: "Error",
          description: "Could not identify article for submission",
          variant: "destructive"
        });
      } else if (!onSubmit) {
        logger.warn(LogSource.EDITOR, 'No submit handler provided');
        updateLastStep('error', { error: 'No submit handler provided' });
      }
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Exception during submission', error);
      updateLastStep('error', { error });
      
      toast({
        title: "Error",
        description: "An unexpected error occurred during submission",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [draftId, handleSave, onSubmit, toast, addDebugStep, updateLastStep]);
  
  const value = {
    content,
    setContent,
    saveStatus,
    setSaveStatus,
    isSubmitting,
    setIsSubmitting,
    lastSaved,
    setLastSaved,
    handleSave,
    handleSubmit,
    draftId,
    setDraftId
  };
  
  return (
    <ArticleEditorContext.Provider value={value}>
      {children}
    </ArticleEditorContext.Provider>
  );
};

export const useArticleEditor = () => {
  const context = useContext(ArticleEditorContext);
  
  if (context === undefined) {
    throw new Error('useArticleEditor must be used within an ArticleEditorProvider');
  }
  
  return context;
};
