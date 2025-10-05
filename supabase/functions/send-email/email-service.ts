interface EmailRequest {
  type: 'invitation_confirmation' | 'invitation_approved' | 'invitation_expired' | 'invitation_invalid' | 'invitation_used' | 'custom'
  to: string
  templateData: Record<string, any>
  from?: string
}

interface EmailResponse {
  success: boolean
  messageId?: string
  error?: string
  code?: string
  retryable?: boolean
  details?: Record<string, any>
}

interface ResendEmailRequest {
  from: string
  to: string[]
  subject: string
  html: string
  text?: string
}

interface ResendResponse {
  id: string
  from: string
  to: string[]
  created_at: string
}

export class EmailService {
  private apiKey: string
  private baseUrl = 'https://api.resend.com'
  private defaultFrom: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.defaultFrom = Deno.env.get('DEFAULT_FROM_EMAIL') || 'noreply@yourdomain.com'
  }

  // Function to log email events to monitoring system
  private async logEmailEvent(
    type: 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked',
    email: string,
    template: string,
    messageId?: string,
    error?: string,
    metadata?: Record<string, any>
  ) {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('email_events')
        .insert({
          type,
          email,
          template,
          message_id: messageId,
          error,
          metadata: metadata || {},
          timestamp: new Date().toISOString()
        });
    } catch (err) {
      console.error('Failed to log email event:', err);
    }
  }

  async sendEmail(request: EmailRequest): Promise<EmailResponse> {
    const startTime = Date.now()
    const { EmailLogger } = await import('./email-logger.ts')
    const { EmailErrorHandler, RetryHandler } = await import('./error-handler.ts')

    try {
      // Validate email request
      const validationError = this.validateEmailRequest(request)
      if (validationError) {
        EmailLogger.logValidationError(validationError, { request })
        return {
          success: false,
          error: validationError
        }
      }

      // Sanitize template data before generating content
      const sanitizedTemplateData = this.sanitizeTemplateData(request.templateData)

      // Generate email content with retry for template errors
      const emailContent = await RetryHandler.withRetry(
        async () => {
          const templateStartTime = Date.now()
          const content = await this.generateEmailContent(request.type, sanitizedTemplateData)
          const templateDuration = Date.now() - templateStartTime
          
          if (!content) {
            const error = new Error(`Unknown email template: ${request.type}`)
            throw EmailErrorHandler.handleTemplateError(error, request.type)
          }

          EmailLogger.logTemplateRendered(request.type, templateDuration)
          return content
        },
        (error) => false, // Template errors are not retryable
        0 // No retries for template generation
      )

      // Prepare Resend request with enhanced validation
      const resendRequest: ResendEmailRequest = {
        from: this.sanitizeEmail(request.from || this.defaultFrom),
        to: [this.sanitizeEmail(request.to)],
        subject: this.sanitizeSubject(emailContent.subject),
        html: emailContent.html,
        text: emailContent.text
      }

      // Send email via Resend API with retry logic
      const result = await RetryHandler.withRetry(
        async () => {
          const response = await this.callResendAPI('/emails', resendRequest)
          const totalDuration = Date.now() - startTime
          
          if (response.ok) {
            const result: ResendResponse = await response.json()
            EmailLogger.logEmailSent(request.to, request.type, result.id, totalDuration)
            
            // Log successful email event to monitoring system
            await this.logEmailEvent('sent', request.to, request.type, result.id, undefined, {
              duration: totalDuration,
              from: resendRequest.from,
              subject: resendRequest.subject
            })
            
            return {
              success: true,
              messageId: result.id
            }
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown API error' }))
            const emailError = EmailErrorHandler.handleResendError(response, errorData)
            
            EmailLogger.logApiError('Resend API error', { 
              status: response.status, 
              error: errorData,
              request: resendRequest,
              errorCode: emailError.code
            })
            EmailLogger.logEmailFailed(request.to, request.type, emailError.message, totalDuration)
            
            throw emailError
          }
        },
        (error) => error.retryable,
        3 // Max 3 retries for API calls
      )

      return result

    } catch (error) {
      const totalDuration = Date.now() - startTime
      
      // Handle different error types
      let emailError
      if (error.code) {
        // Already processed error
        emailError = error
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        emailError = EmailErrorHandler.handleNetworkError(error)
      } else {
        emailError = EmailErrorHandler.handleValidationError(
          error.message || 'Unknown error occurred',
          { originalError: error.message, stack: error.stack }
        )
      }
      
      EmailLogger.logEmailFailed(request.to, request.type, emailError.message, totalDuration)
      
      return {
        success: false,
        error: emailError.message,
        code: emailError.code,
        retryable: emailError.retryable
      }
    }
  }

  private validateEmailRequest(request: EmailRequest): string | null {
    // Validate required fields
    if (!request.to) {
      return 'Missing required field: to'
    }

    if (!request.type) {
      return 'Missing required field: type'
    }

    if (!request.templateData || typeof request.templateData !== 'object') {
      return 'Missing or invalid template data'
    }

    // Enhanced email validation
    const emailValidation = this.validateEmailAddress(request.to)
    if (!emailValidation.valid) {
      return emailValidation.error
    }

    // Validate from email if provided
    if (request.from) {
      const fromValidation = this.validateEmailAddress(request.from)
      if (!fromValidation.valid) {
        return `Invalid from email: ${fromValidation.error}`
      }
    }

    // Validate template data based on type
    const templateValidation = this.validateTemplateData(request.type, request.templateData)
    if (!templateValidation.valid) {
      return templateValidation.error
    }

    return null
  }

  private validateEmailAddress(email: string): { valid: boolean; error?: string } {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email address is required' }
    }

    // Trim whitespace
    email = email.trim()

    if (email.length === 0) {
      return { valid: false, error: 'Email address cannot be empty' }
    }

    if (email.length > 254) {
      return { valid: false, error: 'Email address is too long (max 254 characters)' }
    }

    // Enhanced email regex with better validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email address format' }
    }

    // Check for common invalid patterns
    if (email.includes('..')) {
      return { valid: false, error: 'Email address cannot contain consecutive dots' }
    }

    if (email.startsWith('.') || email.endsWith('.')) {
      return { valid: false, error: 'Email address cannot start or end with a dot' }
    }

    // Check for suspicious patterns that might indicate injection attempts
    const suspiciousPatterns = [
      /[<>]/,           // HTML tags
      /javascript:/i,   // JavaScript protocol
      /data:/i,         // Data protocol
      /\r|\n/,          // Line breaks
      /\0/              // Null bytes
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        return { valid: false, error: 'Email address contains invalid characters' }
      }
    }

    return { valid: true }
  }

  private validateTemplateData(type: string, data: Record<string, any>): { valid: boolean; error?: string } {
    switch (type) {
      case 'invitation_confirmation':
        if (!data.parentName && !data.childName) {
          return { valid: false, error: 'Missing required template data: parentName or childName' }
        }
        if (data.parentName && typeof data.parentName !== 'string') {
          return { valid: false, error: 'parentName must be a string' }
        }
        if (data.childName && typeof data.childName !== 'string') {
          return { valid: false, error: 'childName must be a string' }
        }
        break

      case 'invitation_approved':
        if (!data.activationUrl) {
          return { valid: false, error: 'Missing required activation URL for invitation approved email' }
        }
        if (typeof data.activationUrl !== 'string') {
          return { valid: false, error: 'activationUrl must be a string' }
        }
        // Validate URL format
        try {
          new URL(data.activationUrl)
        } catch {
          return { valid: false, error: 'activationUrl must be a valid URL' }
        }
        break

      case 'invitation_expired':
      case 'invitation_invalid':
      case 'invitation_used':
        if (!data.parentName && !data.childName) {
          return { valid: false, error: `Missing required template data for ${type} email: parentName or childName` }
        }
        break

      case 'custom':
        if (!data.subject || !data.html) {
          return { valid: false, error: 'Custom email requires subject and html in template data' }
        }
        if (typeof data.subject !== 'string' || typeof data.html !== 'string') {
          return { valid: false, error: 'Custom email subject and html must be strings' }
        }
        break

      default:
        return { valid: false, error: `Unknown email template type: ${type}` }
    }

    return { valid: true }
  }

  private sanitizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }

  private sanitizeTemplateData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        sanitized[key] = value
        continue
      }

      // Determine sanitization strategy based on field name
      if (key.toLowerCase().includes('email')) {
        sanitized[key] = this.sanitizeEmailField(String(value))
      } else if (key.toLowerCase().includes('name')) {
        sanitized[key] = this.sanitizeNameField(String(value))
      } else if (key.toLowerCase().includes('message') || key.toLowerCase().includes('content')) {
        sanitized[key] = this.sanitizeMessageField(String(value))
      } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
        sanitized[key] = this.sanitizeUrlField(String(value))
      } else if (key.toLowerCase().includes('date')) {
        sanitized[key] = this.sanitizeDateField(String(value))
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeGenericField(String(value))
      } else if (typeof value === 'number') {
        sanitized[key] = this.sanitizeNumberField(value)
      } else if (typeof value === 'boolean') {
        sanitized[key] = Boolean(value)
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.sanitizeGenericField(item) : item
        )
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeTemplateData(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private sanitizeEmailField(email: string): string {
    if (!email || typeof email !== 'string') return ''
    
    let sanitized = email.trim().toLowerCase()
    sanitized = sanitized.replace(/[<>'"]/g, '')
    sanitized = sanitized.substring(0, 255)
    
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(sanitized)) {
      console.warn('Invalid email format after sanitization:', sanitized)
      return ''
    }
    
    return sanitized
  }

  private sanitizeNameField(name: string): string {
    if (!name || typeof name !== 'string') return ''
    
    let sanitized = name.trim()
    sanitized = this.removeDangerousPatterns(sanitized)
    sanitized = this.stripHtmlTags(sanitized)
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
    sanitized = sanitized.substring(0, 100)
    sanitized = sanitized.replace(/[^a-zA-Z\s\-'.]/g, '')
    
    return sanitized
  }

  private sanitizeMessageField(message: string): string {
    if (!message || typeof message !== 'string') return ''
    
    let sanitized = message.trim()
    sanitized = this.removeDangerousPatterns(sanitized)
    sanitized = this.stripHtmlTags(sanitized)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n')
    sanitized = sanitized.substring(0, 2000)
    
    return sanitized
  }

  private sanitizeUrlField(url: string): string {
    if (!url || typeof url !== 'string') return ''
    
    let sanitized = url.trim()
    sanitized = this.removeDangerousPatterns(sanitized)
    
    if (!sanitized.match(/^https?:\/\//i)) {
      console.warn('Invalid URL protocol:', sanitized)
      return ''
    }
    
    try {
      const urlObj = new URL(sanitized)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        console.warn('Disallowed URL protocol:', urlObj.protocol)
        return ''
      }
      return urlObj.toString()
    } catch (error) {
      console.warn('Invalid URL format:', sanitized)
      return ''
    }
  }

  private sanitizeDateField(date: string): string {
    if (!date || typeof date !== 'string') return ''
    
    let sanitized = date.trim()
    sanitized = this.removeDangerousPatterns(sanitized)
    sanitized = this.stripHtmlTags(sanitized)
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')
    
    const dateObj = new Date(sanitized)
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date format:', sanitized)
      return ''
    }
    
    return sanitized
  }

  private sanitizeNumberField(num: number): number {
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) return 0
    
    const MAX_SAFE_NUMBER = Number.MAX_SAFE_INTEGER
    const MIN_SAFE_NUMBER = Number.MIN_SAFE_INTEGER
    
    if (num > MAX_SAFE_NUMBER) return MAX_SAFE_NUMBER
    if (num < MIN_SAFE_NUMBER) return MIN_SAFE_NUMBER
    
    return num
  }

  private sanitizeGenericField(str: string): string {
    if (!str || typeof str !== 'string') return ''
    
    let sanitized = str.trim()
    sanitized = this.removeDangerousPatterns(sanitized)
    sanitized = this.stripHtmlTags(sanitized)
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')
    sanitized = sanitized.replace(/\s+/g, ' ').trim()
    sanitized = sanitized.substring(0, 1000)
    
    return sanitized
  }

  private removeDangerousPatterns(input: string): string {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /on\w+\s*=/gi
    ]
    
    let sanitized = input
    for (const pattern of dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '')
    }
    
    return sanitized
  }

  private stripHtmlTags(input: string): string {
    return input.replace(/<[^>]*>/g, '')
  }

  private sanitizeSubject(subject: string): string {
    // Remove potentially dangerous characters from subject
    return subject
      .replace(/[\r\n]/g, ' ')  // Replace line breaks with spaces
      .replace(/\0/g, '')       // Remove null bytes
      .trim()
  }

  private async generateEmailContent(type: string, data: Record<string, any>) {
    switch (type) {
      case 'invitation_confirmation':
        return await this.generateInvitationConfirmation(data)
      case 'invitation_approved':
        return await this.generateInvitationApproved(data)
      case 'invitation_expired':
        return await this.generateInvitationExpired(data)
      case 'invitation_invalid':
        return await this.generateInvitationInvalid(data)
      case 'invitation_used':
        return await this.generateInvitationUsed(data)
      case 'custom':
        return this.generateCustomEmail(data)
      default:
        return null
    }
  }

  private async generateInvitationConfirmation(data: Record<string, any>) {
    // Always use basic template for now to avoid React rendering issues
    return this.generateBasicInvitationConfirmation(data)
  }

  private generateBasicInvitationConfirmation(data: Record<string, any>) {
    const { parentName, childName, submissionDate } = data
    
    const subject = 'Invitation Request Received - Kids News Platform'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Request Received</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Invitation Request Received!</h1>
            </div>
            <div class="content">
              <p>Hi ${parentName || 'there'},</p>
              
              <p>Thank you for requesting an invitation for <strong>${childName || 'your child'}</strong> to join our Kids News Platform!</p>
              
              <p>We've received your request submitted on <strong>${submissionDate || 'today'}</strong> and our team will review it shortly.</p>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Our team will review your invitation request</li>
                <li>You'll receive an email with an invitation link once approved</li>
                <li>The invitation link will be valid for 7 days</li>
                <li>Use the link to activate the author account</li>
              </ul>
              
              <p>We're excited to have ${childName || 'your child'} potentially join our community of young writers and readers!</p>
              
              <p>Best regards,<br>The Kids News Platform Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      Invitation Request Received!
      
      Hi ${parentName || 'there'},
      
      Thank you for requesting an invitation for ${childName || 'your child'} to join our Kids News Platform!
      
      We've received your request submitted on ${submissionDate || 'today'} and our team will review it shortly.
      
      What happens next?
      - Our team will review your invitation request
      - You'll receive an email with an invitation link once approved
      - The invitation link will be valid for 7 days
      - Use the link to activate the author account
      
      We're excited to have ${childName || 'your child'} potentially join our community of young writers and readers!
      
      Best regards,
      The Kids News Platform Team
      
      This is an automated message. Please do not reply to this email.
    `
    
    return { subject, html, text }
  }

  private async generateInvitationApproved(data: Record<string, any>) {
    // Always use basic template for now to avoid React rendering issues
    return this.generateBasicInvitationApproved(data)
  }

  private generateBasicInvitationApproved(data: Record<string, any>) {
    const { parentName, childName, activationUrl, expirationDate } = data
    
    const subject = '🎉 Invitation Approved - Welcome to Kids News Platform!'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Approved</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Invitation Approved!</h1>
            </div>
            <div class="content">
              <p>Hi ${parentName || 'there'},</p>
              
              <p>Great news! Your invitation request for <strong>${childName || 'your child'}</strong> has been approved!</p>
              
              <p>Click the button below to activate the author account and start creating amazing content:</p>
              
              <div style="text-align: center;">
                <a href="${activationUrl || '#'}" class="button">Activate Author Account</a>
              </div>
              
              <div class="warning">
                <strong>⏰ Important:</strong> This invitation link expires on <strong>${expirationDate || '7 days from now'}</strong>. Please activate the account before then.
              </div>
              
              <p><strong>What you can do once activated:</strong></p>
              <ul>
                <li>Create and publish articles across different categories</li>
                <li>Engage with the community through comments</li>
                <li>Earn tokens for participation and engagement</li>
                <li>Access the author dashboard and tools</li>
              </ul>
              
              <p>We're thrilled to welcome ${childName || 'your child'} to our community of young writers!</p>
              
              <p>Best regards,<br>The Kids News Platform Team</p>
            </div>
            <div class="footer">
              <p>If you're having trouble with the button above, copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">${activationUrl || ''}</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      Invitation Approved!
      
      Hi ${parentName || 'there'},
      
      Great news! Your invitation request for ${childName || 'your child'} has been approved!
      
      Activate your author account by visiting: ${activationUrl || ''}
      
      IMPORTANT: This invitation link expires on ${expirationDate || '7 days from now'}. Please activate the account before then.
      
      What happens next?
      - Create and publish articles across different categories
      - Engage with the community through comments
      - Earn tokens for participation and engagement
      - Access the author dashboard and tools
      
      We're thrilled to welcome ${childName || 'your child'} to our community of young writers!
      
      Best regards,
      The Kids News Platform Team
      
      If you're having trouble with the link, copy and paste this URL into your browser: ${activationUrl || ''}
    `
    
    return { subject, html, text }
  }

  private async generateInvitationExpired(data: Record<string, any>) {
    // Always use basic template for now to avoid React rendering issues
    return this.generateBasicInvitationExpired(data)
  }

  private generateBasicInvitationExpired(data: Record<string, any>) {
    const { parentName, childName, expirationDate, supportEmail } = data
    
    const subject = '⏰ Invitation Link Expired - Kids News Platform'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Link Expired</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .error-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .button { display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Invitation Link Expired</h1>
            </div>
            <div class="content">
              <p>Hi ${parentName || 'there'},</p>
              
              <p>We noticed that you tried to use an invitation link for <strong>${childName || 'your child'}</strong>, but unfortunately it has expired.</p>
              
              <div class="error-box">
                <strong>Expired:</strong> This invitation link expired on <strong>${expirationDate || 'recently'}</strong>
              </div>
              
              <p><strong>What you can do:</strong></p>
              <ul>
                <li>Contact our support team to request a new invitation link</li>
                <li>Submit a new invitation request through our website</li>
                <li>Check if you have any other invitation emails in your inbox</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="mailto:${supportEmail || 'support@kidsnews.com'}" class="button">Contact Support</a>
              </div>
              
              <p>We apologize for any inconvenience. Our team is here to help get ${childName || 'your child'} set up as an author on our platform.</p>
              
              <p>Best regards,<br>The Kids News Platform Team</p>
            </div>
            <div class="footer">
              <p>Need help? Contact us at ${supportEmail || 'support@kidsnews.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      Invitation Link Expired
      
      Hi ${parentName || 'there'},
      
      We noticed that you tried to use an invitation link for ${childName || 'your child'}, but unfortunately it has expired.
      
      Expired: This invitation link expired on ${expirationDate || 'recently'}
      
      What you can do:
      - Contact our support team to request a new invitation link
      - Submit a new invitation request through our website
      - Check if you have any other invitation emails in your inbox
      
      Contact Support: ${supportEmail || 'support@kidsnews.com'}
      
      We apologize for any inconvenience. Our team is here to help get ${childName || 'your child'} set up as an author on our platform.
      
      Best regards,
      The Kids News Platform Team
    `
    
    return { subject, html, text }
  }

  private async generateInvitationInvalid(data: Record<string, any>) {
    try {
      const { InvitationInvalidEmail } = await import('./_templates/invitation-invalid.tsx')
      const { ReactEmailRenderer } = await import('./react-email-renderer.ts')
      
      const subject = '❌ Invalid Invitation Link - Kids News Platform'
      
      const emailComponent = InvitationInvalidEmail({
        parentName: data.parentName,
        childName: data.childName,
        supportEmail: data.supportEmail,
        requestUrl: data.requestUrl
      })
      
      const html = await ReactEmailRenderer.renderToHtml(emailComponent)
      const text = await ReactEmailRenderer.renderToText(emailComponent)
      
      return { subject, html, text }
    } catch (error) {
      console.error('Error generating invitation invalid email:', error)
      return this.generateBasicInvitationInvalid(data)
    }
  }

  private generateBasicInvitationInvalid(data: Record<string, any>) {
    const { parentName, childName, supportEmail, requestUrl } = data
    
    const subject = '❌ Invalid Invitation Link - Kids News Platform'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Invitation Link</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .error-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .button { display: inline-block; background: #007bff; color: white; padding: 15px 25px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold; }
            .button.success { background: #28a745; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Invalid Invitation Link</h1>
            </div>
            <div class="content">
              <p>Hi ${parentName || 'there'},</p>
              
              <p>We noticed that you tried to use an invitation link, but unfortunately it appears to be invalid or corrupted.</p>
              
              <div class="error-box">
                <strong>Invalid Link:</strong> The invitation link you clicked is not valid or may have been corrupted.
              </div>
              
              <p><strong>This could happen if:</strong></p>
              <ul>
                <li>The link was copied incorrectly or is incomplete</li>
                <li>The email was forwarded and the link got broken</li>
                <li>The invitation was already used or cancelled</li>
                <li>There was a technical issue with the link generation</li>
              </ul>
              
              <p><strong>What you can do:</strong></p>
              <ul>
                <li>Check your email for the original invitation message</li>
                <li>Try copying the full link from the email again</li>
                <li>Contact our support team for assistance</li>
                <li>Submit a new invitation request if needed</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="mailto:${supportEmail || 'support@kidsnews.com'}" class="button">Contact Support</a>
                <a href="${requestUrl || '#'}" class="button success">Request New Invitation</a>
              </div>
              
              <p>We're here to help get ${childName || 'your child'} set up as an author on our platform. Don't hesitate to reach out!</p>
              
              <p>Best regards,<br>The Kids News Platform Team</p>
            </div>
            <div class="footer">
              <p>Need help? Contact us at ${supportEmail || 'support@kidsnews.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      Invalid Invitation Link
      
      Hi ${parentName || 'there'},
      
      We noticed that you tried to use an invitation link, but unfortunately it appears to be invalid or corrupted.
      
      Invalid Link: The invitation link you clicked is not valid or may have been corrupted.
      
      This could happen if:
      - The link was copied incorrectly or is incomplete
      - The email was forwarded and the link got broken
      - The invitation was already used or cancelled
      - There was a technical issue with the link generation
      
      What you can do:
      - Check your email for the original invitation message
      - Try copying the full link from the email again
      - Contact our support team for assistance
      - Submit a new invitation request if needed
      
      Contact Support: ${supportEmail || 'support@kidsnews.com'}
      Request New Invitation: ${requestUrl || ''}
      
      We're here to help get ${childName || 'your child'} set up as an author on our platform. Don't hesitate to reach out!
      
      Best regards,
      The Kids News Platform Team
    `
    
    return { subject, html, text }
  }

  private async generateInvitationUsed(data: Record<string, any>) {
    try {
      const { InvitationUsedEmail } = await import('./_templates/invitation-used.tsx')
      const { ReactEmailRenderer } = await import('./react-email-renderer.ts')
      
      const subject = '✅ Invitation Already Used - Kids News Platform'
      
      const emailComponent = InvitationUsedEmail({
        parentName: data.parentName,
        childName: data.childName,
        usedDate: data.usedDate,
        dashboardUrl: data.dashboardUrl,
        supportEmail: data.supportEmail
      })
      
      const html = await ReactEmailRenderer.renderToHtml(emailComponent)
      const text = await ReactEmailRenderer.renderToText(emailComponent)
      
      return { subject, html, text }
    } catch (error) {
      console.error('Error generating invitation used email:', error)
      return this.generateBasicInvitationUsed(data)
    }
  }

  private generateBasicInvitationUsed(data: Record<string, any>) {
    const { parentName, childName, usedDate, dashboardUrl, supportEmail } = data
    
    const subject = '✅ Invitation Already Used - Kids News Platform'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Already Used</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold; }
            .button.support { background: #007bff; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Invitation Already Used</h1>
            </div>
            <div class="content">
              <p>Hi ${parentName || 'there'},</p>
              
              <p>We noticed that you tried to use an invitation link for <strong>${childName || 'your child'}</strong>, but this invitation has already been activated.</p>
              
              <div class="success-box">
                <strong>Good News:</strong> This invitation was successfully used on <strong>${usedDate || 'recently'}</strong>
              </div>
              
              <p><strong>What this means:</strong></p>
              <ul>
                <li>${childName || 'Your child'}'s author account is already active</li>
                <li>They can log in and start creating content</li>
                <li>All author features and tools are available</li>
                <li>They can earn tokens for engagement and participation</li>
              </ul>
              
              <p><strong>Next steps:</strong></p>
              <ul>
                <li>Log in to access the author dashboard</li>
                <li>Start creating your first article</li>
                <li>Explore the different content categories</li>
                <li>Join the community discussions</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl || '#'}" class="button">Go to Dashboard</a>
              </div>
              
              <p>If you're having trouble accessing the account or if this wasn't you who activated it, please contact our support team immediately.</p>
              
              <div style="text-align: center;">
                <a href="mailto:${supportEmail || 'support@kidsnews.com'}" class="button support">Contact Support</a>
              </div>
              
              <p>Welcome to the Kids News Platform community!</p>
              
              <p>Best regards,<br>The Kids News Platform Team</p>
            </div>
            <div class="footer">
              <p>Need help? Contact us at ${supportEmail || 'support@kidsnews.com'}</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      Invitation Already Used
      
      Hi ${parentName || 'there'},
      
      We noticed that you tried to use an invitation link for ${childName || 'your child'}, but this invitation has already been activated.
      
      Good News: This invitation was successfully used on ${usedDate || 'recently'}
      
      What this means:
      - ${childName || 'Your child'}'s author account is already active
      - They can log in and start creating content
      - All author features and tools are available
      - They can earn tokens for engagement and participation
      
      Next steps:
      - Log in to access the author dashboard
      - Start creating your first article
      - Explore the different content categories
      - Join the community discussions
      
      Go to Dashboard: ${dashboardUrl || ''}
      
      If you're having trouble accessing the account or if this wasn't you who activated it, please contact our support team immediately.
      
      Contact Support: ${supportEmail || 'support@kidsnews.com'}
      
      Welcome to the Kids News Platform community!
      
      Best regards,
      The Kids News Platform Team
    `
    
    return { subject, html, text }
  }

  private generateCustomEmail(data: Record<string, any>) {
    const { subject, html, text } = data
    
    if (!subject || !html) {
      throw new Error('Custom email requires subject and html fields')
    }
    
    return { subject, html, text }
  }

  private async callResendAPI(endpoint: string, data: any): Promise<Response> {
    const { RetryHandler, EmailErrorHandler } = await import('./error-handler.ts')
    
    const operation = async (): Promise<Response> => {
      const url = `${this.baseUrl}${endpoint}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      // If response is not ok, parse error and throw
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const emailError = EmailErrorHandler.handleResendError(response, errorData)
        throw emailError
      }

      return response
    }

    const isRetryable = (error: any): boolean => {
      return error.retryable === true
    }

    try {
      return await RetryHandler.withRetry(operation, isRetryable)
    } catch (error) {
      // If it's already an EmailError, re-throw it
      if (error.code) {
        throw error
      }
      
      // Handle network errors
      const emailError = EmailErrorHandler.handleNetworkError(error)
      throw emailError
    }
  }
}