
import { useForm, UseFormProps, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useValidation } from '@/providers/ValidationProvider';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface UseZodFormProps<T extends z.ZodType<any, any>> extends Omit<UseFormProps<z.infer<T>>, 'resolver'> {
  schema: T;
  onSubmitSuccess?: (data: z.infer<T>) => void;
  logContext?: string;
}

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
  
  const handleFormSubmit = (onValid?: (data: z.infer<T>) => void) => {
    return async (e?: React.BaseSyntheticEvent) => {
      if (e) {
        e.preventDefault();
      }
      
      logger.info(LogSource.APP, `Form submission started: ${logContext}`);
      
      return form.handleSubmit(async (data) => {
        try {
          const result = validateForm(schema, data, { 
            context: logContext,
            showToast: true 
          });
          
          if (result.isValid && result.data) {
            logger.info(LogSource.APP, `Form validated successfully: ${logContext}`);
            
            if (onValid) {
              await onValid(result.data);
            } else if (onSubmitSuccess) {
              await onSubmitSuccess(result.data);
            }
          } else {
            logger.warn(LogSource.APP, `Form validation failed: ${logContext}`, result.errors);
          }
        } catch (error) {
          logger.error(LogSource.APP, `Form submission error: ${logContext}`, error);
          throw error; // Re-throw to let the form component handle the error
        }
      })(e);
    };
  };
  
  return {
    ...form,
    handleFormSubmit
  };
}
