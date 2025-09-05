/**
 * YouTube URL utilities for converting various YouTube URL formats to embed URLs
 */

/**
 * Converts various YouTube URL formats to embed URL
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - URLs with additional parameters (playlist, time, etc.)
 */
export const convertToYouTubeEmbed = (url: string): string => {
  if (!url) return url;
  
  // If it's already an embed URL, return as is
  if (url.includes('/embed/')) {
    return url;
  }
  
  // Extract video ID from various YouTube URL formats
  const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  
  if (!videoIdMatch || !videoIdMatch[1]) {
    // If we can't extract video ID, return original URL
    return url;
  }
  
  const videoId = videoIdMatch[1];
  
  // Create embed URL
  return `https://www.youtube.com/embed/${videoId}`;
};

/**
 * Checks if a URL is a YouTube URL
 */
export const isYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  
  return /(?:youtube\.com|youtu\.be)/.test(url);
};

/**
 * Extracts video ID from YouTube URL
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};