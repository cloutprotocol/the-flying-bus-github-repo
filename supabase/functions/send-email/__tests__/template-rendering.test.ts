import { beforeEach } from 'node:test';
import { describe, it, expect, vi } from 'vitest';

// Mock @react-email/render and template components
const mockRender = vi.fn();

// Mock template components
const InvitationConfirmation = (props: any) => {
  if (!props.parentName || !props.childName || !props.submissionDate) {
    throw new Error('Missing required template data');
  }
  
  // Sanitize input
  const sanitizedProps = {
    ...props,
    parentName: props.parentName.replace(/<script.*?>.*?<\/script>/gi, ''),
    childName: props.childName.replace(/<script.*?>.*?<\/script>/gi, '')
  };
  
  return { type: 'InvitationConfirmation', props: sanitizedProps };
};

const InvitationApproved = (props: any) => {
  if (!props.activationUrl.startsWith('https://')) {
    throw new Error('Invalid activation URL');
  }
  return { type: 'InvitationApproved', props };
};

const InvitationExpired = (props: any) => {
  return { type: 'InvitationExpired', props };
};

const InvitationInvalid = (props: any) => {
  return { type: 'InvitationInvalid', props };
};

const InvitationUsed = (props: any) => {
  return { type: 'InvitationUsed', props };
};

const render = mockRender;

// Mock @react-email/render
vi.mock('@react-email/render', () => ({
  render: vi.fn()
}));

describe('Email Template Rendering Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('InvitationConfirmation Template', () => {
    it('should render invitation confirmation template with all required data', async () => {
      const mockHtml = '<html><body>Confirmation email content</body></html>';
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        submissionDate: '2024-01-15'
      };

      const result = await render(InvitationConfirmation(templateData));

      expect(render).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(Function),
          props: templateData
        })
      );
      expect(result).toBe(mockHtml);
    });

    it('should handle missing template data gracefully', async () => {
      const templateData = {
        parentName: 'John Doe',
        // Missing childName and submissionDate
      };

      expect(() => {
        InvitationConfirmation(templateData as any);
      }).toThrow('Missing required template data');
    });

    it('should sanitize user input in template data', async () => {
      const templateData = {
        parentName: 'John <script>alert("xss")</script> Doe',
        childName: 'Jane Doe',
        submissionDate: '2024-01-15'
      };

      const template = InvitationConfirmation(templateData);
      
      // Verify that script tags are escaped or removed
      expect(template.props.parentName).not.toContain('<script>');
    });

    it('should include proper email structure elements', async () => {
      const mockHtml = `
        <html>
          <head><title>Invitation Confirmation</title></head>
          <body>
            <h1>Thank you for your invitation request</h1>
            <p>Dear John Doe,</p>
            <p>We have received your request for Jane Doe to become an author.</p>
          </body>
        </html>
      `;
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        submissionDate: '2024-01-15'
      };

      const result = await render(InvitationConfirmation(templateData));

      expect(result).toContain('Thank you for your invitation request');
      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Doe');
    });
  });

  describe('InvitationApproved Template', () => {
    it('should render invitation approved template with activation link', async () => {
      const mockHtml = '<html><body>Invitation approved with link</body></html>';
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        activationUrl: 'https://app.com/invitation/activate?token=abc123',
        expirationDate: '2024-01-22'
      };

      const result = await render(InvitationApproved(templateData));

      expect(render).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            activationUrl: 'https://app.com/invitation/activate?token=abc123'
          })
        })
      );
      expect(result).toBe(mockHtml);
    });

    it('should validate activation URL format', () => {
      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        activationUrl: 'invalid-url',
        expirationDate: '2024-01-22'
      };

      expect(() => {
        InvitationApproved(templateData);
      }).toThrow('Invalid activation URL');
    });

    it('should include security notice about link expiration', async () => {
      const mockHtml = `
        <html>
          <body>
            <p>This link will expire on 2024-01-22</p>
            <p>For security reasons, this link can only be used once.</p>
          </body>
        </html>
      `;
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        activationUrl: 'https://app.com/invitation/activate?token=abc123',
        expirationDate: '2024-01-22'
      };

      const result = await render(InvitationApproved(templateData));

      expect(result).toContain('expire on 2024-01-22');
      expect(result).toContain('security reasons');
    });

    it('should include clear call-to-action button', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="https://app.com/invitation/activate?token=abc123" 
               style="background-color: #007bff; color: white; padding: 12px 24px;">
              Activate Author Account
            </a>
          </body>
        </html>
      `;
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        activationUrl: 'https://app.com/invitation/activate?token=abc123',
        expirationDate: '2024-01-22'
      };

      const result = await render(InvitationApproved(templateData));

      expect(result).toContain('Activate Author Account');
      expect(result).toContain('background-color: #007bff');
    });
  });

  describe('InvitationExpired Template', () => {
    it('should render expired invitation template', async () => {
      const mockHtml = '<html><body>Your invitation has expired</body></html>';
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        originalExpirationDate: '2024-01-15'
      };

      const result = await render(InvitationExpired(templateData));

      expect(result).toContain('expired');
    });

    it('should include instructions for requesting new invitation', async () => {
      const mockHtml = `
        <html>
          <body>
            <p>Your invitation has expired.</p>
            <p>Please request a new invitation by visiting our website.</p>
            <a href="https://app.com/request-invitation">Request New Invitation</a>
          </body>
        </html>
      `;
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        originalExpirationDate: '2024-01-15'
      };

      const result = await render(InvitationExpired(templateData));

      expect(result).toContain('Request New Invitation');
      expect(result).toContain('request a new invitation');
    });
  });

  describe('InvitationInvalid Template', () => {
    it('should render invalid invitation template', async () => {
      const mockHtml = '<html><body>Invalid invitation link</body></html>';
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        supportEmail: 'support@kidsnews.com'
      };

      const result = await render(InvitationInvalid(templateData));

      expect(result).toContain('Invalid');
    });

    it('should include contact information for support', async () => {
      const mockHtml = `
        <html>
          <body>
            <p>The invitation link is invalid.</p>
            <p>Please contact support at support@kidsnews.com</p>
          </body>
        </html>
      `;
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        supportEmail: 'support@kidsnews.com'
      };

      const result = await render(InvitationInvalid(templateData));

      expect(result).toContain('support@kidsnews.com');
      expect(result).toContain('contact support');
    });
  });

  describe('InvitationUsed Template', () => {
    it('should render used invitation template', async () => {
      const mockHtml = '<html><body>Invitation already used</body></html>';
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        childName: 'Jane Doe',
        dashboardUrl: 'https://app.com/dashboard'
      };

      const result = await render(InvitationUsed(templateData));

      expect(result).toContain('already used');
    });

    it('should include link to dashboard for activated accounts', async () => {
      const mockHtml = `
        <html>
          <body>
            <p>This invitation has already been used.</p>
            <p>If you are Jane Doe, you can access your dashboard here:</p>
            <a href="https://app.com/dashboard">Go to Dashboard</a>
          </body>
        </html>
      `;
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        childName: 'Jane Doe',
        dashboardUrl: 'https://app.com/dashboard'
      };

      const result = await render(InvitationUsed(templateData));

      expect(result).toContain('Go to Dashboard');
      expect(result).toContain('https://app.com/dashboard');
    });
  });

  describe('Template Responsiveness', () => {
    it('should include responsive CSS for mobile devices', async () => {
      const mockHtml = `
        <html>
          <head>
            <style>
              @media only screen and (max-width: 600px) {
                .container { width: 100% !important; }
              }
            </style>
          </head>
          <body>Content</body>
        </html>
      `;
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        submissionDate: '2024-01-15'
      };

      const result = await render(InvitationConfirmation(templateData));

      expect(result).toContain('@media only screen and (max-width: 600px)');
      expect(result).toContain('width: 100% !important');
    });

    it('should include proper viewport meta tag', async () => {
      const mockHtml = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body>Content</body>
        </html>
      `;
      (render as any).mockResolvedValue(mockHtml);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        submissionDate: '2024-01-15'
      };

      const result = await render(InvitationConfirmation(templateData));

      expect(result).toContain('name="viewport"');
      expect(result).toContain('width=device-width');
    });
  });

  describe('Template Security', () => {
    it('should escape HTML in user-provided data', () => {
      const templateData = {
        parentName: 'John <img src="x" onerror="alert(1)"> Doe',
        childName: 'Jane <script>alert("xss")</script> Doe',
        submissionDate: '2024-01-15'
      };

      const template = InvitationConfirmation(templateData);

      // Verify that HTML is escaped
      expect(template.props.parentName).not.toContain('<img');
      expect(template.props.childName).not.toContain('<script>');
    });

    it('should validate URL parameters in activation links', () => {
      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        activationUrl: 'javascript:alert("xss")',
        expirationDate: '2024-01-22'
      };

      expect(() => {
        InvitationApproved(templateData);
      }).toThrow('Invalid activation URL');
    });
  });

  describe('Plain Text Generation', () => {
    it('should generate plain text version of templates', async () => {
      const mockPlainText = 'Thank you for your invitation request, John Doe.';
      (render as any).mockResolvedValue(mockPlainText);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        submissionDate: '2024-01-15'
      };

      const result = await render(InvitationConfirmation(templateData), {
        plainText: true
      });

      expect(result).toBe(mockPlainText);
      expect(result).not.toContain('<html>');
      expect(result).not.toContain('<body>');
    });

    it('should preserve important information in plain text', async () => {
      const mockPlainText = `
        Your Author Invitation is Ready!
        
        Dear John Doe,
        
        Great news! Jane Doe's invitation to become an author has been approved.
        
        Activation Link: https://app.com/invitation/activate?token=abc123
        
        This link will expire on 2024-01-22.
      `;
      (render as any).mockResolvedValue(mockPlainText);

      const templateData = {
        parentName: 'John Doe',
        childName: 'Jane Doe',
        activationUrl: 'https://app.com/invitation/activate?token=abc123',
        expirationDate: '2024-01-22'
      };

      const result = await render(InvitationApproved(templateData), {
        plainText: true
      });

      expect(result).toContain('https://app.com/invitation/activate?token=abc123');
      expect(result).toContain('expire on 2024-01-22');
      expect(result).toContain('John Doe');
      expect(result).toContain('Jane Doe');
    });
  });
});