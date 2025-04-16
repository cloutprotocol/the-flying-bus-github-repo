
import { getCategoryColor as originalGetCategoryColor } from '@/utils/categoryColors';

// A wrapper around the original getCategoryColor function
export const getCategoryColor = (category: string | null): string => {
  if (!category) return '';
  return originalGetCategoryColor(category);
};
