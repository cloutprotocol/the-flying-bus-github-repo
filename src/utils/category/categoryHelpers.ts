
export const getCategoryColorClass = (
  category: string | null, 
  categoryColor?: string
): string => {
  if (!category || !categoryColor) return '';
  return categoryColor.replace('bg-flyingbus-', '');
};
