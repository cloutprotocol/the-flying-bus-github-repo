
import React, { ReactNode } from 'react';
import { Form } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';

interface ArticleFormLayoutProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable layout component for article forms
 * Encapsulates the common form structure
 */
const ArticleFormLayout: React.FC<ArticleFormLayoutProps> = ({
  form,
  onSubmit,
  children,
  className = 'space-y-6'
}) => {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </Form>
  );
};

export default ArticleFormLayout;
