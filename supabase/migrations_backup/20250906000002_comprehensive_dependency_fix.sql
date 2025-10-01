-- Comprehensive Fix for All log_email_event Dependencies
-- This migration ensures all functions that call log_email_event are safe for production deployment

-- First, ensure we have the safe wrapper function
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

-- Create a safe migration logging function that can be used in DO blocks
CREATE OR REPLACE FUNCTION safe_log_migration_event(
  migration_name TEXT,
  description TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  PERFORM safe_log_email_event(
    'migration',
    'system',
    'migration_completion',
    NULL,
    NULL,
    jsonb_build_object(
      'migration', migration_name,
      'description', COALESCE(description, 'Migration completed'),
      'timestamp', NOW()
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Update ALL RPC functions to use safe logging
-- This ensures any function that might call log_email_event is safe

-- Update send_confirmation_email_rpc if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_confirmation_email_rpc') THEN
    -- Drop and recreate with safe logging
    DROP FUNCTION send_confirmation_email_rpc(uuid);
    
    -- Create the safe version (abbreviated for space, but includes all the logic)
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION send_confirmation_email_rpc(invitation_id_param uuid)
      RETURNS json AS $inner$
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
        -- All the same logic but using safe_log_email_event instead of log_email_event
        IF invitation_id_param IS NULL THEN
          PERFORM safe_log_email_event('failed', 'unknown', 'invitation_confirmation', NULL, 'Invalid input: invitation_id_param is null', jsonb_build_object('function', 'send_confirmation_email_rpc', 'error_type', 'validation'));
          RETURN json_build_object('success', false, 'error', 'invalid_input', 'message', 'Invitation ID parameter is required');
        END IF;

        -- Log RPC call attempt
        PERFORM safe_log_email_event('rpc_attempt', 'unknown', 'invitation_confirmation', NULL, NULL, jsonb_build_object('function', 'send_confirmation_email_rpc', 'invitation_id', invitation_id_param::text, 'timestamp', NOW()));

        -- Validate configuration
        SELECT validate_email_configuration() INTO config_validation;
        IF NOT (config_validation->>'configuration_valid')::boolean THEN
          error_message := 'Email system configuration is invalid';
          PERFORM safe_log_email_event('failed', 'unknown', 'invitation_confirmation', NULL, error_message, jsonb_build_object('function', 'send_confirmation_email_rpc', 'error_type', 'configuration'));
          RETURN json_build_object('success', false, 'error', 'configuration_invalid', 'message', error_message);
        END IF;

        -- Get configuration values
        supabase_url := get_config_setting('app.supabase_url');
        service_key := get_config_setting('app.service_role_key');

        -- Get invitation data
        SELECT * INTO invitation_record FROM invitation_requests WHERE id = invitation_id_param;
        IF NOT FOUND THEN
          error_message := 'Invitation request not found for ID: ' || invitation_id_param::text;
          PERFORM safe_log_email_event('failed', 'unknown', 'invitation_confirmation', NULL, error_message, jsonb_build_object('function', 'send_confirmation_email_rpc', 'error_type', 'not_found'));
          RETURN json_build_object('success', false, 'error', 'invitation_not_found', 'message', error_message);
        END IF;

        -- Validate email field
        IF invitation_record.parent_email IS NULL OR invitation_record.parent_email = '' THEN
          error_message := 'Invitation record missing required parent_email field';
          PERFORM safe_log_email_event('failed', COALESCE(invitation_record.parent_email, 'unknown'), 'invitation_confirmation', NULL, error_message, jsonb_build_object('function', 'send_confirmation_email_rpc', 'error_type', 'invalid_data'));
          RETURN json_build_object('success', false, 'error', 'invalid_invitation_data', 'message', error_message);
        END IF;

        -- Check if already sent recently
        IF invitation_record.confirmation_email_sent_at IS NOT NULL AND invitation_record.confirmation_email_sent_at > NOW() - INTERVAL '1 hour' THEN
          PERFORM safe_log_email_event('skipped', invitation_record.parent_email, 'invitation_confirmation', NULL, 'Confirmation email already sent recently', jsonb_build_object('function', 'send_confirmation_email_rpc', 'last_sent', invitation_record.confirmation_email_sent_at));
          RETURN json_build_object('success', true, 'message', 'Confirmation email already sent recently', 'skipped', true);
        END IF;

        -- Attempt to send email
        BEGIN
          PERFORM safe_log_email_event('sending', invitation_record.parent_email, 'invitation_confirmation', NULL, NULL, jsonb_build_object('function', 'send_confirmation_email_rpc', 'method', 'pg_net'));
          
          SELECT net.http_post(
            url := supabase_url || '/functions/v1/send-email',
            body := jsonb_build_object(
              'type', 'invitation_confirmation',
              'to', invitation_record.parent_email,
              'templateData', jsonb_build_object(
                'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
                'childName', COALESCE(invitation_record.child_name, 'Child'),
                'submissionDate', to_char(invitation_record.created_at, 'Month DD, YYYY')
              )
            ),
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || service_key
            ),
            timeout_milliseconds := 10000
          ) INTO request_id;

          SELECT net.http_collect_response(request_id, async := false) INTO http_response;

          IF http_response.status_code BETWEEN 200 AND 299 THEN
            UPDATE invitation_requests SET confirmation_email_sent_at = NOW() WHERE id = invitation_id_param;
            event_id := safe_log_email_event('sent', invitation_record.parent_email, 'invitation_confirmation', 'rpc_' || invitation_id_param::text, NULL, jsonb_build_object('function', 'send_confirmation_email_rpc', 'status_code', http_response.status_code));
            RETURN json_build_object('success', true, 'message', 'Confirmation email sent successfully', 'event_id', event_id);
          ELSE
            error_message := 'Edge Function returned error status: ' || http_response.status_code::text;
            PERFORM safe_log_email_event('failed', invitation_record.parent_email, 'invitation_confirmation', NULL, error_message, jsonb_build_object('function', 'send_confirmation_email_rpc', 'status_code', http_response.status_code));
            RETURN json_build_object('success', false, 'error', 'edge_function_error', 'message', error_message);
          END IF;

        EXCEPTION WHEN OTHERS THEN
          error_message := 'Failed to call Edge Function: ' || SQLERRM;
          PERFORM safe_log_email_event('failed', invitation_record.parent_email, 'invitation_confirmation', NULL, error_message, jsonb_build_object('function', 'send_confirmation_email_rpc', 'error_type', 'exception', 'sql_error', SQLERRM));
          UPDATE invitation_requests SET confirmation_email_sent_at = NOW() WHERE id = invitation_id_param;
          RETURN json_build_object('success', false, 'error', 'network_error', 'message', error_message);
        END;
      END;
      $inner$ LANGUAGE plpgsql SECURITY DEFINER;
    $func$;
    
    RAISE NOTICE 'Updated send_confirmation_email_rpc to use safe logging';
  END IF;
END $$;

-- Update send_invitation_email_rpc if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_invitation_email_rpc') THEN
    DROP FUNCTION send_invitation_email_rpc(uuid);
    
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION send_invitation_email_rpc(invitation_id_param uuid)
      RETURNS json AS $inner$
      DECLARE
        invitation_record record;
        supabase_url text;
        service_key text;
        config_validation json;
        http_response_id bigint;
        error_message text;
        event_id uuid;
      BEGIN
        IF invitation_id_param IS NULL THEN
          PERFORM safe_log_email_event('failed', 'unknown', 'invitation_approved', NULL, 'Invalid input: invitation_id_param is null', jsonb_build_object('function', 'send_invitation_email_rpc', 'error_type', 'validation'));
          RETURN json_build_object('success', false, 'error', 'invalid_input', 'message', 'Invitation ID parameter is required');
        END IF;

        SELECT validate_email_configuration() INTO config_validation;
        IF NOT (config_validation->>'configuration_valid')::boolean THEN
          error_message := 'Email system configuration is invalid';
          RETURN json_build_object('success', false, 'error', 'configuration_invalid', 'message', error_message);
        END IF;

        supabase_url := get_config_setting('app.supabase_url');
        service_key := get_config_setting('app.service_role_key');

        SELECT * INTO invitation_record FROM invitation_requests WHERE id = invitation_id_param;
        IF NOT FOUND THEN
          error_message := 'Invitation request not found for ID: ' || invitation_id_param::text;
          RETURN json_build_object('success', false, 'error', 'invitation_not_found', 'message', error_message);
        END IF;

        IF invitation_record.status != 'approved' THEN
          error_message := 'Invitation must be approved before sending invitation email';
          RETURN json_build_object('success', false, 'error', 'invalid_status', 'message', error_message);
        END IF;

        IF invitation_record.parent_email IS NULL OR invitation_record.parent_email = '' THEN
          error_message := 'Invitation record missing required parent_email field';
          RETURN json_build_object('success', false, 'error', 'invalid_invitation_data', 'message', error_message);
        END IF;

        IF invitation_record.invitation_email_sent_at IS NOT NULL AND invitation_record.invitation_email_sent_at > NOW() - INTERVAL '1 hour' THEN
          RETURN json_build_object('success', true, 'message', 'Invitation email already sent recently', 'skipped', true);
        END IF;

        BEGIN
          SELECT net.http_post(
            url := supabase_url || '/functions/v1/send-email',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || service_key
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

          UPDATE invitation_requests SET invitation_email_sent_at = NOW() WHERE id = invitation_id_param;
          event_id := safe_log_email_event('sent', invitation_record.parent_email, 'invitation_approved', 'rpc_' || invitation_id_param::text, NULL, jsonb_build_object('function', 'send_invitation_email_rpc', 'http_request_id', http_response_id));
          RETURN json_build_object('success', true, 'message', 'Invitation email sent successfully', 'event_id', event_id);

        EXCEPTION WHEN OTHERS THEN
          error_message := 'Failed to call unified send-email Edge Function: ' || SQLERRM;
          PERFORM safe_log_email_event('failed', invitation_record.parent_email, 'invitation_approved', NULL, error_message, jsonb_build_object('function', 'send_invitation_email_rpc', 'error_type', 'exception', 'sql_error', SQLERRM));
          UPDATE invitation_requests SET invitation_email_sent_at = NOW() WHERE id = invitation_id_param;
          RETURN json_build_object('success', false, 'error', 'network_error', 'message', error_message);
        END;
      END;
      $inner$ LANGUAGE plpgsql SECURITY DEFINER;
    $func$;
    
    RAISE NOTICE 'Updated send_invitation_email_rpc to use safe logging';
  END IF;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION safe_log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION safe_log_migration_event(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_log_migration_event(TEXT, TEXT) TO service_role;

-- Grant permissions on updated RPC functions if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_confirmation_email_rpc') THEN
    GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO service_role;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_invitation_email_rpc') THEN
    GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO service_role;
  END IF;
END $$;

-- Log this migration completion using the safe function
SELECT safe_log_migration_event(
  '20250906000002_comprehensive_dependency_fix',
  'Comprehensive fix for all log_email_event dependencies to enable production merge'
);

RAISE NOTICE 'Comprehensive dependency fix migration completed successfully'