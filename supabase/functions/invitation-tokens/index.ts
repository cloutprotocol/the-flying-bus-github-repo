import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

console.log('🚀 Invitation tokens function starting...')

// Audit logging helper
async function logAuditEvent(
  supabaseClient: any,
  action: string,
  resourceId: string,
  email: string,
  success: boolean,
  error?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabaseClient
      .from('audit_logs')
      .insert({
        action,
        resource_type: 'invitation_token',
        resource_id: resourceId,
        user_email: email,
        success,
        error_message: error,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      })
  } catch (auditError) {
    console.error('Failed to log audit event:', auditError)
    // Don't throw - audit logging shouldn't break the main operation
  }
}

interface TokenRequest {
  invitationId: string;
  email: string;
  expirationHours?: number;
}

interface TokenValidation {
  token: string;
  email?: string;
}

interface TokenResponse {
  success: boolean;
  token?: string;
  invitationData?: any;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const { method } = req
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (method) {
      case 'POST':
        if (action === 'generate') {
          return await generateToken(req, supabaseClient)
        } else if (action === 'validate') {
          return await validateToken(req, supabaseClient)
        } else if (action === 'cleanup') {
          return await cleanupExpiredTokens(supabaseClient)
        } else if (action === 'markUsed') {
          return await markTokenAsUsed(req, supabaseClient)
        }
        break
      
      case 'GET':
        if (action === 'validate') {
          return await validateTokenFromQuery(url, supabaseClient)
        }
        break
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action or method' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Token management error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function generateToken(req: Request, supabaseClient: any): Promise<Response> {
  try {
    let requestData: TokenRequest
    
    // Parse and validate request body
    try {
      requestData = await req.json()
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { invitationId, email, expirationHours = 168 } = requestData

    // Enhanced input validation
    if (!invitationId || typeof invitationId !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Valid invitation ID is required',
          code: 'MISSING_INVITATION_ID'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Valid email address is required',
          code: 'MISSING_EMAIL'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email address format',
          code: 'INVALID_EMAIL_FORMAT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate expiration hours
    if (typeof expirationHours !== 'number' || expirationHours < 1 || expirationHours > 8760) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Expiration hours must be between 1 and 8760',
          code: 'INVALID_EXPIRATION'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if invitation exists and is approved
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('invitation_requests')
      .select('id, status, parent_email')
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invitation not found',
          code: 'INVITATION_NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (invitation.status !== 'approved') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invitation must be approved before generating token',
          code: 'INVITATION_NOT_APPROVED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify email matches invitation
    if (invitation.parent_email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email does not match invitation',
          code: 'EMAIL_MISMATCH'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
      console.error('Error checking existing tokens:', tokenCheckError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database error checking existing tokens',
          code: 'DATABASE_ERROR',
          retryable: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingTokens && existingTokens.length > 0) {
      await logAuditEvent(
        supabaseClient,
        'token_generate',
        invitationId,
        email,
        false,
        'Active token already exists for this invitation'
      )
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Active token already exists for this invitation',
          code: 'TOKEN_ALREADY_EXISTS'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
        console.error('Database error after retries:', error)
        
        await logAuditEvent(
          supabaseClient,
          'token_generate',
          invitationId,
          email,
          false,
          'Failed to store token in database',
          { attempts: maxAttempts, error: error.message }
        )
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to store token in database',
            code: 'DATABASE_INSERT_FAILED',
            retryable: true,
            details: { attempts: maxAttempts }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
    }

    // Log successful token generation
    await logAuditEvent(
      supabaseClient,
      'token_generate',
      invitationId,
      email,
      true,
      undefined,
      { 
        token_id: insertResult.data.id,
        expires_at: expiresAt.toISOString(),
        expiration_hours: expirationHours
      }
    )

    return new Response(
      JSON.stringify({ 
        success: true, 
        token,
        expiresAt: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Token generation error:', error)
    
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

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error during token generation',
        code: errorCode,
        retryable: retryable
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function validateToken(req: Request, supabaseClient: any): Promise<Response> {
  try {
    const { token, email }: TokenValidation = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return await performTokenValidation(token, email, supabaseClient)

  } catch (error) {
    console.error('Token validation error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to validate token' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function validateTokenFromQuery(url: URL, supabaseClient: any): Promise<Response> {
  try {
    const token = url.searchParams.get('token')
    const email = url.searchParams.get('email')

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return await performTokenValidation(token, email, supabaseClient)

  } catch (error) {
    console.error('Token validation error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to validate token' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function performTokenValidation(token: string, email: string | null, supabaseClient: any): Promise<Response> {
  try {
    // Enhanced token format validation
    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token is required',
          code: 'MISSING_TOKEN'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const trimmedToken = token.trim()
    
    // Validate token format (64 hex characters)
    const tokenRegex = /^[a-f0-9]{64}$/i
    if (!tokenRegex.test(trimmedToken)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid token format',
          code: 'INVALID_TOKEN_FORMAT'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      if (!emailRegex.test(email.trim())) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid email format',
            code: 'INVALID_EMAIL_FORMAT'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Hash the provided token
    const encoder = new TextEncoder()
    const tokenData = encoder.encode(trimmedToken)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const tokenHash = Array.from(new Uint8Array(hashBuffer), byte => 
      byte.toString(16).padStart(2, '0')
    ).join('')

    // Query for the token with invitation data and retry logic
    let tokenResult
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      let query = supabaseClient
        .from('invitation_tokens')
        .select(`
          *,
          invitation_requests (
            id,
            parent_name,
            child_name,
            parent_email,
            message,
            status,
            created_at
          )
        `)
        .eq('token_hash', tokenHash)
        .is('used_at', null)

      // Add email filter if provided for additional security
      if (email) {
        query = query.eq('email', email.toLowerCase().trim())
      }

      const { data, error } = await query.single()

      if (!error && data) {
        tokenResult = { data, error: null }
        break
      }

      attempts++
      if (attempts === maxAttempts) {
        // Determine specific error type
        if (error?.code === 'PGRST116') {
          // No rows returned - token not found
          await logAuditEvent(
            supabaseClient,
            'token_validate',
            trimmedToken.substring(0, 16),
            email || 'unknown',
            false,
            'Invalid or expired token'
          )
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Invalid or expired token',
              code: 'TOKEN_NOT_FOUND'
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          console.error('Database error during token validation:', error)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Database error during token validation',
              code: 'DATABASE_ERROR',
              retryable: true
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
    }

    const tokenData = tokenResult.data

    // Validate token data structure
    if (!tokenData || !tokenData.invitation_requests) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid token data structure',
          code: 'INVALID_TOKEN_DATA'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    if (now > expiresAt) {
      await logAuditEvent(
        supabaseClient,
        'token_validate',
        tokenData.id,
        tokenData.email,
        false,
        'Token has expired',
        { expired_at: tokenData.expires_at }
      )
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED',
          details: {
            expiredAt: tokenData.expires_at,
            currentTime: now.toISOString()
          }
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate invitation status
    if (tokenData.invitation_requests.status !== 'approved') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invitation is not approved',
          code: 'INVITATION_NOT_APPROVED'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Additional email validation if provided
    if (email && tokenData.email.toLowerCase() !== email.toLowerCase().trim()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email does not match token',
          code: 'EMAIL_MISMATCH'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful token validation
    await logAuditEvent(
      supabaseClient,
      'token_validate',
      tokenData.id,
      tokenData.email,
      true,
      undefined,
      { 
        invitation_id: tokenData.invitation_request_id,
        validation_method: email ? 'with_email' : 'token_only'
      }
    )

    // Return validation success with invitation data
    return new Response(
      JSON.stringify({ 
        success: true, 
        invitationData: {
          id: tokenData.id,
          invitation_id: tokenData.invitation_request_id,
          email: tokenData.email,
          expires_at: tokenData.expires_at,
          invitation: {
            id: tokenData.invitation_requests.id,
            parent_name: tokenData.invitation_requests.parent_name,
            child_name: tokenData.invitation_requests.child_name,
            parent_email: tokenData.invitation_requests.parent_email,
            message: tokenData.invitation_requests.message,
            status: tokenData.invitation_requests.status,
            created_at: tokenData.invitation_requests.created_at
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Token validation error:', error)
    
    let errorCode = 'VALIDATION_ERROR'
    let retryable = true
    
    if (error.name === 'TypeError') {
      errorCode = 'TYPE_ERROR'
      retryable = false
    } else if (error.message?.includes('crypto')) {
      errorCode = 'CRYPTO_ERROR'
      retryable = false
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error during token validation',
        code: errorCode,
        retryable: retryable
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function cleanupExpiredTokens(supabaseClient: any): Promise<Response> {
  try {
    const now = new Date().toISOString()
    
    const { data, error } = await supabaseClient
      .from('invitation_tokens')
      .delete()
      .lt('expires_at', now)
      .select('id')

    if (error) {
      console.error('Cleanup error:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to cleanup tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deletedCount = data?.length || 0
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleaned up ${deletedCount} expired tokens` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Token cleanup error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to cleanup tokens' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function markTokenAsUsed(req: Request, supabaseClient: any): Promise<Response> {
  try {
    const { token }: { token: string } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash the token to find it in database
    const encoder = new TextEncoder()
    const tokenData = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const tokenHash = Array.from(new Uint8Array(hashBuffer), byte => 
      byte.toString(16).padStart(2, '0')
    ).join('')

    // Update token as used
    const { data, error } = await supabaseClient
      .from('invitation_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .select()
      .single()

    if (error) {
      console.error('Mark token used error:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to mark token as used' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!data) {
      await logAuditEvent(
        supabaseClient,
        'token_use',
        token.substring(0, 16),
        'unknown',
        false,
        'Token not found or already used'
      )
      
      return new Response(
        JSON.stringify({ success: false, error: 'Token not found or already used' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful token usage
    await logAuditEvent(
      supabaseClient,
      'token_use',
      data.id,
      data.email,
      true,
      undefined,
      { used_at: data.used_at }
    )

    return new Response(
      JSON.stringify({ success: true, message: 'Token marked as used' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Mark token used error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to mark token as used' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}