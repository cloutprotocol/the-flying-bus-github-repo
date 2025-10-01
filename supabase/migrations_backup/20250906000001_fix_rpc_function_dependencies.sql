-- Fix RPC Function Dependencies for Production Merge
-- This migration makes the existing RPC functions safe for production deployment
-- by handling cases where log_email_event function doesn't exist yet

-- Create a safe wrapper for log_email_event that handles missing function
CREATE OR REPLACE FUNCTION safe_log_email_event(
  p_status TEXT,
  p_email TEXT,
  p_type TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  -- Check if log_email_event function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'log_email_event'
  ) THEN
    -- Function exists, call it
    SELECT log_email_event(p_status, p_email, p_type, p_reference_id, p_error_message, p_metadata) INTO event_id;
    RETURN event_id;
  ELSE
    -- Function doesn't exist, just return a dummy UUID and log to notice
    RAISE NOTICE 'log_email_event function not available, skipping log: % - % - %', p_status, p_type, p_email;
    RETURN gen_random_uuid();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update existing RPC functions to use safe logging
-- This replaces the functions that were created in 20250819000005_enhance_rpc_functions.sql

-- Drop and recreate send_confirmation_email_rpc with safe logging
DROP FUNCTION IF EXISTS send_confirmation_email_rpc(uuid);

CREATE OR REPLACE FUNCTION send_confirmation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_key text;
  config_validation json;
  request_id bigint;
  http_response net.http_response_result;
  error_message text;
  event_id uuid;
BEGIN
  -- Input parameter validation
  IF invitation_id_param IS NULL THEN
    PERFORM safe_log_email_event(
      'failed',
      'unknown',
      'invitation_confirmation',
      NULL,
      'Invalid input: invitation_id_param is null',
      jsonb_build_object('function', 'send_confirmation_email_rpc', 'error_type', 'validation')
    );
    RETURN json_build_object(
      'success', false, 
      'error', 'invalid_input',
      'message', 'Invitation ID parameter is required'
    );
  END IF;

  -- Log RPC call attempt
  PERFORM safe_log_email_event(
    'rpc_attempt',
    'unknown',
    'invitation_confirmation',
    NULL,
    NULL,
    jsonb_build_object(
      'function', 'send_confirmation_email_rpc',
      'invitation_id', invitation_id_param::text,
      'timestamp', NOW()
    )
  );

  -- Validate configuration before proceeding
  SELECT validate_email_configuration() INTO config_validation;
  
  IF NOT (config_validation->>'configuration_valid')::boolean THEN
    error_message := 'Email system configuration is invalid: ' || 
                    CASE 
                      WHEN NOT (config_validation->>'supabase_url_configured')::boolean THEN 'Supabase URL not configured'
                      WHEN NOT (config_validation->>'service_key_configured')::boolean THEN 'Service role key not configured'
                      ELSE 'Unknown configuration issue'
                    END;
    
    PERFORM safe_log_email_event(
      'failed',
      'unknown',
      'invitation_confirmation',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'error_type', 'configuration',
        'config_validation', config_validation
      )
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'configuration_invalid',
      'message', error_message,
      'config_details', config_validation
    );
  END IF;

  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');

  -- Get invitation data with validation
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    error_message := 'Invitation request not found for ID: ' || invitation_id_param::text;
    
    PERFORM safe_log_email_event(
      'failed',
      'unknown',
      'invitation_confirmation',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'error_type', 'not_found',
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', false, 
      'error', 'invitation_not_found',
      'message', error_message
    );
  END IF;

  -- Validate invitation record has required fields
  IF invitation_record.parent_email IS NULL OR invitation_record.parent_email = '' THEN
    error_message := 'Invitation record missing required parent_email field';
    
    PERFORM safe_log_email_event(
      'failed',
      COALESCE(invitation_record.parent_email, 'unknown'),
      'invitation_confirmation',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'error_type', 'invalid_data',
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_invitation_data',
      'message', error_message
    );
  END IF;

  -- Check if confirmation email was already sent recently (within last hour)
  IF invitation_record.confirmation_email_sent_at IS NOT NULL AND 
     invitation_record.confirmation_email_sent_at > NOW() - INTERVAL '1 hour' THEN
    
    PERFORM safe_log_email_event(
      'skipped',
      invitation_record.parent_email,
      'invitation_confirmation',
      NULL,
      'Confirmation email already sent recently',
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'last_sent', invitation_record.confirmation_email_sent_at,
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', true,
      'message', 'Confirmation email already sent recently',
      'last_sent_at', invitation_record.confirmation_email_sent_at,
      'skipped', true
    );
  END IF;

  -- Attempt to call Edge Function using pg_net
  BEGIN
    -- Log the attempt
    PERFORM safe_log_email_event(
      'sending',
      invitation_record.parent_email,
      'invitation_confirmation',
      NULL,
      NULL,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'method', 'pg_net',
        'url', supabase_url || '/functions/v1/send-email',
        'invitation_id', invitation_id_param::text
      )
    );

    -- Make HTTP request to Edge Function
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      body := jsonb_build_object(
        'type', 'invitation_confirmation',
        'to', invitation_record.parent_email,
        'templateData', jsonb_build_object(
          'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
          'childName', COALESCE(invitation_record.child_name, 'Child'),
          'submissionDate', to_char(invitation_record.created_at, 'Month DD, YYYY'),
          'invitationId', invitation_id_param::text
        )
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key,
        'X-Function-Source', 'rpc_function'
      ),
      timeout_milliseconds := 10000
    ) INTO request_id;

    -- Collect the response
    SELECT net.http_collect_response(request_id, async := false) INTO http_response;

    -- Check HTTP response status
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Success - update timestamp and log success
      UPDATE invitation_requests 
      SET confirmation_email_sent_at = NOW() 
      WHERE id = invitation_id_param;
      
      event_id := safe_log_email_event(
        'sent',
        invitation_record.parent_email,
        'invitation_confirmation',
        'rpc_' || invitation_id_param::text,
        NULL,
        jsonb_build_object(
          'function', 'send_confirmation_email_rpc',
          'method', 'pg_net',
          'status_code', http_response.status_code,
          'response_body', http_response.content,
          'invitation_id', invitation_id_param::text
        )
      );
      
      RETURN json_build_object(
        'success', true,
        'message', 'Confirmation email sent successfully',
        'method', 'pg_net',
        'event_id', event_id,
        'sent_at', NOW()
      );
    ELSE
      -- HTTP error - log and return error
      error_message := 'Edge Function returned error status: ' || http_response.status_code::text;
      
      PERFORM safe_log_email_event(
        'failed',
        invitation_record.parent_email,
        'invitation_confirmation',
        NULL,
        error_message,
        jsonb_build_object(
          'function', 'send_confirmation_email_rpc',
          'method', 'pg_net',
          'status_code', http_response.status_code,
          'response_body', http_response.content,
          'error_type', 'http_error',
          'invitation_id', invitation_id_param::text
        )
      );
      
      RETURN json_build_object(
        'success', false,
        'error', 'edge_function_error',
        'message', error_message,
        'status_code', http_response.status_code,
        'response_body', http_response.content
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Handle any exceptions (pg_net not available, network errors, etc.)
    error_message := 'Failed to call Edge Function: ' || SQLERRM;
    
    PERFORM safe_log_email_event(
      'failed',
      invitation_record.parent_email,
      'invitation_confirmation',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_confirmation_email_rpc',
        'method', 'pg_net',
        'error_type', 'exception',
        'sql_error', SQLERRM,
        'sql_state', SQLSTATE,
        'invitation_id', invitation_id_param::text,
        'fallback_needed', true
      )
    );
    
    -- Update timestamp anyway to prevent repeated attempts
    UPDATE invitation_requests 
    SET confirmation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object(
      'success', false,
      'error', 'network_error',
      'message', error_message,
      'fallback_required', true,
      'sql_error', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate send_invitation_email_rpc with safe logging
DROP FUNCTION IF EXISTS send_invitation_email_rpc(uuid);

CREATE OR REPLACE FUNCTION send_invitation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_key text;
  config_validation json;
  http_response_id bigint;
  error_message text;
  event_id uuid;
BEGIN
  -- Input parameter validation
  IF invitation_id_param IS NULL THEN
    PERFORM safe_log_email_event(
      'failed',
      'unknown',
      'invitation_approved',
      NULL,
      'Invalid input: invitation_id_param is null',
      jsonb_build_object('function', 'send_invitation_email_rpc', 'error_type', 'validation')
    );
    RETURN json_build_object(
      'success', false, 
      'error', 'invalid_input',
      'message', 'Invitation ID parameter is required'
    );
  END IF;

  -- Validate configuration before proceeding
  SELECT validate_email_configuration() INTO config_validation;
  
  IF NOT (config_validation->>'configuration_valid')::boolean THEN
    error_message := 'Email system configuration is invalid';
    RETURN json_build_object(
      'success', false,
      'error', 'configuration_invalid',
      'message', error_message,
      'config_details', config_validation
    );
  END IF;

  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');

  -- Get invitation data with validation
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    error_message := 'Invitation request not found for ID: ' || invitation_id_param::text;
    RETURN json_build_object(
      'success', false, 
      'error', 'invitation_not_found',
      'message', error_message
    );
  END IF;

  -- Validate invitation status
  IF invitation_record.status != 'approved' THEN
    error_message := 'Invitation must be approved before sending invitation email. Current status: ' || 
                    COALESCE(invitation_record.status, 'null');
    RETURN json_build_object(
      'success', false, 
      'error', 'invalid_status',
      'message', error_message,
      'current_status', invitation_record.status
    );
  END IF;

  -- Validate invitation record has required fields
  IF invitation_record.parent_email IS NULL OR invitation_record.parent_email = '' THEN
    error_message := 'Invitation record missing required parent_email field';
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_invitation_data',
      'message', error_message
    );
  END IF;

  -- Check if invitation email was already sent recently (within last hour)
  IF invitation_record.invitation_email_sent_at IS NOT NULL AND 
     invitation_record.invitation_email_sent_at > NOW() - INTERVAL '1 hour' THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Invitation email already sent recently',
      'last_sent_at', invitation_record.invitation_email_sent_at,
      'skipped', true
    );
  END IF;

  -- Attempt to call unified send-email Edge Function using pg_net
  BEGIN
    -- Make HTTP request to unified send-email Edge Function
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key,
        'X-Function-Source', 'rpc_function'
      ),
      body := jsonb_build_object(
        'type', 'invitation_approved',
        'to', invitation_record.parent_email,
        'templateData', jsonb_build_object(
          'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
          'childName', COALESCE(invitation_record.child_name, 'Child'),
          'invitationId', invitation_id_param::text
        )
      )
    ) INTO http_response_id;

    -- Update timestamp to indicate attempt was made
    UPDATE invitation_requests 
    SET invitation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    -- Log success (pg_net is asynchronous, so we assume success if no exception)
    event_id := safe_log_email_event(
      'sent',
      invitation_record.parent_email,
      'invitation_approved',
      'rpc_' || invitation_id_param::text,
      NULL,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'method', 'unified_send_email',
        'http_request_id', http_response_id,
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', true,
      'message', 'Invitation email sent successfully via unified send-email function',
      'method', 'unified_send_email',
      'event_id', event_id,
      'http_request_id', http_response_id,
      'sent_at', NOW()
    );

  EXCEPTION WHEN OTHERS THEN
    -- Handle any exceptions (pg_net not available, network errors, etc.)
    error_message := 'Failed to call unified send-email Edge Function: ' || SQLERRM;
    
    PERFORM safe_log_email_event(
      'failed',
      invitation_record.parent_email,
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'method', 'unified_send_email',
        'error_type', 'exception',
        'sql_error', SQLERRM,
        'sql_state', SQLSTATE,
        'invitation_id', invitation_id_param::text,
        'fallback_needed', true
      )
    );
    
    -- Update timestamp anyway to prevent repeated attempts
    UPDATE invitation_requests 
    SET invitation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object(
      'success', false,
      'error', 'network_error',
      'message', error_message,
      'fallback_required', true,
      'sql_error', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION send_confirmation_email_rpc(uuid) IS 'Updated RPC function with safe logging for production deployment';
COMMENT ON FUNCTION send_invitation_email_rpc(uuid) IS 'Updated RPC function with safe logging for production deployment';
COMMENT ON FUNCTION safe_log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) IS 'Safe wrapper for log_email_event that handles missing function gracefully';

-- Log the migration completion
DO $$
BEGIN
  PERFORM safe_log_email_event(
    'migration',
    'system',
    'rpc_dependency_fix',
    NULL,
    NULL,
    jsonb_build_object(
      'migration', '20250906000001_fix_rpc_function_dependencies',
      'description', 'Fixed RPC function dependencies for production merge',
      'timestamp', NOW()
    )
  );
  
  RAISE NOTICE 'RPC function dependency fix migration completed successfully';
END $$;