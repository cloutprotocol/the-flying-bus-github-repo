import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode
} from 'react';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { DebugStep } from '@/types/DebugTypes';

interface ArticleEditorContextType {
  formData: ArticleFormData;
  setFormData: (data: ArticleFormData) => void;
  debugSteps: DebugStep[];
  addDebugStep: (step: string) => void;
  updateLastStep: (updates: Partial<DebugStep>) => void;
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
    id: '',
    title: '',
    content: '',
    excerpt: '',
    imageUrl: '',
    categoryId: '',
    categoryName: '',
    slug: '',
    articleType: 'standard',
    status: 'draft'
  });
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);

  const addDebugStep = useCallback((step: string) => {
    const debugStep: DebugStep = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message: step,
      level: 'info',
      source: 'EDITOR'
    };
    setDebugSteps(prev => [...prev, debugStep]);
  }, []);

  const updateLastStep = useCallback((updates: Partial<DebugStep>) => {
    setDebugSteps(prev => {
      if (prev.length === 0) return prev;
      const lastStep = prev[prev.length - 1];
      const updatedStep = { ...lastStep, ...updates };
      const newSteps = [...prev];
      newSteps[prev.length - 1] = updatedStep;
      return newSteps;
    });
  }, []);

  const clearDebugSteps = useCallback(() => {
    setDebugSteps([]);
  }, []);

  const submitArticle = useCallback(async (data: any) => {
    console.log('Submitting article:', data);
    
    addDebugStep('Article submitted successfully');
  }, []);

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
