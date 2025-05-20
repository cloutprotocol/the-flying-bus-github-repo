
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
  validateOnSubmit?: boolean;
}

interface ExtendedUseFormReturn<T> extends UseFormReturn<T> {
  handleFormSubmit: (onValid?: (data: T) => void) => (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export function useZodForm<T extends z.ZodType<any, any>>({
  schema,
  onSubmitSuccess,
  logContext = 'form',
  validateOnSubmit = true,
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
          // Only perform additional validation if specified
          if (validateOnSubmit) {
            const result = validateForm(schema, data, { 
              context: logContext,
              showToast: true 
            });
            
            if (!result.isValid) {
              logger.warn(LogSource.APP, `Form validation failed: ${logContext}`, result.errors);
              return;
            }
            
            if (result.data && onValid) {
              logger.info(LogSource.APP, `Form validated successfully: ${logContext}`);
              await onValid(result.data);
            } else if (result.data && onSubmitSuccess) {
              logger.info(LogSource.APP, `Form validated successfully: ${logContext}`);
              await onSubmitSuccess(result.data);
            }
          } else {
            // Skip additional validation and just call the handler
            if (onValid) {
              await onValid(data);
            } else if (onSubmitSuccess) {
              await onSubmitSuccess(data);
            }
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
