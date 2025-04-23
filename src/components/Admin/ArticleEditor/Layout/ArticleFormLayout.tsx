
import React from 'react';
import ArticleDebugPanel from '@/components/Debug/ArticleDebugPanel';
import { ArticleDebugStep } from '@/hooks/useArticleDebug';

interface ArticleFormLayoutProps {
  debugSteps: ArticleDebugStep[];
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

const ArticleFormLayout: React.FC<ArticleFormLayoutProps> = ({
  debugSteps,
  children,
  onSubmit
}) => {
  return (
    <>
      <ArticleDebugPanel steps={debugSteps} />
      <form onSubmit={onSubmit} className="space-y-6">
        {children}
      </form>
    </>
  );
};

export default ArticleFormLayout;
