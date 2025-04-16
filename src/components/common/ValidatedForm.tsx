
import React from 'react';
import { useForm, FormProvider, UseFormProps, UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/components/ui/use-toast';

interface ValidatedFormProps<TFormValues extends FieldValues> {
  children: React.ReactNode | ((methods: UseFormReturn<TFormValues>) => React.ReactNode);
  schema: z.ZodType<TFormValues>;
  onSubmit: (data: TFormValues) => void;
  defaultValues?: UseFormProps<TFormValues>['defaultValues'];
  className?: string;
  id?: string;
  showToast?: boolean;
}

const ValidatedForm = <TFormValues extends FieldValues>({
  children,
  schema,
  onSubmit,
  defaultValues,
  className,
  id,
  showToast = true,
}: ValidatedFormProps<TFormValues>) => {
  const { toast } = useToast();
  
  const methods = useForm<TFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  
  const handleSubmit = methods.handleSubmit((data) => {
    try {
      onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      if (showToast) {
        toast({
          title: 'Error',
          description: 'An error occurred while submitting the form.',
          variant: 'destructive',
        });
      }
    }
  });
  
  return (
    <FormProvider {...methods}>
      <form id={id} className={className} onSubmit={handleSubmit}>
        {typeof children === 'function' ? children(methods) : children}
      </form>
    </FormProvider>
  );
};

export default ValidatedForm;
