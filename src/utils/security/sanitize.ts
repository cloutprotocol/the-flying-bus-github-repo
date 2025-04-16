
/**
 * Content Sanitization Utilities
 * Functions for sanitizing user-generated content
 */

import DOMPurify from 'dompurify';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param content The HTML content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(content: string): string {
  try {
    if (!content) return '';
    
    // Configure DOMPurify to allow certain tags but remove potentially harmful ones
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'br', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed', 'svg'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ['target']
    });
    
    // Add additional check for JavaScript protocol in links
    const noJsUrls = sanitized.replace(/javascript:/gi, 'removed:');
    
    logger.debug(LogSource.SAFETY, 'Content sanitized successfully', { contentLength: content.length });
    return noJsUrls;
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Error sanitizing content', error);
    // Fallback to a more aggressive sanitization that strips all HTML
    return content.replace(/<[^>]*>?/gm, '');
  }
}

/**
 * Sanitize plain text input (for comments, usernames, etc.)
 * @param text The text to sanitize
 * @returns Sanitized text string
 */
export function sanitizeText(text: string): string {
  try {
    if (!text) return '';
    
    // Remove any HTML tags from plain text
    const noHtml = text.replace(/<[^>]*>?/gm, '');
    
    // Remove any JavaScript protocols
    const noJs = noHtml.replace(/javascript:/gi, 'removed:');
    
    // Trim and normalize whitespace
    const trimmed = noJs.replace(/\s+/g, ' ').trim();
    
    return trimmed;
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Error sanitizing text', error);
    // Fallback to empty string if all else fails
    return '';
  }
}

/**
 * Validate and normalize URLs
 * @param url The URL to validate
 * @returns Validated URL or null if invalid
 */
export function validateUrl(url: string): string | null {
  try {
    if (!url) return null;
    
    // Remove whitespace
    const trimmed = url.trim();
    
    // Check if it's a JavaScript URL (security risk)
    if (trimmed.toLowerCase().includes('javascript:')) {
      logger.warn(LogSource.SAFETY, 'Blocked JavaScript URL', { url: trimmed });
      return null;
    }
    
    // Ensure URL is properly formatted
    try {
      const parsedUrl = new URL(trimmed);
      // Only allow http and https protocols
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        logger.warn(LogSource.SAFETY, 'Blocked URL with invalid protocol', { protocol: parsedUrl.protocol });
        return null;
      }
      return parsedUrl.toString();
    } catch (parseError) {
      // If URL is not properly formatted, return null
      return null;
    }
  } catch (error) {
    logger.error(LogSource.SAFETY, 'Error validating URL', error);
    return null;
  }
}

/**
 * Check for common malicious patterns in content
 * @param content The content to check
 * @returns True if content might be malicious
 */
export function hasMaliciousContent(content: string): boolean {
  if (!content) return false;
  
  const lowerContent = content.toLowerCase();
  
  // Check for common SQL injection patterns
  const sqlPatterns = [
    'union select', 
    'exec(', 
    'select * from', 
    'drop table', 
    'insert into',
    '1=1',
    '1 = 1',
    'or 1=1',
    'or 1 = 1'
  ];
  
  // Check for XSS patterns
  const xssPatterns = [
    '<script>',
    'javascript:',
    'onerror=',
    'onclick=',
    'onload=',
    'onmouseover=',
    'alert(',
    'document.cookie',
    'eval('
  ];
  
  // Check for both pattern types
  const hasSql = sqlPatterns.some(pattern => lowerContent.includes(pattern));
  const hasXss = xssPatterns.some(pattern => lowerContent.includes(pattern));
  
  if (hasSql || hasXss) {
    logger.warn(LogSource.SAFETY, 'Potentially malicious content detected', {
      hasSql,
      hasXss,
      contentPreview: content.substring(0, 100)
    });
    return true;
  }
  
  return false;
}
