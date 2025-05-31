
/**
 * Generate a client-side slug to avoid database queries
 * Uses timestamp suffix and random component to ensure uniqueness
 */
export const generateClientSideSlug = (title: string): string => {
  if (!title || typeof title !== 'string') {
    return `draft-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
  
  // Create base slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Remove consecutive hyphens
    .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
    .trim();
    
  // Add timestamp and random component to ensure uniqueness
  const timestamp = Date.now().toString();
  const randomSuffix = Math.random().toString(36).substr(2, 5);
  
  return `${baseSlug}-${timestamp.slice(-8)}-${randomSuffix}`;
};

/**
 * Generate slug specifically for form submission
 * Always creates a fresh slug to avoid duplicates
 */
export const generateSubmissionSlug = (title: string): string => {
  return generateClientSideSlug(title);
};
