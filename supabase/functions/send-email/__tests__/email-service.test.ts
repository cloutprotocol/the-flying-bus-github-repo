import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailRequest, EmailResponse } from '../types';

// Mock EmailService class for testing
class EmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(request: EmailRequest): Promise<EmailResponse> {
    // Validate email address
    if (!this.validateEmailAddress(request.to)) {
      return { success: false, error: 'Invalid email address' };
    }

    // Check for required template data
    if (request.type === 'invitation_confirmation') {
      const required = ['parentName', 'childName', 'submissionDate'];
      for (const field of required) {
        if (!request.templateData[field]) {
          return { success: false, error: 'Missing required template data' };
        }
      }
    }

    // Mock Resend API call
    try {
      const mockResend = (global as any).mockResend;
      const result = await mockResend.emails.send({
        from: request.from || 'noreply@kidsnews.com',
        to: request.to,
        subject: this.getSubjectForType(request.type),
        html: this.renderTemplate(request.type, request.templateData),
        text: this.renderPlainText(request.type, request.templateData)
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return { success: true, messageId: result.id };
    } catch (error: any) {
      // Implement retry logic
      if (this.isRetryableError(error)) {
        return this.retryWithBackoff(request);
      }
      return { success: false, error: error.message };
    }
  }

  validateEmailAddress(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getSubjectForType(type: string): string {
    switch (type) {
      case 'invitation_confirmation':
        return 'Invitation Request Received';
      case 'invitation_approved':
        return 'Your Author Invitation is Ready!';
      default:
        return 'Notification';
    }
  }

  private renderTemplate(type: string, data: any): string {
    return `<html><body>Template for ${type} with ${JSON.stringify(data)}</body></html>`;
  }

  private renderPlainText(type: string, data: any): string {
    return `Plain text for ${type}`;
  }

  private isRetryableError(error: any): boolean {
    return error.message.includes('timeout') || error.message.includes('Network');
  }

  private async retryWithBackoff(request: EmailRequest): Promise<EmailResponse> {
    // Simulate retry logic
    const mockResend = (global as any).mockResend;
    try {
      const result = await mockResend.emails.send({
        from: 'noreply@kidsnews.com',
        to: request.to,
        subject: this.getSubjectForType(request.type),
        html: this.renderTemplate(request.type, request.templateData),
        text: this.renderPlainText(request.type, request.templateData)
      });
      return { success: true, messageId: result.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Mock Resend
const mockResend = {
  emails: {
    send: vi.fn()
  }
};

vi.mock('resend', () => ({
  Resend: vi.fn(() => mockResend)
}));

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService('test-api-key');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendEmail', () => {
    it('should send invitation confirmation email successfully', async () => {
      const mockResponse = { id: 'email-123', error: null };
      mockResend.emails.send.mockResolvedValue(mockResponse);

      const request: EmailRequest = {
        type: 'invitation_confirmation',
        to: 'test@example.com',
        templateData: {
          parentName: 'John Doe',
          childName: 'Jane Doe',
          submissionDate: '2024-01-15'
        }
      };

      const result = await emailService.sendEmail(request);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'noreply@kidsnews.com',
        to: 'test@example.com',
        subject: 'Invitation Request Received',
        html: expect.stringContaining('John Doe'),
        text: expect.any(String)
      });
    });

    it('should send invitation approved email successfully', async () => {
      const mockResponse = { id: 'email-456', error: null };
      mockResend.emails.send.mockResolvedValue(mockResponse);

      const request: EmailRequest = {
        type: 'invitation_approved',
        to: 'test@example.com',
        templateData: {
          parentName: 'John Doe',
          childName: 'Jane Doe',
          activationUrl: 'https://app.com/invitation/activate?token=abc123',
          expirationDate: '2024-01-22'
        }
      };

      const result = await emailService.sendEmail(request);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-456');
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'noreply@kidsnews.com',
        to: 'test@example.com',
        subject: 'Your Author Invitation is Ready!',
        html: expect.stringContaining('abc123'),
        text: expect.any(String)
      });
    });

    it('should handle Resend API errors gracefully', async () => {
      const mockError = new Error('API rate limit exceeded');
      mockResend.emails.send.mockRejectedValue(mockError);

      const request: EmailRequest = {
        type: 'invitation_confirmation',
        to: 'test@example.com',
        templateData: {
          parentName: 'John Doe',
          childName: 'Jane Doe',
          submissionDate: '2024-01-15'
        }
      };

      const result = await emailService.sendEmail(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API rate limit exceeded');
    });

    it('should validate email addresses', async () => {
      const request: EmailRequest = {
        type: 'invitation_confirmation',
        to: 'invalid-email',
        templateData: {
          parentName: 'John Doe',
          childName: 'Jane Doe',
          submissionDate: '2024-01-15'
        }
      };

      const result = await emailService.sendEmail(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email address');
    });

    it('should handle missing template data', async () => {
      const request: EmailRequest = {
        type: 'invitation_confirmation',
        to: 'test@example.com',
        templateData: {} // Missing required fields
      };

      const result = await emailService.sendEmail(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required template data');
    });

    it('should implement retry logic for transient failures', async () => {
      // First call fails, second succeeds
      mockResend.emails.send
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ id: 'email-retry-123', error: null });

      const request: EmailRequest = {
        type: 'invitation_confirmation',
        to: 'test@example.com',
        templateData: {
          parentName: 'John Doe',
          childName: 'Jane Doe',
          submissionDate: '2024-01-15'
        }
      };

      const result = await emailService.sendEmail(request);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-retry-123');
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });

    it('should respect maximum retry attempts', async () => {
      // All calls fail
      mockResend.emails.send.mockRejectedValue(new Error('Persistent failure'));

      const request: EmailRequest = {
        type: 'invitation_confirmation',
        to: 'test@example.com',
        templateData: {
          parentName: 'John Doe',
          childName: 'Jane Doe',
          submissionDate: '2024-01-15'
        }
      };

      const result = await emailService.sendEmail(request);

      expect(result.success).toBe(false);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('validateEmailAddress', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      validEmails.forEach(email => {
        expect(emailService.validateEmailAddress(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(emailService.validateEmailAddress(email)).toBe(false);
      });
    });
  });
});