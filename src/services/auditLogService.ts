import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  success: boolean;
  error_message?: string;
  created_at?: string;
}

export interface AuditLogFilter {
  action?: string;
  resource_type?: string;
  user_id?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class AuditLogService {
  private static readonly MAX_METADATA_SIZE = 4000; // Prevent oversized metadata

  /**
   * Log an audit event with server-side context
   */
  static async logEventWithContext(
    entry: Omit<AuditLogEntry, 'id' | 'created_at' | 'ip_address' | 'user_agent'>,
    context?: { ip_address?: string; user_agent?: string }
  ): Promise<void> {
    try {
      // Sanitize and validate entry data
      const sanitizedEntry = this.sanitizeEntry(entry);
      
      // Use provided context or get client info
      const clientInfo = context || this.getClientInfo();
      
      // Prepare audit entry with graceful handling of missing fields
      const auditEntry: Omit<AuditLogEntry, 'id' | 'created_at'> = {
        ...sanitizedEntry,
        // Ensure these fields are properly set or null
        ip_address: clientInfo.ip_address || null,
        user_agent: clientInfo.user_agent || null,
      };

      // Remove any undefined values to prevent database errors
      Object.keys(auditEntry).forEach(key => {
        if (auditEntry[key as keyof typeof auditEntry] === undefined) {
          delete auditEntry[key as keyof typeof auditEntry];
        }
      });

      const { error } = await supabase
        .from('audit_logs')
        .insert([auditEntry]);

      if (error) {
        console.error('Failed to log audit event with context:', error);
        // Log the specific error details for debugging
        console.error('Audit entry that failed:', JSON.stringify(auditEntry, null, 2));
        // Don't throw error to avoid breaking the main operation
      }
    } catch (error) {
      console.error('Exception logging audit event with context:', error);
      // Log additional context for debugging
      console.error('Original entry:', JSON.stringify(entry, null, 2));
      console.error('Context:', JSON.stringify(context, null, 2));
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log an audit event
   */
  static async logEvent(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      // Sanitize and validate entry data
      const sanitizedEntry = this.sanitizeEntry(entry);
      
      // Get client information if available
      const clientInfo = this.getClientInfo();
      
      // Prepare audit entry with graceful handling of missing fields
      const auditEntry: Omit<AuditLogEntry, 'id' | 'created_at'> = {
        ...sanitizedEntry,
        // Ensure these fields are properly set or null
        ip_address: clientInfo.ip_address || null,
        user_agent: clientInfo.user_agent || null,
        // Remove created_at from here as it's handled by the database
      };

      // Remove any undefined values to prevent database errors
      Object.keys(auditEntry).forEach(key => {
        if (auditEntry[key as keyof typeof auditEntry] === undefined) {
          delete auditEntry[key as keyof typeof auditEntry];
        }
      });

      // Try RPC function first, fallback to direct table insert if RPC fails
      const { error: rpcError } = await supabase.rpc('log_audit_event', {
        p_action: auditEntry.action,
        p_resource_type: auditEntry.resource_type,
        p_resource_id: auditEntry.resource_id,
        p_user_email: auditEntry.user_email,
        p_user_id: auditEntry.user_id,
        p_success: auditEntry.success,
        p_error_message: auditEntry.error_message,
        p_metadata: auditEntry.metadata,
        p_ip_address: auditEntry.ip_address,
        p_user_agent: auditEntry.user_agent
      });

      if (rpcError) {
        // If it's a schema cache issue (PGRST202), try direct table insert as fallback
        if (rpcError.code === 'PGRST202' || rpcError.message?.includes('schema cache')) {
          console.warn('RPC function not found in schema cache, attempting direct table insert as fallback');
          
          try {
            const { error: insertError } = await supabase
              .from('audit_logs')
              .insert([auditEntry]);

            if (insertError) {
              console.error('Fallback audit logging also failed:', insertError);
            } else {
              console.log('Audit event logged successfully via fallback method');
            }
          } catch (fallbackError) {
            console.error('Exception during fallback audit logging:', fallbackError);
          }
        } else if (rpcError.code === '42501' || rpcError.message?.includes('permission') || rpcError.message?.includes('403')) {
          console.warn('Audit logging skipped due to permissions (this is expected for client-side operations)');
        } else {
          console.error('Failed to log audit event via RPC:', rpcError);
          console.error('Audit entry that failed:', JSON.stringify(auditEntry, null, 2));
        }
        // Don't throw error to avoid breaking the main operation
      }
    } catch (error) {
      console.error('Exception logging audit event:', error);
      // Log additional context for debugging
      console.error('Original entry:', JSON.stringify(entry, null, 2));
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log token generation event
   */
  static async logTokenGeneration(
    invitationId: string,
    email: string,
    success: boolean,
    error?: string,
    userId?: string
  ): Promise<void> {
    await this.logEventWithContext({
      action: 'token_generate',
      resource_type: 'invitation_token',
      resource_id: invitationId,
      user_id: userId,
      user_email: email,
      success,
      error_message: error,
      metadata: {
        invitation_id: invitationId,
        email_domain: this.extractDomain(email)
      }
    });
  }

  /**
   * Log token validation event
   */
  static async logTokenValidation(
    tokenId: string,
    email: string,
    success: boolean,
    error?: string,
    userId?: string
  ): Promise<void> {
    await this.logEventWithContext({
      action: 'token_validate',
      resource_type: 'invitation_token',
      resource_id: tokenId,
      user_id: userId,
      user_email: email,
      success,
      error_message: error,
      metadata: {
        email_domain: this.extractDomain(email),
        validation_method: 'web_form'
      }
    });
  }

  /**
   * Log token usage event
   */
  static async logTokenUsage(
    tokenId: string,
    email: string,
    success: boolean,
    error?: string,
    userId?: string
  ): Promise<void> {
    await this.logEventWithContext({
      action: 'token_use',
      resource_type: 'invitation_token',
      resource_id: tokenId,
      user_id: userId,
      user_email: email,
      success,
      error_message: error,
      metadata: {
        email_domain: this.extractDomain(email),
        completion_type: success ? 'account_activated' : 'failed'
      }
    });
  }

  /**
   * Log invitation request event
   */
  static async logInvitationRequest(
    invitationId: string,
    email: string,
    success: boolean,
    error?: string,
    rateLimited: boolean = false
  ): Promise<void> {
    await this.logEventWithContext({
      action: 'invitation_request',
      resource_type: 'invitation_request',
      resource_id: invitationId,
      user_email: email,
      success,
      error_message: error,
      metadata: {
        email_domain: this.extractDomain(email),
        rate_limited: rateLimited,
        request_source: 'web_form'
      }
    });
  }

  /**
   * Log email sending event
   */
  static async logEmailSent(
    emailType: string,
    recipient: string,
    success: boolean,
    messageId?: string,
    error?: string
  ): Promise<void> {
    await this.logEventWithContext({
      action: 'email_send',
      resource_type: 'email',
      resource_id: messageId || 'unknown',
      user_email: recipient,
      success,
      error_message: error,
      metadata: {
        email_type: emailType,
        email_domain: this.extractDomain(recipient),
        message_id: messageId
      }
    });
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(filter: AuditLogFilter = {}): Promise<{
    data?: AuditLogEntry[];
    error?: any;
    count?: number;
  }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter.action) {
        query = query.eq('action', filter.action);
      }
      if (filter.resource_type) {
        query = query.eq('resource_type', filter.resource_type);
      }
      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id);
      }
      if (filter.success !== undefined) {
        query = query.eq('success', filter.success);
      }
      if (filter.startDate) {
        query = query.gte('created_at', filter.startDate.toISOString());
      }
      if (filter.endDate) {
        query = query.lte('created_at', filter.endDate.toISOString());
      }

      // Apply limit
      const limit = Math.min(filter.limit || 100, 1000); // Max 1000 records
      query = query.limit(limit);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        return { error };
      }

      return { data, count };
    } catch (error) {
      console.error('Exception fetching audit logs:', error);
      return { error };
    }
  }

  /**
   * Get audit log statistics
   */
  static async getAuditStats(days: number = 7): Promise<{
    data?: Record<string, any>;
    error?: any;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .rpc('get_audit_stats', {
          start_date: startDate.toISOString(),
          end_date: new Date().toISOString()
        });

      if (error) {
        console.error('Error fetching audit stats:', error);
        return { error };
      }

      return { data };
    } catch (error) {
      console.error('Exception fetching audit stats:', error);
      return { error };
    }
  }

  /**
   * Clean up old audit logs
   */
  static async cleanupOldLogs(olderThanDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up audit logs:', error);
      }
    } catch (error) {
      console.error('Exception cleaning up audit logs:', error);
    }
  }

  /**
   * Sanitize audit entry data
   */
  private static sanitizeEntry(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Omit<AuditLogEntry, 'id' | 'created_at'> {
    const sanitized = { ...entry };

    // Sanitize strings
    if (sanitized.action) {
      sanitized.action = this.sanitizeString(sanitized.action, 100);
    }
    if (sanitized.resource_type) {
      sanitized.resource_type = this.sanitizeString(sanitized.resource_type, 100);
    }
    if (sanitized.resource_id) {
      sanitized.resource_id = this.sanitizeString(sanitized.resource_id, 255);
    }
    if (sanitized.user_email) {
      sanitized.user_email = this.sanitizeString(sanitized.user_email, 255);
    }
    if (sanitized.error_message) {
      sanitized.error_message = this.sanitizeString(sanitized.error_message, 1000);
    }

    // Sanitize metadata
    if (sanitized.metadata) {
      const metadataString = JSON.stringify(sanitized.metadata);
      if (metadataString.length > this.MAX_METADATA_SIZE) {
        sanitized.metadata = { 
          error: 'Metadata too large',
          original_size: metadataString.length 
        };
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string input
   */
  private static sanitizeString(input: string, maxLength: number): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Remove control characters and limit length
    return input
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, maxLength)
      .trim();
  }

  /**
   * Extract domain from email
   */
  private static extractDomain(email: string): string {
    if (!email || typeof email !== 'string') {
      return 'unknown';
    }
    
    const parts = email.split('@');
    return parts.length > 1 ? parts[1].toLowerCase() : 'unknown';
  }

  /**
   * Test audit logging functionality
   */
  static async testAuditLogging(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.logEventWithContext({
        action: 'audit_test',
        resource_type: 'system',
        resource_id: 'test_' + Date.now(),
        user_email: 'test@example.com',
        success: true,
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
          client_info: this.getClientInfo()
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Audit logging test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get client information (IP, User Agent)
   */
  private static getClientInfo(): { ip_address?: string; user_agent?: string } {
    const clientInfo: { ip_address?: string; user_agent?: string } = {};

    // Get user agent if available, with multiple fallbacks
    try {
      if (typeof navigator !== 'undefined' && navigator.userAgent) {
        clientInfo.user_agent = navigator.userAgent.substring(0, 500); // Limit length
      } else if (typeof window !== 'undefined' && (window as any).navigator?.userAgent) {
        clientInfo.user_agent = (window as any).navigator.userAgent.substring(0, 500);
      } else {
        // Fallback for server-side or environments without navigator
        clientInfo.user_agent = 'system/unknown';
      }
    } catch (error) {
      console.warn('Could not get user agent:', error);
      clientInfo.user_agent = 'system/error';
    }

    // Note: IP address would typically be set by the server/edge function
    // For client-side logging, we can't reliably get the real IP
    // This could be enhanced by passing IP from server-side context
    
    return clientInfo;
  }
}

export default AuditLogService;