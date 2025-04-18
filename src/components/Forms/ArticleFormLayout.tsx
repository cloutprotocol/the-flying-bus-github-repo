
import React, { ReactNode } from 'react';
import { Form } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import ArticleDebugPanel from '@/components/Debug/ArticleDebugPanel';
import { ArticleDebugStep } from '@/hooks/useArticleDebug';

interface ArticleFormLayoutProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  debugSteps?: ArticleDebugStep[];
  children: ReactNode;
  className?: string;
}

/**
 * Reusable layout component for article forms
 * Encapsulates the common form structure and debug panel
 */
const ArticleFormLayout: React.FC<ArticleFormLayoutProps> = ({
  form,
  onSubmit,
  debugSteps = [],
  children,
  className = 'space-y-6'
}) => {
  return (
    <>
      {debugSteps.length > 0 && <ArticleDebugPanel steps={debugSteps} />}
      <Form {...form}>
        <form onSubmit={form.handleFormSubmit(onSubmit)} className={className}>
          {children}
        </form>
      </Form>
    </>
  );
};

export default ArticleFormLayout;
