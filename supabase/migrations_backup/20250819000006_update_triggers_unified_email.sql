-- Update Database Triggers to Use Enhanced send-email Function
-- This migration updates the database triggers and RPC functions to use the unified
-- send-email Edge Function with 'invitation_approved' type instead of the separate
-- send-invitation-approved function

-- Update the send_invitation_email trigger function to use unified send-email function
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send invitation email when status changes to 'approved'
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Call the unified send-email Edge Function with 'invitation_approved' type
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
          'X-Function-Source', 'database_trigger'
        ),
        body := jsonb_build_object(
          'type', 'invitation_approved',
          'to', NEW.parent_email,
          'templateData', jsonb_build_object(
            'parentName', COALESCE(NEW.parent_name, 'Parent'),
            'childName', COALESCE(NEW.child_name, 'Child'),
            'invitationId', NEW.id::text
          )
        )
      );
    
    -- Update the invitation email timestamp
    UPDATE invitation_requests 
    SET invitation_email_sent_at = NOW() 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the send_invitation_email_rpc function to use unified send-email function
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
    PERFORM log_email_event(
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
  PERFORM log_email_event(
    'rpc_attempt',
    'unknown',
    'invitation_approved',
    NULL,
    NULL,
    jsonb_build_object(
      'function', 'send_invitation_email_rpc',
      'invitation_id', invitation_id_param::text,
      'timestamp', NOW(),
      'method', 'unified_send_email'
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
    
    PERFORM log_email_event(
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
    
    PERFORM log_email_event(
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
    
    PERFORM log_email_event(
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
    
    PERFORM log_email_event(
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
    
    PERFORM log_email_event(
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

  -- Attempt to call unified send-email Edge Function using pg_net
  BEGIN
    -- Log the attempt
    PERFORM log_email_event(
      'sending',
      invitation_record.parent_email,
      'invitation_approved',
      NULL,
      NULL,
      jsonb_build_object(
        'function', 'send_invitation_email_rpc',
        'method', 'unified_send_email',
        'url', supabase_url || '/functions/v1/send-email',
        'invitation_id', invitation_id_param::text
      )
    );

    -- Make HTTP request to unified send-email Edge Function
    SELECT * INTO http_response FROM net.http_post(
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
    );

    -- Check HTTP response status
    IF http_response.status_code BETWEEN 200 AND 299 THEN
      -- Success - update timestamp and log success
      UPDATE invitation_requests 
      SET invitation_email_sent_at = NOW() 
      WHERE id = invitation_id_param;
      
      event_id := log_email_event(
        'sent',
        invitation_record.parent_email,
        'invitation_approved',
        'rpc_' || invitation_id_param::text,
        NULL,
        jsonb_build_object(
          'function', 'send_invitation_email_rpc',
          'method', 'unified_send_email',
          'status_code', http_response.status_code,
          'response_body', http_response.content,
          'invitation_id', invitation_id_param::text
        )
      );
      
      RETURN json_build_object(
        'success', true,
        'message', 'Invitation email sent successfully via unified send-email function',
        'method', 'unified_send_email',
        'event_id', event_id,
        'sent_at', NOW()
      );
    ELSE
      -- HTTP error - log and return error
      error_message := 'Unified send-email function returned error status: ' || http_response.status_code::text;
      
      PERFORM log_email_event(
        'failed',
        invitation_record.parent_email,
        'invitation_approved',
        NULL,
        error_message,
        jsonb_build_object(
          'function', 'send_invitation_email_rpc',
          'method', 'unified_send_email',
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
    error_message := 'Failed to call unified send-email Edge Function: ' || SQLERRM;
    
    PERFORM log_email_event(
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

-- Create a helper function to send emails via unified send-email function
-- This can be used by other parts of the system that need to send emails
CREATE OR REPLACE FUNCTION send_email_via_function(
  email_type text,
  recipient_email text,
  template_data jsonb
)
RETURNS json AS $$
DECLARE
  supabase_url text;
  service_key text;
  config_validation json;
  http_response record;
  error_message text;
BEGIN
  -- Validate configuration
  SELECT validate_email_configuration() INTO config_validation;
  
  IF NOT (config_validation->>'configuration_valid')::boolean THEN
    RETURN json_build_object(
      'success', false,
      'error', 'configuration_invalid',
      'message', 'Email system configuration is invalid'
    );
  END IF;

  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');

  -- Validate inputs
  IF email_type IS NULL OR recipient_email IS NULL OR template_data IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'email_type, recipient_email, and template_data are required'
    );
  END IF;

  -- Call unified send-email Edge Function
  BEGIN
    SELECT * INTO http_response FROM net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key,
        'X-Function-Source', 'helper_function'
      ),
      body := jsonb_build_object(
        'type', email_type,
        'to', recipient_email,
        'templateData', template_data
      )
    );

    IF http_response.status_code BETWEEN 200 AND 299 THEN
      RETURN json_build_object(
        'success', true,
        'message', 'Email sent successfully',
        'status_code', http_response.status_code
      );
    ELSE
      RETURN json_build_object(
        'success', false,
        'error', 'edge_function_error',
        'message', 'Edge Function returned error status: ' || http_response.status_code::text,
        'status_code', http_response.status_code,
        'response_body', http_response.content
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'network_error',
      'message', 'Failed to call Edge Function: ' || SQLERRM,
      'sql_error', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the test_rpc_functions to test the unified approach
CREATE OR REPLACE FUNCTION test_rpc_functions()
RETURNS json AS $$
DECLARE
  config_validation json;
  test_invitation_id uuid;
  confirmation_result json;
  invitation_result json;
  unified_test_result json;
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
    'timestamp', NOW(),
    'unified_approach', true
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
    
    -- Test invitation email RPC with unified approach
    BEGIN
      SELECT send_invitation_email_rpc(test_invitation_id) INTO invitation_result;
      overall_result := overall_result || json_build_object('invitation_test_unified', invitation_result);
    EXCEPTION WHEN OTHERS THEN
      overall_result := overall_result || json_build_object(
        'invitation_test_unified', 
        json_build_object('success', false, 'error', SQLERRM)
      );
    END;

    -- Test the helper function directly
    BEGIN
      SELECT send_email_via_function(
        'invitation_approved',
        'test@example.com',
        jsonb_build_object(
          'parentName', 'Test Parent',
          'childName', 'Test Child',
          'invitationId', test_invitation_id::text
        )
      ) INTO unified_test_result;
      overall_result := overall_result || json_build_object('unified_helper_test', unified_test_result);
    EXCEPTION WHEN OTHERS THEN
      overall_result := overall_result || json_build_object(
        'unified_helper_test', 
        json_build_object('success', false, 'error', SQLERRM)
      );
    END;
  END IF;
  
  RETURN overall_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION send_email_via_function(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION send_email_via_function(text, text, jsonb) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION send_invitation_email() IS 'Updated trigger function to use unified send-email Edge Function with invitation_approved type';
COMMENT ON FUNCTION send_invitation_email_rpc(uuid) IS 'Updated RPC function to use unified send-email Edge Function with invitation_approved type';
COMMENT ON FUNCTION send_email_via_function(text, text, jsonb) IS 'Helper function to send emails via unified send-email Edge Function';

-- Log the migration completion
DO $$
BEGIN
  PERFORM log_email_event(
    'migration',
    'system',
    'trigger_unification',
    NULL,
    NULL,
    jsonb_build_object(
      'migration', '20250819000006_update_triggers_unified_email',
      'description', 'Updated database triggers to use unified send-email function with invitation_approved type',
      'changes', jsonb_build_array(
        'Updated send_invitation_email trigger function',
        'Updated send_invitation_email_rpc function', 
        'Added send_email_via_function helper',
        'Updated test_rpc_functions for unified approach'
      ),
      'timestamp', NOW()
    )
  );
  
  RAISE NOTICE 'Database triggers updated to use unified send-email function successfully';
END $$;