import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface AdminOperationRequest {
  operation: string;
  params: Record<string, any>;
}

interface AdminOperationResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  details?: Record<string, any>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let requestBody: AdminOperationRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { operation, params } = requestBody;

    // Validate required fields
    if (!operation) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing operation parameter',
          code: 'MISSING_OPERATION'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error',
          code: 'MISSING_CONFIG'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`[AdminOperations] Processing operation: ${operation}`);

    let result: AdminOperationResponse;

    // Route to appropriate operation handler
    switch (operation) {
      case 'health-check':
        result = await handleHealthCheck(supabaseAdmin);
        break;
      
      case 'updateInvitationStatus':
        result = await handleUpdateInvitationStatus(supabaseAdmin, params);
        break;
      
      case 'logAdminAction':
        result = await handleLogAdminAction(supabaseAdmin, params);
        break;
      
      case 'sendAdminEmail':
        result = await handleSendAdminEmail(supabaseAdmin, params);
        break;
      
      default:
        result = {
          success: false,
          error: `Unsupported operation: ${operation}`,
          code: 'UNSUPPORTED_OPERATION'
        };
    }

    console.log(`[AdminOperations] Operation ${operation} completed:`, result.success ? 'SUCCESS' : 'FAILED');

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[AdminOperations] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: {
          message: error.message
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Health check operation
 */
async function handleHealthCheck(supabaseAdmin: any): Promise<AdminOperationResponse> {
  try {
    // Test database connectivity
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      throw new Error(`Database test failed: ${error.message}`);
    }

    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        databaseConnectivity: 'ok'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: 'HEALTH_CHECK_FAILED'
    };
  }
}

/**
 * Update invitation request status with service role permissions
 */
async function handleUpdateInvitationStatus(
  supabaseAdmin: any, 
  params: Record<string, any>
): Promise<AdminOperationResponse> {
  try {
    const { invitationId, status, reviewerId, timestamp } = params;

    // Validate parameters
    if (!invitationId || !status || !reviewerId) {
      return {
        success: false,
        error: 'Missing required parameters: invitationId, status, reviewerId',
        code: 'MISSING_PARAMETERS'
      };
    }

    if (!['approved', 'denied'].includes(status)) {
      return {
        success: false,
        error: 'Invalid status. Must be "approved" or "denied"',
        code: 'INVALID_STATUS'
      };
    }

    console.log(`[AdminOperations] Updating invitation ${invitationId} to ${status} by ${reviewerId}`);

    // Update invitation status with service role permissions
    const { data: updatedInvitation, error: updateError } = await supabaseAdmin
      .from('invitation_requests')
      .update({
        status,
        reviewed_at: timestamp || new Date().toISOString(),
        reviewer_id: reviewerId
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (updateError) {
      console.error('[AdminOperations] Database update failed:', updateError);
      return {
        success: false,
        error: `Database update failed: ${updateError.message}`,
        code: 'DATABASE_UPDATE_ERROR',
        details: {
          originalError: updateError
        }
      };
    }

    console.log(`[AdminOperations] Invitation ${invitationId} updated successfully`);

    // Log the admin action with service role permissions
    try {
      const { error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          action: 'invitation_status_updated',
          resource_type: 'invitation_request',
          resource_id: invitationId,
          user_id: reviewerId,
          success: true,
          metadata: {
            new_status: status,
            previous_status: 'pending',
            updated_via: 'admin_service'
          },
          created_at: new Date().toISOString()
        });

      if (auditError) {
        console.warn('[AdminOperations] Audit logging failed:', auditError);
        // Don't fail the operation if audit logging fails
      } else {
        console.log('[AdminOperations] Audit log created successfully');
      }
    } catch (auditError) {
      console.warn('[AdminOperations] Audit logging exception:', auditError);
      // Don't fail the operation if audit logging fails
    }

    // Log email event with service role permissions
    try {
      const { error: emailEventError } = await supabaseAdmin
        .from('email_events')
        .insert({
          event_type: 'invitation_status_updated',
          email: updatedInvitation.parent_email,
          status: 'processed',
          metadata: {
            invitation_id: invitationId,
            new_status: status,
            reviewer_id: reviewerId,
            processed_via: 'admin_service'
          },
          created_at: new Date().toISOString()
        });

      if (emailEventError) {
        console.warn('[AdminOperations] Email event logging failed:', emailEventError);
        // Don't fail the operation if email event logging fails
      } else {
        console.log('[AdminOperations] Email event logged successfully');
      }
    } catch (emailEventError) {
      console.warn('[AdminOperations] Email event logging exception:', emailEventError);
      // Don't fail the operation if email event logging fails
    }

    // If status is approved, trigger invitation email
    if (status === 'approved') {
      try {
        console.log('[AdminOperations] Triggering invitation email for approved request');
        
        // Create Supabase client to call send-email function (same as working form submission)
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );

        // Call send-email function directly with invitation_approved type (same pattern as form submission)
        const emailData = {
          type: 'invitation_approved',
          to: updatedInvitation.parent_email,
          templateData: {
            invitationId: invitationId, // Required for token generation
            parentName: updatedInvitation.parent_name || 'Parent',
            childName: updatedInvitation.child_name || 'Child'
          }
        };

        console.log('[AdminOperations] Calling send-email function with data:', {
          type: emailData.type,
          to: emailData.to,
          invitationId: emailData.templateData.invitationId
        });

        const { data: emailResponse, error: emailError } = await supabaseClient.functions.invoke('send-email', {
          body: emailData
        });

        if (emailError) {
          console.warn('[AdminOperations] Invitation email failed:', emailError.message);
          
          return {
            success: true,
            data: updatedInvitation,
            details: {
              statusUpdated: true,
              emailSent: false,
              emailError: emailError.message,
              warning: 'Status updated successfully but invitation email failed'
            }
          };
        }

        if (!emailResponse.success) {
          console.warn('[AdminOperations] Email service returned error:', emailResponse.error);
          
          return {
            success: true,
            data: updatedInvitation,
            details: {
              statusUpdated: true,
              emailSent: false,
              emailError: emailResponse.error,
              warning: 'Status updated successfully but invitation email failed'
            }
          };
        }

        console.log('[AdminOperations] Invitation email sent successfully:', emailResponse.messageId);

        return {
          success: true,
          data: updatedInvitation,
          details: {
            statusUpdated: true,
            emailSent: true,
            emailResult
          }
        };

      } catch (emailError) {
        console.warn('[AdminOperations] Invitation email exception:', emailError);
        
        return {
          success: true,
          data: updatedInvitation,
          details: {
            statusUpdated: true,
            emailSent: false,
            emailError: emailError.message,
            warning: 'Status updated successfully but invitation email failed'
          }
        };
      }
    }

    return {
      success: true,
      data: updatedInvitation,
      details: {
        statusUpdated: true,
        emailSent: false,
        reason: 'Email not required for denied status'
      }
    };

  } catch (error) {
    console.error('[AdminOperations] Update invitation status failed:', error);
    return {
      success: false,
      error: error.message,
      code: 'UPDATE_INVITATION_FAILED',
      details: {
        originalError: error.message
      }
    };
  }
}

/**
 * Log admin action with service role permissions
 */
async function handleLogAdminAction(
  supabaseAdmin: any, 
  params: Record<string, any>
): Promise<AdminOperationResponse> {
  try {
    const { action, resourceType, resourceId, userId, metadata, timestamp } = params;

    // Validate parameters
    if (!action || !resourceType || !userId) {
      return {
        success: false,
        error: 'Missing required parameters: action, resourceType, userId',
        code: 'MISSING_PARAMETERS'
      };
    }

    console.log(`[AdminOperations] Logging admin action: ${action} by ${userId}`);

    // Insert audit log with service role permissions
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        user_id: userId,
        success: true,
        metadata: metadata || {},
        created_at: timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[AdminOperations] Audit log insertion failed:', error);
      return {
        success: false,
        error: `Audit log insertion failed: ${error.message}`,
        code: 'AUDIT_LOG_FAILED',
        details: {
          originalError: error
        }
      };
    }

    console.log('[AdminOperations] Admin action logged successfully');

    return {
      success: true,
      data,
      details: {
        action,
        resourceType,
        userId
      }
    };

  } catch (error) {
    console.error('[AdminOperations] Log admin action failed:', error);
    return {
      success: false,
      error: error.message,
      code: 'LOG_ADMIN_ACTION_FAILED',
      details: {
        originalError: error.message
      }
    };
  }
}

/**
 * Send admin email with service role permissions
 */
async function handleSendAdminEmail(
  supabaseAdmin: any, 
  params: Record<string, any>
): Promise<AdminOperationResponse> {
  try {
    const { emailType, recipientEmail, templateData, timestamp } = params;

    // Validate parameters
    if (!emailType || !recipientEmail) {
      return {
        success: false,
        error: 'Missing required parameters: emailType, recipientEmail',
        code: 'MISSING_PARAMETERS'
      };
    }

    console.log(`[AdminOperations] Sending admin email: ${emailType} to ${recipientEmail}`);

    // Call the send-email Edge Function with service role permissions
    const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: emailType,
        to: recipientEmail,
        templateData: templateData || {}
      })
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('[AdminOperations] Admin email failed:', emailError);
      return {
        success: false,
        error: `Email sending failed: ${emailError}`,
        code: 'EMAIL_SEND_FAILED'
      };
    }

    const emailResult = await emailResponse.json();
    console.log('[AdminOperations] Admin email sent successfully');

    // Log email event with service role permissions
    try {
      const { error: emailEventError } = await supabaseAdmin
        .from('email_events')
        .insert({
          event_type: emailType,
          email: recipientEmail,
          status: 'sent',
          metadata: {
            template_data: templateData,
            sent_via: 'admin_service',
            timestamp: timestamp || new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });

      if (emailEventError) {
        console.warn('[AdminOperations] Email event logging failed:', emailEventError);
        // Don't fail the operation if email event logging fails
      }
    } catch (emailEventError) {
      console.warn('[AdminOperations] Email event logging exception:', emailEventError);
      // Don't fail the operation if email event logging fails
    }

    return {
      success: true,
      data: emailResult,
      details: {
        emailType,
        recipientEmail,
        emailSent: true
      }
    };

  } catch (error) {
    console.error('[AdminOperations] Send admin email failed:', error);
    return {
      success: false,
      error: error.message,
      code: 'SEND_ADMIN_EMAIL_FAILED',
      details: {
        originalError: error.message
      }
    };
  }
}