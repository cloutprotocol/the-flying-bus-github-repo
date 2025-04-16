
import { useForm, UseFormProps, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useValidation } from '@/providers/ValidationProvider';
import logger, { LogSource } from '@/utils/logger';

interface UseZodFormProps<T extends z.ZodType<any, any>> extends Omit<UseFormProps<z.infer<T>>, 'resolver'> {
  schema: T;
  onSubmitSuccess?: (data: z.infer<T>) => void;
  logContext?: string;
}

export function useZodForm<T extends z.ZodType<any, any>>({
  schema,
  onSubmitSuccess,
  logContext = 'form',
  ...formProps
}: UseZodFormProps<T>): UseFormReturn<z.infer<T>> {
  const { validateForm } = useValidation();
  
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    ...formProps
  });
  
  // Custom submit handler with additional validation
  const onSubmit = form.handleSubmit((data) => {
    // Double-check validation for extra security
    const result = validateForm(schema, data, { 
      context: logContext,
      showToast: true 
    });
    
    if (result.isValid && result.data && onSubmitSuccess) {
      logger.info(LogSource.CLIENT, `Form submitted successfully: ${logContext}`);
      onSubmitSuccess(result.data);
    }
  });
  
  return {
    ...form,
    onSubmit
  };
}
