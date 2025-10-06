-- Fix RPC functions to work with existing email_events table structure
CREATE OR REPLACE FUNCTION send_confirmation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_role_key text;
  http_response record;
BEGIN
  -- Get invitation data
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Get configuration parameters from system_configuration table
  supabase_url := get_config_setting('app.supabase_url');
  service_role_key := get_config_setting('app.service_role_key');
  
  -- Validate configuration
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Supabase URL not configured',
      'fallback_required', true
    );
  END IF;
  
  IF service_role_key IS NULL OR service_role_key = '' OR service_role_key = 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Service role key not configured',
      'fallback_required', true
    );
  END IF;
  
  -- Call the Edge Function using pg_net
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
      )
    );
    
    -- Check if the HTTP request was successful
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Update confirmation email timestamp
      UPDATE invitation_requests 
      SET confirmation_email_sent_at = NOW() 
      WHERE id = invitation_id_param;
      
      -- Log successful email using existing table structure
      INSERT INTO email_events (type, email, template, metadata)
      VALUES (
        'sent',
        invitation_record.parent_email,
        'invitation_confirmation',
        jsonb_build_object(
          'invitation_id', invitation_id_param,
          'method', 'rpc_call',
          'status_code', http_response.status_code,
          'function', 'send_confirmation_email_rpc'
        )
      );
      
      RETURN json_build_object('success', true, 'message', 'Confirmation email sent successfully');
    ELSE
      -- Log failed email using existing table structure
      INSERT INTO email_events (type, email, template, error, metadata)
      VALUES (
        'failed',
        invitation_record.parent_email,
        'invitation_confirmation',
        'HTTP request failed with status: ' || http_response.status_code,
        jsonb_build_object(
          'invitation_id', invitation_id_param,
          'method', 'rpc_call',
          'status_code', http_response.status_code,
          'function', 'send_confirmation_email_rpc'
        )
      );
      
      RETURN json_build_object(
        'success', false, 
        'error', 'HTTP request failed with status: ' || http_response.status_code,
        'fallback_required', true
      );
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error using existing table structure
    INSERT INTO email_events (type, email, template, error, metadata)
    VALUES (
      'error',
      invitation_record.parent_email,
      'invitation_confirmation',
      'RPC function error: ' || SQLERRM,
      jsonb_build_object(
        'invitation_id', invitation_id_param,
        'method', 'rpc_call',
        'sqlstate', SQLSTATE,
        'function', 'send_confirmation_email_rpc'
      )
    );
    
    RETURN json_build_object(
      'success', false, 
      'error', 'Network or authentication error: ' || SQLERRM,
      'fallback_required', true
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix invitation email RPC function
CREATE OR REPLACE FUNCTION send_invitation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_role_key text;
  http_response record;
BEGIN
  -- Get invitation data
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  IF invitation_record.status != 'approved' THEN
    RETURN json_build_object('success', false, 'error', 'Invitation must be approved first');
  END IF;
  
  -- Get configuration parameters from system_configuration table
  supabase_url := get_config_setting('app.supabase_url');
  service_role_key := get_config_setting('app.service_role_key');
  
  -- Validate configuration
  IF supabase_url IS NULL OR supabase_url = '' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Supabase URL not configured',
      'fallback_required', true
    );
  END IF;
  
  IF service_role_key IS NULL OR service_role_key = '' OR service_role_key = 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Service role key not configured',
      'fallback_required', true
    );
  END IF;
  
  -- Call the Edge Function using pg_net
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
      )
    );
    
    -- Check if the HTTP request was successful
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Update invitation email timestamp
      UPDATE invitation_requests 
      SET invitation_email_sent_at = NOW() 
      WHERE id = invitation_id_param;
      
      -- Log successful email using existing table structure
      INSERT INTO email_events (type, email, template, metadata)
      VALUES (
        'sent',
        invitation_record.parent_email,
        'invitation_approved',
        jsonb_build_object(
          'invitation_id', invitation_id_param,
          'method', 'rpc_call',
          'status_code', http_response.status_code,
          'function', 'send_invitation_email_rpc'
        )
      );
      
      RETURN json_build_object('success', true, 'message', 'Invitation email sent successfully');
    ELSE
      -- Log failed email using existing table structure
      INSERT INTO email_events (type, email, template, error, metadata)
      VALUES (
        'failed',
        invitation_record.parent_email,
        'invitation_approved',
        'HTTP request failed with status: ' || http_response.status_code,
        jsonb_build_object(
          'invitation_id', invitation_id_param,
          'method', 'rpc_call',
          'status_code', http_response.status_code,
          'function', 'send_invitation_email_rpc'
        )
      );
      
      RETURN json_build_object(
        'success', false, 
        'error', 'HTTP request failed with status: ' || http_response.status_code,
        'fallback_required', true
      );
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error using existing table structure
    INSERT INTO email_events (type, email, template, error, metadata)
    VALUES (
      'error',
      invitation_record.parent_email,
      'invitation_approved',
      'RPC function error: ' || SQLERRM,
      jsonb_build_object(
        'invitation_id', invitation_id_param,
        'method', 'rpc_call',
        'sqlstate', SQLSTATE,
        'function', 'send_invitation_email_rpc'
      )
    );
    
    RETURN json_build_object(
      'success', false, 
      'error', 'Network or authentication error: ' || SQLERRM,
      'fallback_required', true
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
