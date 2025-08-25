/**
 * Input Sanitization utilities for Edge Functions
 * Provides server-side sanitization for email templates and user inputs
 */

export interface SanitizationOptions {
  maxLength?: number;
  allowHtml?: boolean;
  allowedTags?: string[];
  stripControlChars?: boolean;
  normalizeWhitespace?: boolean;
  preventScriptInjection?: boolean;
}

export interface EmailTemplateData {
  [key: string]: any;
}

export class InputSanitizer {
  private static readonly DEFAULT_MAX_LENGTH = 1000;
  private static readonly EMAIL_MAX_LENGTH = 255;
  private static readonly NAME_MAX_LENGTH = 100;
  private static readonly MESSAGE_MAX_LENGTH = 2000;

  // Dangerous patterns that should be removed or escaped
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
  ];

  /**
   * Sanitize email template data comprehensively
   */
  static sanitizeEmailTemplateData(data: EmailTemplateData): EmailTemplateData {
    const sanitized: EmailTemplateData = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        sanitized[key] = value;
        continue;
      }

      // Determine sanitization strategy based on field name
      if (key.toLowerCase().includes('email')) {
        sanitized[key] = this.sanitizeEmail(String(value));
      } else if (key.toLowerCase().includes('name')) {
        sanitized[key] = this.sanitizeName(String(value));
      } else if (key.toLowerCase().includes('message') || key.toLowerCase().includes('content')) {
        sanitized[key] = this.sanitizeMessage(String(value));
      } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
        sanitized[key] = this.sanitizeUrl(String(value));
      } else if (key.toLowerCase().includes('date')) {
        sanitized[key] = this.sanitizeDate(String(value));
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeGenericString(String(value));
      } else if (typeof value === 'number') {
        sanitized[key] = this.sanitizeNumber(value);
      } else if (typeof value === 'boolean') {
        sanitized[key] = Boolean(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.sanitizeGenericString(item) : item
        );
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeEmailTemplateData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    // Basic sanitization
    let sanitized = email.trim().toLowerCase();
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>'"]/g, '');
    
    // Limit length
    sanitized = sanitized.substring(0, this.EMAIL_MAX_LENGTH);
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(sanitized)) {
      console.warn('Invalid email format after sanitization:', sanitized);
      return '';
    }
    
    return sanitized;
  }

  /**
   * Sanitize names (person names, child names, etc.)
   */
  static sanitizeName(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }

    let sanitized = name.trim();
    
    // Remove HTML tags and dangerous patterns
    sanitized = this.removeDangerousPatterns(sanitized);
    sanitized = this.stripHtmlTags(sanitized);
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Limit length
    sanitized = sanitized.substring(0, this.NAME_MAX_LENGTH);
    
    // Only allow letters, spaces, hyphens, apostrophes, and periods
    sanitized = sanitized.replace(/[^a-zA-Z\s\-'.]/g, '');
    
    return sanitized;
  }

  /**
   * Sanitize message content
   */
  static sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return '';
    }

    let sanitized = message.trim();
    
    // Remove dangerous patterns first
    sanitized = this.removeDangerousPatterns(sanitized);
    
    // Remove HTML tags completely for email templates
    sanitized = this.stripHtmlTags(sanitized);
    
    // Remove control characters except newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize line breaks
    sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Limit consecutive newlines
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
    
    // Limit length
    sanitized = sanitized.substring(0, this.MESSAGE_MAX_LENGTH);
    
    return sanitized;
  }

  /**
   * Sanitize URLs
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    let sanitized = url.trim();
    
    // Remove dangerous patterns
    sanitized = this.removeDangerousPatterns(sanitized);
    
    // Only allow HTTP/HTTPS URLs
    if (!sanitized.match(/^https?:\/\//i)) {
      console.warn('Invalid URL protocol:', sanitized);
      return '';
    }
    
    // Basic URL validation
    try {
      const urlObj = new URL(sanitized);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        console.warn('Disallowed URL protocol:', urlObj.protocol);
        return '';
      }
      return urlObj.toString();
    } catch (error) {
      console.warn('Invalid URL format:', sanitized);
      return '';
    }
  }

  /**
   * Sanitize date strings
   */
  static sanitizeDate(date: string): string {
    if (!date || typeof date !== 'string') {
      return '';
    }

    let sanitized = date.trim();
    
    // Remove HTML and dangerous patterns
    sanitized = this.removeDangerousPatterns(sanitized);
    sanitized = this.stripHtmlTags(sanitized);
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Validate date format
    const dateObj = new Date(sanitized);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date format:', sanitized);
      return '';
    }
    
    return sanitized;
  }

  /**
   * Sanitize numbers
   */
  static sanitizeNumber(num: number): number {
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
      return 0;
    }
    
    // Prevent extremely large numbers that could cause issues
    const MAX_SAFE_NUMBER = Number.MAX_SAFE_INTEGER;
    const MIN_SAFE_NUMBER = Number.MIN_SAFE_INTEGER;
    
    if (num > MAX_SAFE_NUMBER) return MAX_SAFE_NUMBER;
    if (num < MIN_SAFE_NUMBER) return MIN_SAFE_NUMBER;
    
    return num;
  }

  /**
   * Sanitize generic strings
   */
  static sanitizeGenericString(str: string, options: SanitizationOptions = {}): string {
    if (!str || typeof str !== 'string') {
      return '';
    }

    const {
      maxLength = this.DEFAULT_MAX_LENGTH,
      allowHtml = false,
      stripControlChars = true,
      normalizeWhitespace = true,
      preventScriptInjection = true
    } = options;

    let sanitized = str.trim();
    
    // Remove dangerous patterns if script injection prevention is enabled
    if (preventScriptInjection) {
      sanitized = this.removeDangerousPatterns(sanitized);
    }
    
    // Handle HTML
    if (!allowHtml) {
      sanitized = this.stripHtmlTags(sanitized);
    }
    
    // Remove control characters
    if (stripControlChars) {
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    }
    
    // Normalize whitespace
    if (normalizeWhitespace) {
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
    }
    
    // Limit length
    sanitized = sanitized.substring(0, maxLength);
    
    return sanitized;
  }

  /**
   * Remove dangerous patterns from input
   */
  private static removeDangerousPatterns(input: string): string {
    let sanitized = input;
    
    for (const pattern of this.DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    return sanitized;
  }

  /**
   * Strip all HTML tags
   */
  private static stripHtmlTags(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * Validate email request data
   */
  static validateEmailRequest(request: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.type || typeof request.type !== 'string') {
      errors.push('Email type is required and must be a string');
    }

    if (!request.to || typeof request.to !== 'string') {
      errors.push('Recipient email is required and must be a string');
    } else {
      const sanitizedEmail = this.sanitizeEmail(request.to);
      if (!sanitizedEmail) {
        errors.push('Invalid recipient email format');
      }
    }

    if (!request.templateData || typeof request.templateData !== 'object') {
      errors.push('Template data is required and must be an object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default InputSanitizer;