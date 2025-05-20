
/**
 * Generate a client-side slug to avoid database queries
 * Uses timestamp suffix to ensure uniqueness
 */
export const generateClientSideSlug = (title: string): string => {
  if (!title || typeof title !== 'string') {
    return `draft-${Date.now()}`;
  }
  
  // Create base slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Remove consecutive hyphens
    .trim();
    
  // Add timestamp to ensure uniqueness without needing additional DB queries
  return `${baseSlug}-${Date.now().toString().slice(-8)}`;
};
