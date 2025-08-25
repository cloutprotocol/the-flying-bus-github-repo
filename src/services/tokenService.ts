import { supabase } from '@/integrations/supabase/client'

export interface TokenRequest {
  invitationId: string;
  email: string;
  expirationHours?: number;
}

export interface TokenValidation {
  token: string;
  email?: string;
}

export interface TokenResponse {
  success: boolean;
  token?: string;
  invitationData?: InvitationData;
  error?: string;
  code?: string;
  retryable?: boolean;
  details?: Record<string, any>;
}

export interface InvitationData {
  id: string;
  invitation_id: string;
  email: string;
  expires_at: string;
  invitation: {
    id: string;
    parent_name: string;
    child_name: string;
    email: string;
    message?: string;
    status: string;
    created_at: string;
  };
}

class TokenService {
  private async callTokenFunction(action: string, data?: any, method: string = 'POST'): Promise<TokenResponse> {
    try {
      const { data: result, error } = await supabase.functions.invoke('invitation-tokens', {
        body: method === 'POST' ? data : undefined,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (error) {
        console.error('Token function error:', error)
        return { success: false, error: error.message || 'Token operation failed' }
      }

      return result as TokenResponse
    } catch (error) {
      console.error('Token service error:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  /**
   * Generate a secure invitation token
   */
  async generateToken(request: TokenRequest): Promise<TokenResponse> {
    // Enhanced input validation
    if (!request || typeof request !== 'object') {
      return { 
        success: false, 
        error: 'Invalid request object',
        code: 'INVALID_REQUEST'
      }
    }

    if (!request.invitationId || typeof request.invitationId !== 'string') {
      return { 
        success: false, 
        error: 'Valid invitation ID is required',
        code: 'MISSING_INVITATION_ID'
      }
    }

    if (!request.email || typeof request.email !== 'string') {
      return { 
        success: false, 
        error: 'Valid email address is required',
        code: 'MISSING_EMAIL'
      }
    }

    // Enhanced email validation
    const emailValidation = this.validateEmailAddress(request.email)
    if (!emailValidation.valid) {
      return { 
        success: false, 
        error: emailValidation.error,
        code: 'INVALID_EMAIL'
      }
    }

    // Validate expiration hours
    if (request.expirationHours !== undefined) {
      if (typeof request.expirationHours !== 'number' || 
          request.expirationHours < 1 || 
          request.expirationHours > 8760) { // Max 1 year
        return { 
          success: false, 
          error: 'Expiration hours must be between 1 and 8760',
          code: 'INVALID_EXPIRATION'
        }
      }
    }

    const url = new URL(`${supabase.supabaseUrl}/functions/v1/invitation-tokens`)
    url.searchParams.set('action', 'generate')

    // Retry logic for token generation
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`,
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          
          if (response.status >= 500) {
            // Server error - retryable
            throw new Error(`Server error (${response.status}): ${errorText}`)
          } else {
            // Client error - not retryable
            return { 
              success: false, 
              error: `Request failed (${response.status}): ${errorText}`,
              code: 'REQUEST_FAILED'
            }
          }
        }

        const result = await response.json()
        
        // Validate response structure
        if (typeof result !== 'object' || result === null) {
          throw new Error('Invalid response format')
        }

        return result as TokenResponse
      } catch (error) {
        console.warn(`Token generation attempt ${attempts + 1} failed:`, error.message)
        
        if (attempts === maxAttempts - 1) {
          // Final attempt failed
          if (error.name === 'AbortError') {
            return { 
              success: false, 
              error: 'Token generation timed out',
              code: 'TIMEOUT_ERROR'
            }
          } else if (error.message.includes('fetch')) {
            return { 
              success: false, 
              error: 'Network error during token generation',
              code: 'NETWORK_ERROR'
            }
          } else {
            return { 
              success: false, 
              error: `Failed to generate token: ${error.message}`,
              code: 'GENERATION_FAILED'
            }
          }
        }

        attempts++
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)))
      }
    }

    return { 
      success: false, 
      error: 'Failed to generate token after multiple attempts',
      code: 'MAX_ATTEMPTS_EXCEEDED'
    }
  }

  private validateEmailAddress(email: string): { valid: boolean; error?: string } {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email address is required' }
    }

    email = email.trim()

    if (email.length === 0) {
      return { valid: false, error: 'Email address cannot be empty' }
    }

    if (email.length > 254) {
      return { valid: false, error: 'Email address is too long' }
    }

    // Enhanced email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email address format' }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [/[<>]/, /javascript:/i, /data:/i, /\r|\n/, /\0/]
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        return { valid: false, error: 'Email address contains invalid characters' }
      }
    }

    return { valid: true }
  }

  /**
   * Validate an invitation token
   */
  async validateToken(validation: TokenValidation): Promise<TokenResponse> {
    if (!validation.token) {
      return { success: false, error: 'Token is required' }
    }

    // Validate token format (64 hex characters)
    const tokenRegex = /^[a-f0-9]{64}$/i
    if (!tokenRegex.test(validation.token)) {
      return { success: false, error: 'Invalid token format' }
    }

    const url = new URL(`${supabase.supabaseUrl}/functions/v1/invitation-tokens`)
    url.searchParams.set('action', 'validate')

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
        body: JSON.stringify(validation),
      })

      const result = await response.json()
      return result as TokenResponse
    } catch (error) {
      console.error('Validate token error:', error)
      return { success: false, error: 'Failed to validate token' }
    }
  }

  /**
   * Validate token from URL parameters (for direct links)
   */
  async validateTokenFromUrl(token: string, email?: string): Promise<TokenResponse> {
    if (!token) {
      return { success: false, error: 'Token is required' }
    }

    const url = new URL(`${supabase.supabaseUrl}/functions/v1/invitation-tokens`)
    url.searchParams.set('action', 'validate')
    url.searchParams.set('token', token)
    if (email) {
      url.searchParams.set('email', email)
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
      })

      const result = await response.json()
      return result as TokenResponse
    } catch (error) {
      console.error('Validate token from URL error:', error)
      return { success: false, error: 'Failed to validate token' }
    }
  }

  /**
   * Mark a token as used (called after successful invitation completion)
   */
  async markTokenAsUsed(tokenId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('invitation_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', tokenId)

      if (error) {
        console.error('Mark token as used error:', error)
        return { success: false, error: 'Failed to mark token as used' }
      }

      return { success: true }
    } catch (error) {
      console.error('Mark token as used error:', error)
      return { success: false, error: 'Failed to mark token as used' }
    }
  }

  /**
   * Clean up expired tokens (admin function)
   */
  async cleanupExpiredTokens(): Promise<TokenResponse> {
    const url = new URL(`${supabase.supabaseUrl}/functions/v1/invitation-tokens`)
    url.searchParams.set('action', 'cleanup')

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
      })

      const result = await response.json()
      return result as TokenResponse
    } catch (error) {
      console.error('Cleanup tokens error:', error)
      return { success: false, error: 'Failed to cleanup expired tokens' }
    }
  }

  /**
   * Get token statistics (for admin dashboard)
   */
  async getTokenStats(): Promise<{
    success: boolean;
    stats?: {
      total: number;
      active: number;
      expired: number;
      used: number;
    };
    error?: string;
  }> {
    try {
      const now = new Date().toISOString()

      // Get total tokens
      const { count: total, error: totalError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })

      if (totalError) throw totalError

      // Get active tokens (not used and not expired)
      const { count: active, error: activeError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .is('used_at', null)
        .gt('expires_at', now)

      if (activeError) throw activeError

      // Get expired tokens
      const { count: expired, error: expiredError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .is('used_at', null)
        .lt('expires_at', now)

      if (expiredError) throw expiredError

      // Get used tokens
      const { count: used, error: usedError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .not('used_at', 'is', null)

      if (usedError) throw usedError

      return {
        success: true,
        stats: {
          total: total || 0,
          active: active || 0,
          expired: expired || 0,
          used: used || 0,
        },
      }
    } catch (error) {
      console.error('Get token stats error:', error)
      return { success: false, error: 'Failed to get token statistics' }
    }
  }
}

export const tokenService = new TokenService()
export default tokenService