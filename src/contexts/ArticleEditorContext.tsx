
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode
} from 'react';
import { ArticleFormData } from '@/types/ArticleEditorTypes';

interface ArticleEditorContextType {
  formData: ArticleFormData;
  setFormData: (data: ArticleFormData) => void;
  debugSteps: string[];
  addDebugStep: (step: string) => void;
  updateLastStep: (updates: any) => void;
  clearDebugSteps: () => void;
  submitArticle: (data: any) => Promise<void>;
}

const ArticleEditorContext = createContext<ArticleEditorContextType | undefined>(undefined);

interface ArticleEditorProviderProps {
  children: ReactNode;
}

export const useArticleEditor = () => {
  const context = useContext(ArticleEditorContext);
  if (!context) {
    throw new Error('useArticleEditor must be used within an ArticleEditorProvider');
  }
  return context;
};

const ArticleEditorProvider: React.FC<ArticleEditorProviderProps> = ({ children }) => {
  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    content: '',
    excerpt: '',
    imageUrl: '',
    categoryId: '',
    slug: '',
    articleType: 'standard',
    status: 'draft'
  });
  const [debugSteps, setDebugSteps] = useState<string[]>([]);

  const addDebugStep = useCallback((step: string) => {
    setDebugSteps(prev => [...prev, step]);
  }, []);

  const updateLastStep = useCallback((updates: any) => {
    setDebugSteps(prev => {
      if (prev.length === 0) return prev;
      const newSteps = [...prev];
      newSteps[prev.length - 1] = updates;
      return newSteps;
    });
  }, []);

  const clearDebugSteps = useCallback(() => {
    setDebugSteps([]);
  }, []);

  const submitArticle = useCallback(async (data: any) => {
    console.log('Submitting article:', data);
    
    addDebugStep('Article submitted successfully');
  }, [addDebugStep]);

  const value: ArticleEditorContextType = {
    formData,
    setFormData,
    debugSteps,
    addDebugStep,
    updateLastStep,
    clearDebugSteps,
    submitArticle
  };

  return (
    <ArticleEditorContext.Provider value={value}>
      {children}
    </ArticleEditorContext.Provider>
  );
};

export default ArticleEditorProvider;
