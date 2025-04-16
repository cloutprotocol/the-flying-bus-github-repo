
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText, validateUrl, hasMaliciousContent } from './sanitize';

describe('Sanitization Utilities', () => {
  describe('sanitizeHtml', () => {
    it('removes script tags from HTML content', () => {
      const malicious = '<p>Hello</p><script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(malicious);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Hello</p>');
    });
    
    it('removes onclick attributes', () => {
      const malicious = '<a href="#" onclick="alert(\'XSS\')">Click me</a>';
      const sanitized = sanitizeHtml(malicious);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('<a href="#"');
    });
    
    it('removes javascript: URLs', () => {
      const malicious = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      const sanitized = sanitizeHtml(malicious);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('removed:');
    });
    
    it('keeps allowed tags and attributes', () => {
      const validHtml = '<p><strong>Bold</strong> and <em>italic</em> text with <a href="https://example.com" target="_blank">link</a></p>';
      const sanitized = sanitizeHtml(validHtml);
      
      expect(sanitized).toBe(validHtml);
    });
    
    it('handles null or undefined input', () => {
      expect(sanitizeHtml('')).toBe('');
      // @ts-ignore - Testing null input
      expect(sanitizeHtml(null)).toBe('');
      // @ts-ignore - Testing undefined input
      expect(sanitizeHtml(undefined)).toBe('');
    });
  });
  
  describe('sanitizeText', () => {
    it('removes HTML tags from text', () => {
      const malicious = 'Hello <script>alert("XSS")</script> world';
      const sanitized = sanitizeText(malicious);
      
      expect(sanitized).toBe('Hello world');
    });
    
    it('trims and normalizes whitespace', () => {
      const text = '  Too   many    spaces   ';
      const sanitized = sanitizeText(text);
      
      expect(sanitized).toBe('Too many spaces');
    });
    
    it('removes javascript: text', () => {
      const malicious = 'Click javascript:alert("XSS")';
      const sanitized = sanitizeText(malicious);
      
      expect(sanitized).toContain('Click removed:');
    });
  });
  
  describe('validateUrl', () => {
    it('accepts valid http URLs', () => {
      expect(validateUrl('http://example.com')).toBe('http://example.com/');
    });
    
    it('accepts valid https URLs', () => {
      expect(validateUrl('https://example.com')).toBe('https://example.com/');
    });
    
    it('rejects javascript: URLs', () => {
      expect(validateUrl('javascript:alert("XSS")')).toBeNull();
    });
    
    it('rejects file: protocol URLs', () => {
      expect(validateUrl('file:///etc/passwd')).toBeNull();
    });
    
    it('rejects malformed URLs', () => {
      expect(validateUrl('not-a-url')).toBeNull();
    });
  });
  
  describe('hasMaliciousContent', () => {
    it('detects SQL injection patterns', () => {
      expect(hasMaliciousContent('SELECT * FROM users')).toBe(true);
      expect(hasMaliciousContent('1=1; DROP TABLE users')).toBe(true);
      expect(hasMaliciousContent('normal text OR 1=1')).toBe(true);
    });
    
    it('detects XSS patterns', () => {
      expect(hasMaliciousContent('<script>alert("XSS")</script>')).toBe(true);
      expect(hasMaliciousContent('javascript:alert("XSS")')).toBe(true);
      expect(hasMaliciousContent('img onerror=alert(1)')).toBe(true);
    });
    
    it('accepts normal content', () => {
      expect(hasMaliciousContent('Hello world!')).toBe(false);
      expect(hasMaliciousContent('This is a normal message with no malicious content.')).toBe(false);
    });
  });
});
