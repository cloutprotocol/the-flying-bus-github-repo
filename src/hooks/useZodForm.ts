
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

// Extend the UseFormReturn type to include our custom handleSubmit function
interface ExtendedUseFormReturn<T> extends UseFormReturn<T> {
  handleFormSubmit: (onValid?: (data: T) => void) => (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export function useZodForm<T extends z.ZodType<any, any>>({
  schema,
  onSubmitSuccess,
  logContext = 'form',
  ...formProps
}: UseZodFormProps<T>): ExtendedUseFormReturn<z.infer<T>> {
  const { validateForm } = useValidation();
  
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    ...formProps
  });
  
  // Custom submit handler with additional validation
  const handleFormSubmit = (onValid?: (data: z.infer<T>) => void) => {
    return form.handleSubmit((data) => {
      // Double-check validation for extra security
      const result = validateForm(schema, data, { 
        context: logContext,
        showToast: true 
      });
      
      if (result.isValid && result.data) {
        logger.info(LogSource.CLIENT, `Form submitted successfully: ${logContext}`);
        
        // Call the callback provided in this specific submit instance
        if (onValid) {
          onValid(result.data);
        }
        // Call the general success callback if provided
        else if (onSubmitSuccess) {
          onSubmitSuccess(result.data);
        }
      }
    });
  };
  
  // Return the form with our custom handleFormSubmit function
  return {
    ...form,
    handleFormSubmit
  };
}
