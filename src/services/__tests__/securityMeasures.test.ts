import { describe, it, expect, beforeEach, vi } from 'vitest';
import RateLimitService from '../rateLimitService';
import AuditLogService from '../auditLogService';
import InputSanitizationService from '../inputSanitizationService';
import CaptchaService from '../captchaService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({
        lt: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

describe('Security Measures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limiting Service', () => {
    it('should allow requests within rate limit', async () => {
      const result = await RateLimitService.checkRateLimit(
        'invitation_request',
        'test@example.com'
      );

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBeGreaterThan(0);
    });

    it('should record attempts correctly', async () => {
      await expect(
        RateLimitService.recordAttempt(
          'invitation_request',
          'test@example.com',
          true,
          { invitationId: 'test-id' }
        )
      ).resolves.not.toThrow();
    });

    it('should clean up old records', async () => {
      await expect(
        RateLimitService.cleanup(24)
      ).resolves.not.toThrow();
    });
  });

  describe('Audit Logging Service', () => {
    it('should log token generation events', async () => {
      await expect(
        AuditLogService.logTokenGeneration(
          'invitation-123',
          'test@example.com',
          true,
          undefined,
          'user-123'
        )
      ).resolves.not.toThrow();
    });

    it('should log token validation events', async () => {
      await expect(
        AuditLogService.logTokenValidation(
          'token-123',
          'test@example.com',
          true,
          undefined,
          'user-123'
        )
      ).resolves.not.toThrow();
    });

    it('should log invitation request events', async () => {
      await expect(
        AuditLogService.logInvitationRequest(
          'invitation-123',
          'test@example.com',
          true
        )
      ).resolves.not.toThrow();
    });

    it('should log email sending events', async () => {
      await expect(
        AuditLogService.logEmailSent(
          'invitation_confirmation',
          'test@example.com',
          true,
          'msg-123'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Input Sanitization Service', () => {
    it('should sanitize email addresses correctly', () => {
      expect(InputSanitizationService.sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
      expect(InputSanitizationService.sanitizeEmail('test<script>@example.com')).toBe('testscript@example.com');
      expect(InputSanitizationService.sanitizeEmail('invalid-email')).toBe('');
    });

    it('should sanitize names correctly', () => {
      expect(InputSanitizationService.sanitizeName('  John Doe  ')).toBe('John Doe');
      expect(InputSanitizationService.sanitizeName('John<script>alert("xss")</script>Doe')).toBe('JohnDoe');
      expect(InputSanitizationService.sanitizeName('John123Doe')).toBe('JohnDoe');
    });

    it('should sanitize messages correctly', () => {
      const message = 'Hello <script>alert("xss")</script> World!';
      const sanitized = InputSanitizationService.sanitizeMessage(message);
      expect(sanitized).toBe('Hello  World!');
      expect(sanitized).not.toContain('<script>');
    });

    it('should sanitize URLs correctly', () => {
      expect(InputSanitizationService.sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(InputSanitizationService.sanitizeUrl('javascript:alert("xss")')).toBe('');
      expect(InputSanitizationService.sanitizeUrl('ftp://example.com')).toBe('');
    });

    it('should sanitize email template data comprehensively', () => {
      const data = {
        parentName: '  John<script>alert("xss")</script>Doe  ',
        parentEmail: '  TEST@EXAMPLE.COM  ',
        childName: 'Jane123Doe',
        activationUrl: 'https://example.com/activate',
        message: 'Hello <script>alert("xss")</script>World!',
        age: 25,
        isActive: true,
        metadata: {
          nestedName: 'Nested<script>Name'
        }
      };

      const sanitized = InputSanitizationService.sanitizeEmailTemplateData(data);

      expect(sanitized.parentName).toBe('JohnDoe');
      expect(sanitized.parentEmail).toBe('test@example.com');
      expect(sanitized.childName).toBe('JaneDoe');
      expect(sanitized.activationUrl).toBe('https://example.com/activate');
      expect(sanitized.message).toBe('Hello World!');
      expect(sanitized.age).toBe(25);
      expect(sanitized.isActive).toBe(true);
      expect(sanitized.metadata.nestedName).toBe('NestedName');
    });

    it('should sanitize invitation request data', () => {
      const data = {
        parent_name: '  John<script>Doe  ',
        parent_email: '  TEST@EXAMPLE.COM  ',
        child_name: 'Jane123Doe',
        child_age: 12,
        message: 'Hello <script>alert("xss")</script> World!'
      };

      const sanitized = InputSanitizationService.sanitizeInvitationRequest(data);

      expect(sanitized.parent_name).toBe('JohnDoe');
      expect(sanitized.parent_email).toBe('test@example.com');
      expect(sanitized.child_name).toBe('JaneDoe');
      expect(sanitized.child_age).toBe(12);
      expect(sanitized.message).toBe('Hello  World!');
    });

    it('should handle edge cases in sanitization', () => {
      expect(InputSanitizationService.sanitizeEmail('')).toBe('');
      expect(InputSanitizationService.sanitizeEmail(null as any)).toBe('');
      expect(InputSanitizationService.sanitizeName('')).toBe('');
      expect(InputSanitizationService.sanitizeMessage('')).toBe('');
      expect(InputSanitizationService.sanitizeUrl('')).toBe('');
    });

    it('should provide sanitization statistics', () => {
      const original = 'Hello <script>alert("xss")</script> World!';
      const sanitized = 'Hello  World!';
      const stats = InputSanitizationService.getSanitizationStats(original, sanitized);

      expect(stats.originalLength).toBe(original.length);
      expect(stats.sanitizedLength).toBe(sanitized.length);
      expect(stats.charactersRemoved).toBeGreaterThan(0);
      expect(stats.percentageReduced).toBeGreaterThan(0);
    });
  });

  describe('CAPTCHA Service', () => {
    it('should generate valid challenges', () => {
      const result = CaptchaService.generateChallenge();
      
      expect(result.success).toBe(true);
      expect(result.challenge).toBeDefined();
      expect(result.challenge?.id).toBeDefined();
      expect(result.challenge?.question).toBeDefined();
      expect(result.challenge?.expiresAt).toBeDefined();
      expect(result.challenge?.answer).toBe(0); // Should not expose answer to client
    });

    it('should verify correct answers', () => {
      const challengeResult = CaptchaService.generateChallenge();
      expect(challengeResult.success).toBe(true);
      
      if (challengeResult.challenge) {
        // We need to access the internal challenge to get the correct answer
        // In a real scenario, this would be stored server-side
        const challenge = (CaptchaService as any).challenges.get(challengeResult.challenge.id);
        
        const verificationResult = CaptchaService.verifyCaptcha({
          challengeId: challengeResult.challenge.id,
          userAnswer: challenge.answer.toString()
        });
        
        expect(verificationResult.success).toBe(true);
      }
    });

    it('should reject incorrect answers', () => {
      const challengeResult = CaptchaService.generateChallenge();
      expect(challengeResult.success).toBe(true);
      
      if (challengeResult.challenge) {
        const verificationResult = CaptchaService.verifyCaptcha({
          challengeId: challengeResult.challenge.id,
          userAnswer: '999999' // Obviously wrong answer
        });
        
        expect(verificationResult.success).toBe(false);
        expect(verificationResult.error).toContain('Incorrect answer');
      }
    });

    it('should reject invalid challenge IDs', () => {
      const verificationResult = CaptchaService.verifyCaptcha({
        challengeId: 'invalid-id',
        userAnswer: '42'
      });
      
      expect(verificationResult.success).toBe(false);
      expect(verificationResult.error).toContain('Invalid or expired');
    });

    it('should provide statistics', () => {
      // Generate a challenge first
      CaptchaService.generateChallenge();
      
      const stats = CaptchaService.getStats();
      expect(stats.activeChallenges).toBeGreaterThanOrEqual(0);
    });

    it('should handle edge cases', () => {
      // Test with missing parameters
      const result1 = CaptchaService.verifyCaptcha({
        challengeId: '',
        userAnswer: '42'
      });
      expect(result1.success).toBe(false);

      const result2 = CaptchaService.verifyCaptcha({
        challengeId: 'test-id',
        userAnswer: ''
      });
      expect(result2.success).toBe(false);

      // Test with non-numeric answer
      const result3 = CaptchaService.verifyCaptcha({
        challengeId: 'test-id',
        userAnswer: 'not-a-number'
      });
      expect(result3.success).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should work together for secure invitation flow', async () => {
      const email = 'test@example.com';
      
      // Check rate limit
      const rateLimitResult = await RateLimitService.checkRateLimit('invitation_request', email);
      expect(rateLimitResult.allowed).toBe(true);
      
      // Generate CAPTCHA
      const captchaResult = CaptchaService.generateChallenge();
      expect(captchaResult.success).toBe(true);
      
      // Sanitize input data
      const rawData = {
        parent_name: '  John<script>Doe  ',
        parent_email: '  TEST@EXAMPLE.COM  ',
        child_name: 'Jane123Doe',
        child_age: 12,
        message: 'Hello <script>World!'
      };
      
      const sanitizedData = InputSanitizationService.sanitizeInvitationRequest(rawData);
      expect(sanitizedData.parent_name).toBe('JohnDoe');
      expect(sanitizedData.parent_email).toBe('test@example.com');
      
      // Record attempt
      await RateLimitService.recordAttempt('invitation_request', email, true);
      
      // Log audit event
      await AuditLogService.logInvitationRequest('test-invitation', email, true);
    });
  });
});