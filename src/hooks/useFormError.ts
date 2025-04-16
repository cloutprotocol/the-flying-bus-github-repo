
import { useFormContext, FieldValues, FieldPath } from 'react-hook-form';

export function useFormError<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(name: TName) {
  const {
    formState: { errors },
  } = useFormContext<TFieldValues>();
  
  const error = errors[name];
  const message = error ? (error.message as string) : undefined;
  const hasError = !!error;
  
  return {
    hasError,
    message,
    error,
  };
}
