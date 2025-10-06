-- Enhanced RPC Functions Resilience
-- This migration updates the RPC functions to be more resilient with better error handling

-- Enhanced confirmation email RPC function with comprehensive error handling
CREATE OR REPLACE FUNCTION send_confirmation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_role_key text;
  http_response record;
  error_context text;
BEGIN
  -- Get invitation data
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    PERFORM log_email_event(
      'confirmation_email_error',
      invitation_id_param,
      'unknown',
      false,
      'Invitation not found',
      false,
      jsonb_build_object('function', 'send_confirmation_email_rpc')
    );
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Get configuration parameters with graceful handling
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- Check if configuration is available
  IF supabase_url IS NULL OR supabase_url = '' OR 
     service_role_key IS NULL OR service_role_key = '' THEN
    -- Configuration not available, mark as queued for fallback handling
    PERFORM log_email_event(
      'confirmation_email_queued',
      invitation_record.id,
      invitation_record.parent_email,
      false,
      'Configuration not available',
      true,
      jsonb_build_object('function', 'send_confirmation_email_rpc')
    );
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Email queued for sending - configuration not available', 
      'fallback', true
    );
  END IF;
  
  -- Call the Edge Function using pg_net with enhanced error handling
  BEGIN
    SELECT * INTO http_response FROM net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', 'invitation_confirmation',
        'to', invitation_record.parent_email,
        'templateData', jsonb_build_object(
          'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
          'childName', COALESCE(invitation_record.child_name, 'Child'),
          'submissionDate', to_char(invitation_record.created_at, 'Month DD, YYYY')
        )
      ),
      timeout_milliseconds := 15000
    );
    
    -- Check HTTP response status
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Success - update timestamp and log success
      UPDATE invitation_requests 
      SET confirmation_email_sent_at = NOW() 
      WHERE id = invitation_id_param;
      
      PERFORM log_email_event(
        'confirmation_email_sent',
        invitation_record.id,
        invitation_record.parent_email,
        true,
        NULL,
        false,
        jsonb_build_object('http_status', http_response.status_code, 'function', 'send_confirmation_email_rpc')
      );
      
      RETURN json_build_object(
        'success', true, 
        'message', 'Confirmation email sent successfully',
        'http_status', http_response.status_code
      );
      
    ELSE
      -- HTTP error - log and return error details
      error_context := format('HTTP %s: %s', http_response.status_code, COALESCE(http_response.content, 'No response content'));
      
      PERFORM log_email_event(
        'confirmation_email_failed',
        invitation_record.id,
        invitation_record.parent_email,
        false,
        error_context,
        true,
        jsonb_build_object('http_status', http_response.status_code, 'function', 'send_confirmation_email_rpc')
      );
      
      RETURN json_build_object(
        'success', false, 
        'message', 'Email sending failed',
        'error', error_context,
        'fallback', true,
        'http_status', http_response.status_code
      );
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Network or other error - log and return error for fallback handling
    error_context := format('Network error: %s (SQLSTATE: %s)', SQLERRM, SQLSTATE);
    
    PERFORM log_email_event(
      'confirmation_email_failed',
      invitation_record.id,
      invitation_record.parent_email,
      false,
      error_context,
      true,
      jsonb_build_object('error_type', 'network_error', 'sqlstate', SQLSTATE, 'function', 'send_confirmation_email_rpc')
    );
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Email sending failed due to network error',
      'error', error_context,
      'fallback', true,
      'sqlstate', SQLSTATE
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced invitation email RPC function
CREATE OR REPLACE FUNCTION send_invitation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_role_key text;
  http_response record;
  error_context text;
BEGIN
  -- Get invitation data
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    PERFORM log_email_event(
      'invitation_email_error',
      invitation_id_param,
      'unknown',
      false,
      'Invitation not found',
      false,
      jsonb_build_object('function', 'send_invitation_email_rpc')
    );
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  IF invitation_record.status != 'approved' THEN
    PERFORM log_email_event(
      'invitation_email_error',
      invitation_record.id,
      invitation_record.parent_email,
      false,
      'Invitation not approved',
      false,
      jsonb_build_object('status', invitation_record.status, 'function', 'send_invitation_email_rpc')
    );
    RETURN json_build_object('success', false, 'error', 'Invitation must be approved first');
  END IF;
  
  -- Get configuration parameters with graceful handling
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- Check if configuration is available
  IF supabase_url IS NULL OR supabase_url = '' OR 
     service_role_key IS NULL OR service_role_key = '' THEN
    -- Configuration not available, mark as queued for fallback handling
    PERFORM log_email_event(
      'invitation_email_queued',
      invitation_record.id,
      invitation_record.parent_email,
      false,
      'Configuration not available',
      true,
      jsonb_build_object('function', 'send_invitation_email_rpc')
    );
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Email queued for sending - configuration not available', 
      'fallback', true
    );
  END IF;
  
  -- Call the Edge Function using pg_net with enhanced error handling
  BEGIN
    SELECT * INTO http_response FROM net.http_post(
      url := supabase_url || '/functions/v1/send-invitation-approved',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'invitationId', invitation_record.id::text,
        'parentEmail', invitation_record.parent_email,
        'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
        'childName', COALESCE(invitation_record.child_name, 'Child')
      ),
      timeout_milliseconds := 15000
    );
    
    -- Check HTTP response status
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Success - update timestamp and log success
      UPDATE invitation_requests 
      SET invitation_email_sent_at = NOW() 
      WHERE id = invitation_id_param;
      
      PERFORM log_email_event(
        'invitation_email_sent',
        invitation_record.id,
        invitation_record.parent_email,
        true,
        NULL,
        false,
        jsonb_build_object('http_status', http_response.status_code, 'function', 'send_invitation_email_rpc')
      );
      
      RETURN json_build_object(
        'success', true, 
        'message', 'Invitation email sent successfully',
        'http_status', http_response.status_code
      );
      
    ELSE
      -- HTTP error - log and return error details
      error_context := format('HTTP %s: %s', http_response.status_code, COALESCE(http_response.content, 'No response content'));
      
      PERFORM log_email_event(
        'invitation_email_failed',
        invitation_record.id,
        invitation_record.parent_email,
        false,
        error_context,
        true,
        jsonb_build_object('http_status', http_response.status_code, 'function', 'send_invitation_email_rpc')
      );
      
      RETURN json_build_object(
        'success', false, 
        'message', 'Email sending failed',
        'error', error_context,
        'fallback', true,
        'http_status', http_response.status_code
      );
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Network or other error - log and return error for fallback handling
    error_context := format('Network error: %s (SQLSTATE: %s)', SQLERRM, SQLSTATE);
    
    PERFORM log_email_event(
      'invitation_email_failed',
      invitation_record.id,
      invitation_record.parent_email,
      false,
      error_context,
      true,
      jsonb_build_object('error_type', 'network_error', 'sqlstate', SQLSTATE, 'function', 'send_invitation_email_rpc')
    );
    
    RETURN json_build_object(
      'success', false, 
      'message', 'Email sending failed due to network error',
      'error', error_context,
      'fallback', true,
      'sqlstate', SQLSTATE
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for updated functions
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO service_role;