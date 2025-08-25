import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

interface TokenRequest {
  invitationId: string
  email: string
  expirationHours?: number
}

interface TokenResponse {
  success: boolean
  token?: string
  expiresAt?: string
  error?: string
  code?: string
  retryable?: boolean
}

// Token generation function integrated from invitation-tokens
async function generateInvitationToken(request: TokenRequest): Promise<TokenResponse> {
  try {
    console.log('🔐 Starting token generation for invitation:', request.invitationId)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { invitationId, email, expirationHours = 168 } = request

    // Enhanced input validation
    if (!invitationId || typeof invitationId !== 'string') {
      return {
        success: false,
        error: 'Valid invitation ID is required',
        code: 'MISSING_INVITATION_ID'
      }
    }

    if (!email || typeof email !== 'string') {
      return {
        success: false,
        error: 'Valid email address is required',
        code: 'MISSING_EMAIL'
      }
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(email.trim())) {
      return {
        success: false,
        error: 'Invalid email address format',
        code: 'INVALID_EMAIL_FORMAT'
      }
    }

    // Check if invitation exists and is approved
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitation_requests')
      .select('id, status, parent_email')
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      console.error('❌ Invitation not found:', invitationId, invitationError)
      return {
        success: false,
        error: 'Invitation not found',
        code: 'INVITATION_NOT_FOUND'
      }
    }

    if (invitation.status !== 'approved') {
      return {
        success: false,
        error: 'Invitation must be approved before generating token',
        code: 'INVITATION_NOT_APPROVED'
      }
    }

    // Verify email matches invitation
    if (invitation.parent_email.toLowerCase() !== email.toLowerCase()) {
      return {
        success: false,
        error: 'Email does not match invitation',
        code: 'EMAIL_MISMATCH'
      }
    }

    // Check for existing active tokens
    const now = new Date().toISOString()
    const { data: existingTokens, error: tokenCheckError } = await supabaseClient
      .from('invitation_tokens')
      .select('id')
      .eq('invitation_request_id', invitationId)
      .is('used_at', null)
      .gt('expires_at', now)

    if (tokenCheckError) {
      console.error('❌ Error checking existing tokens:', tokenCheckError)
      return {
        success: false,
        error: 'Database error checking existing tokens',
        code: 'DATABASE_ERROR',
        retryable: true
      }
    }

    if (existingTokens && existingTokens.length > 0) {
      console.log('⚠️ Active token already exists for invitation:', invitationId)
      return {
        success: false,
        error: 'Active token already exists for this invitation',
        code: 'TOKEN_ALREADY_EXISTS'
      }
    }

    // Generate cryptographically secure token
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('')

    // Hash token for database storage
    const encoder = new TextEncoder()
    const tokenData = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const tokenHash = Array.from(new Uint8Array(hashBuffer), byte => 
      byte.toString(16).padStart(2, '0')
    ).join('')

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expirationHours)

    // Store hashed token in database with retry logic
    let attempts = 0
    const maxAttempts = 3
    let insertResult

    while (attempts < maxAttempts) {
      const { data, error } = await supabaseClient
        .from('invitation_tokens')
        .insert({
          invitation_request_id: invitationId,
          token_hash: tokenHash,
          email: email.toLowerCase().trim(),
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (!error) {
        insertResult = { data, error: null }
        break
      }

      attempts++
      if (attempts === maxAttempts) {
        console.error('❌ Database error after retries:', error)
        return {
          success: false,
          error: 'Failed to store token in database',
          code: 'DATABASE_INSERT_FAILED',
          retryable: true
        }
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
    }

    console.log('✅ Token stored successfully with ID:', insertResult.data.id)

    return {
      success: true,
      token,
      expiresAt: expiresAt.toISOString()
    }

  } catch (error) {
    console.error('💥 Token generation error:', error)
    
    // Determine error type
    let errorCode = 'UNKNOWN_ERROR'
    let retryable = true
    
    if (error.name === 'TypeError') {
      errorCode = 'TYPE_ERROR'
      retryable = false
    } else if (error.message?.includes('crypto')) {
      errorCode = 'CRYPTO_ERROR'
      retryable = false
    }

    return {
      success: false,
      error: 'Internal server error during token generation',
      code: errorCode,
      retryable: retryable
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)

  try {
    // Health check endpoint
    if (req.method === 'GET' && url.pathname.endsWith('/health')) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      const health = {
        status: resendApiKey ? 'healthy' : 'unhealthy',
        checks: {
          resendApiKey: !!resendApiKey,
          defaultFromEmail: !!Deno.env.get('RESEND_FROM_EMAIL')
        }
      }
      return new Response(
        JSON.stringify(health),
        { 
          status: health.status === 'healthy' ? 200 : 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Test connection endpoint
    if (req.method === 'GET' && url.pathname.endsWith('/test')) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (!resendApiKey) {
        return new Response(JSON.stringify({ connected: false }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      try {
        const response = await fetch('https://api.resend.com/domains', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          }
        })
        return new Response(JSON.stringify({ connected: response.ok }), {
          status: response.ok ? 200 : 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      } catch {
        return new Response(JSON.stringify({ connected: false }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Verify request method for email sending
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    let emailRequest: EmailRequest
    try {
      emailRequest = await req.json()
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Email service configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('📧 Processing email request:', {
      type: emailRequest.type,
      to: emailRequest.to,
      hasTemplateData: !!emailRequest.templateData
    })

    // Validate request
    if (!emailRequest.to || !emailRequest.type || !emailRequest.templateData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, type, templateData' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle invitation_approved type with token generation
    if (emailRequest.type === 'invitation_approved') {
      console.log('🔐 Processing invitation_approved email with token generation')
      
      // Validate required fields for invitation approval
      if (!emailRequest.templateData.invitationId) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: invitationId for invitation_approved email' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      try {
        // Generate invitation token
        const tokenResult = await generateInvitationToken({
          invitationId: emailRequest.templateData.invitationId,
          email: emailRequest.to,
          expirationHours: 168 // 7 days
        })

        if (!tokenResult.success) {
          console.error('❌ Token generation failed:', tokenResult.error)
          return new Response(
            JSON.stringify({ 
              error: `Token generation failed: ${tokenResult.error}`,
              code: tokenResult.code,
              retryable: tokenResult.retryable 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('✅ Token generated successfully for invitation:', emailRequest.templateData.invitationId)

        // Add token data to template data
        const baseUrl = Deno.env.get('SITE_BASE_URL') || 'https://theflyingbus.org'
        const activationUrl = `${baseUrl}/invitation/activate?token=${tokenResult.token}`
        const expirationDate = new Date(tokenResult.expiresAt).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        // Update template data with token information
        emailRequest.templateData = {
          ...emailRequest.templateData,
          activationUrl,
          expirationDate,
          invitationToken: tokenResult.token
        }

        console.log('🔗 Generated activation URL:', activationUrl)

      } catch (tokenError) {
        console.error('💥 Token generation error:', tokenError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to generate invitation token',
            details: tokenError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Generate email content based on type
    let emailContent
    if (emailRequest.type === 'custom') {
      if (!emailRequest.templateData.subject || !emailRequest.templateData.html) {
        return new Response(
          JSON.stringify({ error: 'Custom email requires subject and html' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      emailContent = {
        subject: emailRequest.templateData.subject,
        html: emailRequest.templateData.html,
        text: emailRequest.templateData.text || emailRequest.templateData.html.replace(/<[^>]*>/g, '')
      }
    } else {
      // Import simplified email service for template generation
      const { SimpleEmailService } = await import('./simple-email-service.ts')
      const emailService = new SimpleEmailService(resendApiKey)
      const templateResult = emailService.generateEmailContent(emailRequest.type, emailRequest.templateData)
      
      if (!templateResult) {
        return new Response(
          JSON.stringify({ error: `Unknown email template: ${emailRequest.type}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      emailContent = templateResult
    }

    console.log('📧 Generated email content:', {
      subject: emailContent.subject,
      htmlLength: emailContent.html.length,
      textLength: emailContent.text?.length || 0
    })

    // Prepare Resend request (using exact same format as working debug function)
    const resendRequest = {
      from: emailRequest.from || 'admin@theflyingbus.org',
      to: [emailRequest.to],
      subject: emailContent.subject,
      html: emailContent.html
    }

    // Add text if available
    if (emailContent.text) {
      resendRequest.text = emailContent.text
    }

    console.log('📧 Sending email via Resend API:', {
      from: resendRequest.from,
      to: resendRequest.to,
      subject: resendRequest.subject
    })

    // Make direct API call to Resend (exact same as working debug function)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resendRequest)
    })

    console.log('📧 Resend API response status:', response.status)

    if (response.ok) {
      const apiResult = await response.json()
      console.log('✅ Email sent successfully:', apiResult.id)
      
      return new Response(
        JSON.stringify({
          success: true,
          messageId: apiResult.id
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      const responseText = await response.text()
      console.error('❌ Resend API error:', response.status, responseText)
      
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { message: responseText }
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorData.message || `API error: ${response.status}`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('💥 Unhandled error in email service:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})