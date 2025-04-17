
export const calculateReadTime = (content: string): number => {
  if (!content) return 3; // Default if no content
  
  // Average reading speed: 200 words per minute
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  
  // Minimum reading time of 1 minute
  return Math.max(1, readingTime);
};

