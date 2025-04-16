
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { 
  createSanitizedStringSchema, 
  createValidUrlSchema, 
  validateAndSanitize,
  formatValidationErrors
} from './enhancedValidation';

describe('Enhanced Validation Utilities', () => {
  describe('createSanitizedStringSchema', () => {
    it('enforces minimum length requirements', () => {
      const schema = createSanitizedStringSchema({
        minLength: 5,
        maxLength: 100,
        fieldName: 'Test Field'
      });
      
      const result = schema.safeParse('abc');
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('at least 5 characters');
      }
    });
    
    it('enforces maximum length requirements', () => {
      const schema = createSanitizedStringSchema({
        minLength: 1,
        maxLength: 10,
        fieldName: 'Test Field'
      });
      
      const result = schema.safeParse('this is too long for the schema');
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('too long');
      }
    });
    
    it('sanitizes HTML content when allowHtml is true', () => {
      const schema = createSanitizedStringSchema({
        fieldName: 'HTML Content',
        allowHtml: true
      });
      
      const result = schema.safeParse('<p>Valid</p><script>alert("XSS")</script>');
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data).toContain('<p>Valid</p>');
        expect(result.data).not.toContain('<script>');
      }
    });
    
    it('strips HTML content when allowHtml is false', () => {
      const schema = createSanitizedStringSchema({
        fieldName: 'Plain Text',
        allowHtml: false
      });
      
      const result = schema.safeParse('<p>Should be stripped</p>');
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data).not.toContain('<p>');
        expect(result.data).toContain('Should be stripped');
      }
    });
  });
  
  describe('createValidUrlSchema', () => {
    it('accepts valid URLs', () => {
      const schema = createValidUrlSchema();
      
      expect(schema.safeParse('https://example.com').success).toBe(true);
      expect(schema.safeParse('http://localhost:3000').success).toBe(true);
    });
    
    it('rejects invalid URLs', () => {
      const schema = createValidUrlSchema();
      
      expect(schema.safeParse('not-a-url').success).toBe(false);
      expect(schema.safeParse('javascript:alert(1)').success).toBe(false);
      expect(schema.safeParse('file:///etc/passwd').success).toBe(false);
    });
  });
  
  describe('validateAndSanitize', () => {
    it('returns sanitized data for valid input', () => {
      const schema = z.object({
        name: createSanitizedStringSchema({
          fieldName: 'Name',
          allowHtml: false
        }),
        url: createValidUrlSchema().optional()
      });
      
      const result = validateAndSanitize(schema, {
        name: 'Test <script>alert(1)</script>',
        url: 'https://example.com'
      }, 'test');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(true);
      expect(result.data?.name).toBe('Test');
      expect(result.data?.url).toBe('https://example.com/');
    });
    
    it('returns validation errors for invalid input', () => {
      const schema = z.object({
        name: createSanitizedStringSchema({
          minLength: 3,
          fieldName: 'Name',
        }),
        age: z.number().min(18)
      });
      
      const result = validateAndSanitize(schema, {
        name: 'A', // Too short
        age: 15 // Under minimum
      }, 'test');
      
      expect(result.isValid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.errors).not.toBeNull();
    });
  });
  
  describe('formatValidationErrors', () => {
    it('formats ZodError into key-value pairs', () => {
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
        age: z.number().min(18)
      });
      
      const result = schema.safeParse({
        name: 'A',
        email: 'not-an-email',
        age: 15
      });
      
      if (!result.success) {
        const formatted = formatValidationErrors(result.error);
        
        expect(formatted.name).toBeDefined();
        expect(formatted.email).toBeDefined();
        expect(formatted.age).toBeDefined();
      } else {
        // This should not happen
        expect(true).toBe(false);
      }
    });
  });
});
