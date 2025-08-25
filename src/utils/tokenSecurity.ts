/**
 * Token security utilities for client-side validation and security checks
 */

export interface TokenSecurityCheck {
  isValid: boolean;
  issues: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export class TokenSecurityUtils {
  /**
   * Validate token format and basic security properties
   */
  static validateTokenFormat(token: string): TokenSecurityCheck {
    const issues: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check if token exists
    if (!token) {
      issues.push('Token is required');
      return { isValid: false, issues, riskLevel: 'high' };
    }

    // Check token length (should be 64 hex characters)
    if (token.length !== 64) {
      issues.push('Token must be exactly 64 characters long');
      riskLevel = 'high';
    }

    // Check if token contains only valid hex characters
    const hexRegex = /^[a-f0-9]+$/i;
    if (!hexRegex.test(token)) {
      issues.push('Token contains invalid characters (must be hexadecimal)');
      riskLevel = 'high';
    }

    // Check for common weak patterns
    if (this.hasWeakPatterns(token)) {
      issues.push('Token appears to have weak randomness patterns');
      riskLevel = 'medium';
    }

    // Check for repeated characters (potential weakness)
    if (this.hasExcessiveRepeatedChars(token)) {
      issues.push('Token has suspicious repeated character patterns');
      riskLevel = 'medium';
    }

    const isValid = issues.length === 0;
    return { isValid, issues, riskLevel };
  }

  /**
   * Validate email format for token operations
   */
  static validateEmailFormat(email: string): { isValid: boolean; error?: string } {
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    // Check for common security issues
    if (email.length > 254) {
      return { isValid: false, error: 'Email address is too long' };
    }

    const localPart = email.split('@')[0];
    if (localPart.length > 64) {
      return { isValid: false, error: 'Email local part is too long' };
    }

    return { isValid: true };
  }

  /**
   * Check if token expiration is reasonable
   */
  static validateTokenExpiration(expiresAt: string): { isValid: boolean; error?: string; timeRemaining?: number } {
    try {
      const expirationDate = new Date(expiresAt);
      const now = new Date();
      const timeRemaining = expirationDate.getTime() - now.getTime();

      // Check if expiration date is in the past
      if (timeRemaining <= 0) {
        return { isValid: false, error: 'Token has expired', timeRemaining: 0 };
      }

      // Check if expiration is too far in the future (more than 30 days)
      const maxValidDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      if (timeRemaining > maxValidDuration) {
        return { isValid: false, error: 'Token expiration is too far in the future' };
      }

      // Warn if token expires very soon (less than 1 hour)
      const oneHour = 60 * 60 * 1000;
      if (timeRemaining < oneHour) {
        return { 
          isValid: true, 
          error: 'Token expires soon', 
          timeRemaining: Math.floor(timeRemaining / 1000) 
        };
      }

      return { 
        isValid: true, 
        timeRemaining: Math.floor(timeRemaining / 1000) 
      };
    } catch (error) {
      return { isValid: false, error: 'Invalid expiration date format' };
    }
  }

  /**
   * Generate a secure token on the client side (for testing purposes only)
   * Note: This should NOT be used for production tokens - use server-side generation
   */
  static generateTestToken(): string {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for environments without crypto API (not secure)
    console.warn('Using insecure fallback for token generation - do not use in production');
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  /**
   * Sanitize token for logging (mask most characters)
   */
  static sanitizeTokenForLogging(token: string): string {
    if (!token || token.length < 8) {
      return '[INVALID_TOKEN]';
    }
    
    const start = token.substring(0, 4);
    const end = token.substring(token.length - 4);
    const middle = '*'.repeat(Math.max(0, token.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * Check for weak patterns in token
   */
  private static hasWeakPatterns(token: string): boolean {
    // Check for sequential patterns
    const sequentialPattern = /(?:0123|1234|2345|3456|4567|5678|6789|789a|89ab|9abc|abcd|bcde|cdef)/i;
    if (sequentialPattern.test(token)) {
      return true;
    }

    // Check for repeated sequences
    const repeatedPattern = /(.{2,})\1{2,}/;
    if (repeatedPattern.test(token)) {
      return true;
    }

    // Check for all same character
    const allSamePattern = /^(.)\1+$/;
    if (allSamePattern.test(token)) {
      return true;
    }

    return false;
  }

  /**
   * Check for excessive repeated characters
   */
  private static hasExcessiveRepeatedChars(token: string): boolean {
    const charCounts: { [key: string]: number } = {};
    
    for (const char of token) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    // Check if any character appears more than 25% of the time
    const maxAllowedCount = Math.floor(token.length * 0.25);
    return Object.values(charCounts).some(count => count > maxAllowedCount);
  }

  /**
   * Rate limiting check for token operations (client-side tracking)
   */
  static checkRateLimit(operation: string, maxAttempts: number = 5, windowMs: number = 60000): { allowed: boolean; remainingAttempts: number; resetTime: number } {
    const key = `token_rate_limit_${operation}`;
    const now = Date.now();
    
    try {
      const stored = localStorage.getItem(key);
      let attempts: { timestamp: number; count: number } = stored ? JSON.parse(stored) : { timestamp: now, count: 0 };

      // Reset if window has passed
      if (now - attempts.timestamp > windowMs) {
        attempts = { timestamp: now, count: 0 };
      }

      // Check if limit exceeded
      if (attempts.count >= maxAttempts) {
        const resetTime = attempts.timestamp + windowMs;
        return { 
          allowed: false, 
          remainingAttempts: 0, 
          resetTime 
        };
      }

      // Increment counter
      attempts.count++;
      localStorage.setItem(key, JSON.stringify(attempts));

      return { 
        allowed: true, 
        remainingAttempts: maxAttempts - attempts.count, 
        resetTime: attempts.timestamp + windowMs 
      };
    } catch (error) {
      // If localStorage is not available, allow the operation
      console.warn('Rate limiting unavailable:', error);
      return { allowed: true, remainingAttempts: maxAttempts - 1, resetTime: now + windowMs };
    }
  }

  /**
   * Clear rate limit for an operation
   */
  static clearRateLimit(operation: string): void {
    const key = `token_rate_limit_${operation}`;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear rate limit:', error);
    }
  }
}

export default TokenSecurityUtils