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
}

interface ResendEmailRequest {
  from: string
  to: string[]
  subject: string
  html: string
  text?: string
}

export class SimpleEmailService {
  private apiKey: string
  private baseUrl = 'https://api.resend.com'
  private defaultFrom: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.defaultFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'admin@theflyingbus.org'
  }

  async sendEmail(request: EmailRequest): Promise<EmailResponse> {
    try {
      // Validate email request
      const validationError = this.validateEmailRequest(request)
      if (validationError) {
        return {
          success: false,
          error: validationError
        }
      }

      // Generate email content
      const emailContent = this.generateEmailContent(request.type, request.templateData)
      if (!emailContent) {
        return {
          success: false,
          error: `Unknown email template: ${request.type}`
        }
      }

      // Prepare Resend request
      const resendRequest: ResendEmailRequest = {
        from: request.from || this.defaultFrom,
        to: [request.to],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      }

      // Send email via Resend API
      console.log('Making API call to Resend with:', {
        url: `${this.baseUrl}/emails`,
        apiKeyPrefix: this.apiKey.substring(0, 10),
        requestBody: resendRequest
      })

      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resendRequest)
      })

      console.log('Resend API response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Email sent successfully:', result.id)
        return {
          success: true,
          messageId: result.id
        }
      } else {
        const responseText = await response.text()
        console.error('Resend API error:', response.status, responseText)
        
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { message: responseText }
        }
        
        return {
          success: false,
          error: errorData.message || `API error: ${response.status}`
        }
      }

    } catch (error) {
      console.error('Email service error:', error)
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      }
    }
  }

  private validateEmailRequest(request: EmailRequest): string | null {
    if (!request.to) {
      return 'Missing required field: to'
    }

    if (!request.type) {
      return 'Missing required field: type'
    }

    if (!request.templateData || typeof request.templateData !== 'object') {
      return 'Missing or invalid template data'
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(request.to)) {
      return 'Invalid email address format'
    }

    // Validate template data based on type
    switch (request.type) {
      case 'invitation_approved':
        if (!request.templateData.activationUrl) {
          return 'Missing required activation URL for invitation approved email'
        }
        break
      case 'custom':
        if (!request.templateData.subject || !request.templateData.html) {
          return 'Custom email requires subject and html in template data'
        }
        break
    }

    return null
  }

  generateEmailContent(type: string, data: Record<string, any>) {
    switch (type) {
      case 'invitation_confirmation':
        return this.generateInvitationConfirmation(data)
      case 'invitation_approved':
        return this.generateInvitationApproved(data)
      case 'invitation_expired':
        return this.generateInvitationExpired(data)
      case 'invitation_invalid':
        return this.generateInvitationInvalid(data)
      case 'invitation_used':
        return this.generateInvitationUsed(data)
      case 'custom':
        return this.generateCustomEmail(data)
      default:
        return null
    }
  }

  private generateInvitationConfirmation(data: Record<string, any>) {
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            h1 { margin: 0; font-size: 24px; }
            p { margin: 16px 0; }
            ul { margin: 16px 0; padding-left: 20px; }
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

  private generateInvitationApproved(data: Record<string, any>) {
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            h1 { margin: 0; font-size: 24px; }
            p { margin: 16px 0; }
            ul { margin: 16px 0; padding-left: 20px; }
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
      
      What you can do once activated:
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

  private generateInvitationExpired(data: Record<string, any>) {
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .error-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            h1 { margin: 0; font-size: 24px; }
            p { margin: 16px 0; }
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
              
              <p>Don't worry! You can request a new invitation by contacting our support team at <strong>${supportEmail || 'support@theflyingbus.org'}</strong>.</p>
              
              <p>We apologize for any inconvenience and look forward to welcoming ${childName || 'your child'} to our platform!</p>
              
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
      Invitation Link Expired
      
      Hi ${parentName || 'there'},
      
      We noticed that you tried to use an invitation link for ${childName || 'your child'}, but unfortunately it has expired.
      
      Expired: This invitation link expired on ${expirationDate || 'recently'}
      
      Don't worry! You can request a new invitation by contacting our support team at ${supportEmail || 'support@theflyingbus.org'}.
      
      We apologize for any inconvenience and look forward to welcoming ${childName || 'your child'} to our platform!
      
      Best regards,
      The Kids News Platform Team
      
      This is an automated message. Please do not reply to this email.
    `
    
    return { subject, html, text }
  }

  private generateInvitationInvalid(data: Record<string, any>) {
    const { parentName, childName, supportEmail } = data
    
    const subject = '❌ Invalid Invitation Link - Kids News Platform'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Invitation Link</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .error-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            h1 { margin: 0; font-size: 24px; }
            p { margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Invalid Invitation Link</h1>
            </div>
            <div class="content">
              <p>Hi ${parentName || 'there'},</p>
              
              <p>We noticed that you tried to use an invitation link for <strong>${childName || 'your child'}</strong>, but the link appears to be invalid.</p>
              
              <div class="error-box">
                <strong>Invalid Link:</strong> The invitation link you used is not valid or may have been corrupted.
              </div>
              
              <p>Please contact our support team at <strong>${supportEmail || 'support@theflyingbus.org'}</strong> for assistance with a new invitation.</p>
              
              <p>We apologize for any inconvenience and look forward to helping you get ${childName || 'your child'} set up on our platform!</p>
              
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
      Invalid Invitation Link
      
      Hi ${parentName || 'there'},
      
      We noticed that you tried to use an invitation link for ${childName || 'your child'}, but the link appears to be invalid.
      
      Invalid Link: The invitation link you used is not valid or may have been corrupted.
      
      Please contact our support team at ${supportEmail || 'support@theflyingbus.org'} for assistance with a new invitation.
      
      We apologize for any inconvenience and look forward to helping you get ${childName || 'your child'} set up on our platform!
      
      Best regards,
      The Kids News Platform Team
      
      This is an automated message. Please do not reply to this email.
    `
    
    return { subject, html, text }
  }

  private generateInvitationUsed(data: Record<string, any>) {
    const { parentName, childName, supportEmail } = data
    
    const subject = '✅ Invitation Already Used - Kids News Platform'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Already Used</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            h1 { margin: 0; font-size: 24px; }
            p { margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Invitation Already Used</h1>
            </div>
            <div class="content">
              <p>Hi ${parentName || 'there'},</p>
              
              <p>We noticed that you tried to use an invitation link for <strong>${childName || 'your child'}</strong>, but this invitation has already been used to create an account.</p>
              
              <div class="info-box">
                <strong>Already Activated:</strong> This invitation link has been successfully used and the account is already active.
              </div>
              
              <p>If you're having trouble accessing the account, please contact our support team at <strong>${supportEmail || 'support@theflyingbus.org'}</strong> for assistance.</p>
              
              <p>Welcome to the Kids News Platform community!</p>
              
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
      Invitation Already Used
      
      Hi ${parentName || 'there'},
      
      We noticed that you tried to use an invitation link for ${childName || 'your child'}, but this invitation has already been used to create an account.
      
      Already Activated: This invitation link has been successfully used and the account is already active.
      
      If you're having trouble accessing the account, please contact our support team at ${supportEmail || 'support@theflyingbus.org'} for assistance.
      
      Welcome to the Kids News Platform community!
      
      Best regards,
      The Kids News Platform Team
      
      This is an automated message. Please do not reply to this email.
    `
    
    return { subject, html, text }
  }

  private generateCustomEmail(data: Record<string, any>) {
    return {
      subject: data.subject,
      html: data.html,
      text: data.text || data.html.replace(/<[^>]*>/g, '')
    }
  }
}