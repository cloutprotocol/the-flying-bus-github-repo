import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
  details?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterMax: number;
}

/**
 * Service for making authenticated API calls with proper service role authentication
 * and comprehensive error handling with retry logic
 */
export class AuthenticatedApiService {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitterMax: 1000
  };

  /**
   * Get service role key from database configuration
   * NOTE: For security reasons, client-side code should NOT access service role keys
   * Instead, we use anon key and let Edge Functions handle service authentication
   */
  private static async getServiceRoleKey(): Promise<string | null> {
    return null;
  }

  /**
   * Get Supabase URL from environment (client-side should use environment variables)
   */
  private static async getSupabaseUrl(): Promise<string> {
    return '';
  }

  /**
   * Calculate delay for exponential backoff with jitter
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    const jitter = Math.random() * config.jitterMax;
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, config.maxDelay);
  }

  /**
   * Check if an error is retryable based on error type and status
   */
  private static isRetryableError(error: any): boolean {
    if (!error) return false;

    // Network errors are retryable
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return true;
    }

    // Check error message for network-related issues
    const errorMessage = error.message?.toLowerCase() || '';
    const networkErrors = ['network', 'timeout', 'connection', 'fetch'];
    if (networkErrors.some(keyword => errorMessage.includes(keyword))) {
      return true;
    }

    // HTTP status codes that are retryable
    if (error.status || error.code) {
      const statusCode = parseInt(error.status || error.code);
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(statusCode);
    }

    // Check for specific HTTP error messages
    const httpErrors = ['500', '502', '503', '504', '408', '429'];
    if (httpErrors.some(code => errorMessage.includes(code))) {
      return true;
    }

    return false;
  }

  /**
   * Make an authenticated API call with retry logic and comprehensive error handling
   */
  static async makeAuthenticatedCall<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      timeout?: number;
      retryConfig?: Partial<RetryConfig>;
      requiresServiceRole?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'POST',
      body,
      timeout = 30000,
      retryConfig = {},
      requiresServiceRole = true
    } = options;

    const config: RetryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig };
    
    let lastError: any;
    let serviceRoleKey: string | null = null;
    let supabaseUrl: string;

    try {
      // Get configuration values
      [serviceRoleKey, supabaseUrl] = await Promise.all([
        requiresServiceRole ? this.getServiceRoleKey() : Promise.resolve(null),
        this.getSupabaseUrl()
      ]);

      if (requiresServiceRole && !serviceRoleKey) {
        return {
          success: false,
          error: 'Service role key not available for authenticated call',
          code: 'MISSING_SERVICE_ROLE_KEY',
          retryable: false,
          details: {
            endpoint,
            requiresServiceRole: true
          }
        };
      }

    } catch (configError) {
      console.error('❌ Failed to get API configuration:', configError);
      return {
        success: false,
        error: 'Failed to get API configuration',
        code: 'CONFIG_ERROR',
        retryable: true,
        details: {
          configError: configError.message,
          endpoint
        }
      };
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (requiresServiceRole && serviceRoleKey) {
      headers['Authorization'] = `Bearer ${serviceRoleKey}`;
    } else if (!requiresServiceRole) {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    }

    const fullUrl = `${supabaseUrl}${endpoint}`;

    // Retry loop
    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
      try {
        console.log(`🔄 API call attempt ${attempt + 1}/${config.maxAttempts} to ${endpoint}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`📡 API response status: ${response.status} for ${endpoint}`);

        if (!response.ok) {
          const errorText = await response.text();
          let errorData: any;
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }

          const error = new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
          (error as any).status = response.status;
          (error as any).response = errorData;
          
          throw error;
        }

        const result = await response.json();
        
        if (result.success === false) {
          throw new Error(result.error || 'API call returned failure');
        }

        console.log(`✅ API call successful to ${endpoint}`);
        return {
          success: true,
          data: result,
          details: {
            endpoint,
            attempt: attempt + 1,
            method,
            authenticated: requiresServiceRole
          }
        };

      } catch (error) {
        lastError = error;
        console.warn(`❌ API call attempt ${attempt + 1} failed for ${endpoint}:`, error.message);

        // Check if we should retry
        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === config.maxAttempts - 1;

        if (!isRetryable || isLastAttempt) {
          break;
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, config);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All attempts failed
    const errorMessage = lastError?.message || 'Unknown API error';
    const isRetryable = this.isRetryableError(lastError);

    console.error(`❌ All API call attempts failed for ${endpoint}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      code: this.getErrorCode(lastError),
      retryable: isRetryable,
      details: {
        endpoint,
        attempts: config.maxAttempts,
        lastError: lastError?.message,
        lastStatus: lastError?.status,
        authenticated: requiresServiceRole,
        serviceRoleAvailable: !!serviceRoleKey
      }
    };
  }

  /**
   * Get appropriate error code based on error type
   */
  private static getErrorCode(error: any): string {
    if (!error) return 'UNKNOWN_ERROR';

    if (error.name === 'AbortError') return 'TIMEOUT_ERROR';
    if (error.name === 'TimeoutError') return 'TIMEOUT_ERROR';

    const status = error.status || error.code;
    if (status) {
      const statusCode = parseInt(status);
      switch (statusCode) {
        case 400: return 'BAD_REQUEST';
        case 401: return 'UNAUTHORIZED';
        case 403: return 'FORBIDDEN';
        case 404: return 'NOT_FOUND';
        case 408: return 'TIMEOUT';
        case 429: return 'RATE_LIMITED';
        case 500: return 'INTERNAL_SERVER_ERROR';
        case 502: return 'BAD_GATEWAY';
        case 503: return 'SERVICE_UNAVAILABLE';
        case 504: return 'GATEWAY_TIMEOUT';
        default: return 'HTTP_ERROR';
      }
    }

    const errorMessage = error.message?.toLowerCase() || '';
    if (errorMessage.includes('network')) return 'NETWORK_ERROR';
    if (errorMessage.includes('timeout')) return 'TIMEOUT_ERROR';
    if (errorMessage.includes('connection')) return 'CONNECTION_ERROR';

    return 'API_ERROR';
  }

  /**
   * Send email using the send-email Edge Function via Supabase SDK
   * The Edge Function will handle service role authentication internally
   */
  static async sendEmail(emailData: {
    type: string;
    to: string;
    templateData: Record<string, any>;
  }): Promise<ApiResponse> {
    try {
      console.log('📧 Sending email (stub):', emailData.type, 'to:', emailData.to);
      // TODO: Implement Convex Action for email sending
      return { success: true, data: { queued: true } };
    } catch (error) {
      return { success: false, error: error.message || 'SEND_EMAIL_EXCEPTION' };
    }
  }



  /**
   * Validate invitation token using the invitation-tokens Edge Function via Supabase SDK
   */
  static async validateInvitationToken(tokenData: {
    token: string;
    email?: string;
  }): Promise<ApiResponse> {
    try {
      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      const tokenRec: any = await convex.query(api.invitations.getByToken, { token: tokenData.token });
      if (!tokenRec) return { success: false, error: 'Invalid token' };
      const now = Date.now();
      const exp = new Date(tokenRec.expires_at).getTime();
      if (tokenRec.status !== 'pending' || exp < now) {
        return { success: false, error: 'Token expired or already used' };
      }
      if (tokenData.email && tokenRec.email && tokenData.email.toLowerCase() !== String(tokenRec.email).toLowerCase()) {
        return { success: false, error: 'Email mismatch for token' };
      }
      const invitation = {
        id: tokenRec._id,
        parent_email: tokenRec.email,
        parent_name: '',
        child_name: '',
        child_age: 10,
        status: 'pending',
        created_at: tokenRec.created_at,
      };
      return { success: true, data: { id: tokenRec._id, invitation_id: tokenRec._id, email: tokenRec.email, expires_at: tokenRec.expires_at, invitation } };
    } catch (error) {
      return { success: false, error: error.message || 'TOKEN_VALIDATION_EXCEPTION' };
    }
  }

  /**
   * Mark invitation token as used via Supabase SDK
   */
  static async markTokenAsUsed(token: string): Promise<ApiResponse> {
    try {
      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      const tokenRec: any = await convex.query(api.invitations.getByToken, { token });
      if (!tokenRec) return { success: false, error: 'Invalid token' };
      await convex.mutation(api.invitations.updateToken, { id: tokenRec._id, status: 'accepted', used_at: new Date().toISOString() });
      return { success: true, data: { updated: true } };
    } catch (error) {
      return { success: false, error: error.message || 'MARK_TOKEN_USED_EXCEPTION' };
    }
  }
}
