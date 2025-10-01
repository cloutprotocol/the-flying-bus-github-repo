-- Enhanced RPC Functions with Proper Authentication and Error Handling
-- This migration updates the existing RPC functions to use proper configuration retrieval,
-- comprehensive error handling, input validation, and detailed logging

-- Create a safe wrapper for log_email_event that handles cases where the function doesn't exist yet
CREATE OR REPLACE FUNCTION safe_log_email_event(
  p_status TEXT,
  p_email TEXT,
  p_type TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $
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
$ LANGUAGE plpgsql;

-- Drop existing functions to recreate with enhancements
DROP FUNCTION IF EXISTS send_confirmation_email_rpc(uuid);
DROP FUNCTION IF EXISTS send_invitation_email_rpc(uuid);

-- Enhanced function to send confirmation email via Edge Function
CREATE OR REPLACE FUNCTION send_confirmation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_key text;
  config_validation json;
  http_response record;
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
    SELECT * INTO http_response FROM net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key,
        'X-Function-Source', 'rpc_function'
      ),
      body := jsonb_build_object(
        'type', 'invitation_confirmation',
        'to', invitation_record.parent_email,
        'templateData', jsonb_build_object(
          'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
          'childName', COALESCE(invitation_record.child_name, 'Child'),
          'submissionDate', to_char(invitation_record.created_at, 'Month DD, YYYY'),
          'invitationId', invitation_id_param::text
        )
      )
    );

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

-- Enhanced function to send invitation email when approved
CREATE OR REPLACE FUNCTION send_invitation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_key text;
  config_validation json;
  http_response record;
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

  -- Log RPC call attempt
  PERFORM safe_log_email_event(
    'rpc_attempt',
    'unknown',
    'invitation_approved',
    NULL,
    NULL,
    jsonb_build_object(
      'function', 'send_invitation_email_rpc',
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
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
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
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
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

  -- Validate invitation status
  IF invitation_record.status != 'approved' THEN
    error_message := 'Invitation must be approved before sending invitation email. Current status: ' || 
                    COALESCE(invitation_record.status, 'null');
    
    PERFORM safe_log_email_event(
      'failed',
      COALESCE(invitation_record.parent_email, 'unknown'),
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'error_type', 'invalid_status',
        'current_status', invitation_record.status,
        'invitation_id', invitation_id_param::text
      )
    );
    
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
    
    PERFORM safe_log_email_event(
      'failed',
      COALESCE(invitation_record.parent_email, 'unknown'),
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
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

  -- Check if invitation email was already sent recently (within last hour)
  IF invitation_record.invitation_email_sent_at IS NOT NULL AND 
     invitation_record.invitation_email_sent_at > NOW() - INTERVAL '1 hour' THEN
    
    PERFORM safe_log_email_event(
      'skipped',
      invitation_record.parent_email,
      'invitation_approved',
      NULL,
      'Invitation email already sent recently',
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'last_sent', invitation_record.invitation_email_sent_at,
        'invitation_id', invitation_id_param::text
      )
    );
    
    RETURN json_build_object(
      'success', true,
      'message', 'Invitation email already sent recently',
      'last_sent_at', invitation_record.invitation_email_sent_at,
      'skipped', true
    );
  END IF;

  -- Attempt to call Edge Function using pg_net
  BEGIN
    -- Log the attempt
    PERFORM safe_log_email_event(
      'sending',
      invitation_record.parent_email,
      'invitation_approved',
      NULL,
      NULL,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'method', 'pg_net',
        'url', supabase_url || '/functions/v1/send-invitation-approved',
        'invitation_id', invitation_id_param::text
      )
    );

    -- Make HTTP request to Edge Function
    SELECT * INTO http_response FROM net.http_post(
      url := supabase_url || '/functions/v1/send-invitation-approved',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key,
        'X-Function-Source', 'rpc_function'
      ),
      body := jsonb_build_object(
        'invitationId', invitation_id_param::text,
        'parentEmail', invitation_record.parent_email,
        'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
        'childName', COALESCE(invitation_record.child_name, 'Child')
      )
    );

    -- Check HTTP response status
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Success - update timestamp and log success
      UPDATE invitation_requests 
      SET invitation_email_sent_at = NOW() 
      WHERE id = invitation_id_param;
      
      event_id := safe_log_email_event(
        'sent',
        invitation_record.parent_email,
        'invitation_approved',
        'rpc_' || invitation_id_param::text,
        NULL,
        jsonb_build_object(
          'function', 'send_invitation_email_rpc',
          'method', 'pg_net',
          'status_code', http_response.status_code,
          'response_body', http_response.content,
          'invitation_id', invitation_id_param::text
        )
      );
      
      RETURN json_build_object(
        'success', true,
        'message', 'Invitation email sent successfully',
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
        'invitation_approved',
        NULL,
        error_message,
        jsonb_build_object(
          'function', 'send_invitation_email_rpc',
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
      'invitation_approved',
      NULL,
      error_message,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
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

-- Create a helper function to test RPC functions with validation
CREATE OR REPLACE FUNCTION test_rpc_functions()
RETURNS json AS $$
DECLARE
  config_validation json;
  test_invitation_id uuid;
  confirmation_result json;
  invitation_result json;
  overall_result json;
BEGIN
  -- First validate configuration
  SELECT validate_email_configuration() INTO config_validation;
  
  -- Get a test invitation ID (preferably one that's approved)
  SELECT id INTO test_invitation_id 
  FROM invitation_requests 
  WHERE status = 'approved' 
  LIMIT 1;
  
  IF test_invitation_id IS NULL THEN
    -- Try to get any invitation ID for testing
    SELECT id INTO test_invitation_id 
    FROM invitation_requests 
    LIMIT 1;
  END IF;
  
  -- Build overall result
  overall_result := json_build_object(
    'configuration_valid', (config_validation->>'configuration_valid')::boolean,
    'config_details', config_validation,
    'test_invitation_id', COALESCE(test_invitation_id::text, 'none_available'),
    'timestamp', NOW()
  );
  
  -- If we have a test invitation, try the functions
  IF test_invitation_id IS NOT NULL THEN
    -- Test confirmation email RPC (safe to test multiple times)
    BEGIN
      SELECT send_confirmation_email_rpc(test_invitation_id) INTO confirmation_result;
      overall_result := overall_result || json_build_object('confirmation_test', confirmation_result);
    EXCEPTION WHEN OTHERS THEN
      overall_result := overall_result || json_build_object(
        'confirmation_test', 
        json_build_object('success', false, 'error', SQLERRM)
      );
    END;
    
    -- Only test invitation email RPC if the invitation is approved
    BEGIN
      SELECT send_invitation_email_rpc(test_invitation_id) INTO invitation_result;
      overall_result := overall_result || json_build_object('invitation_test', invitation_result);
    EXCEPTION WHEN OTHERS THEN
      overall_result := overall_result || json_build_object(
        'invitation_test', 
        json_build_object('success', false, 'error', SQLERRM)
      );
    END;
  END IF;
  
  RETURN overall_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on enhanced functions
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION test_rpc_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION test_rpc_functions() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION send_confirmation_email_rpc(uuid) IS 'Enhanced RPC function to send confirmation email with proper authentication, validation, and error handling';
COMMENT ON FUNCTION send_invitation_email_rpc(uuid) IS 'Enhanced RPC function to send invitation email with proper authentication, validation, and error handling';
COMMENT ON FUNCTION test_rpc_functions() IS 'Test function to validate RPC functions and configuration';

-- Log the migration completion
DO $$
BEGIN
  PERFORM safe_log_email_event(
    'migration',
    'system',
    'rpc_enhancement',
    NULL,
    NULL,
    jsonb_build_object(
      'migration', '20250819000005_enhance_rpc_functions',
      'description', 'Enhanced RPC functions with proper authentication and error handling',
      'timestamp', NOW()
    )
  );
  
  RAISE NOTICE 'Enhanced RPC functions migration completed successfully';
END $$;

-- Clean up the safe wrapper function since it's no longer needed
DROP FUNCTION IF EXISTS safe_log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);