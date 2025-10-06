-- Fix pg_net response handling in database triggers
-- The pg_net extension returns different field names than expected

-- Update the send_confirmation_email function to handle pg_net response correctly
CREATE OR REPLACE FUNCTION send_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text;
  service_key text;
  config_validation json;
  request_id bigint;
  http_response net.http_response_result;
  error_message text;
  event_id uuid;
BEGIN
  -- Log trigger attempt
  event_id := log_trigger_email_event(
    'trigger_attempt',
    NEW.parent_email,
    'invitation_confirmation',
    'database_trigger',
    true,
    NULL,
    jsonb_build_object(
      'invitation_id', NEW.id::text,
      'trigger_event', 'INSERT',
      'timestamp', NOW()
    )
  );

  -- Validate configuration before proceeding
  SELECT validate_email_configuration() INTO config_validation;
  
  IF NOT (config_validation->>'configuration_valid')::boolean THEN
    error_message := 'Email system configuration is invalid';
    
    PERFORM log_trigger_email_event(
      'failed',
      NEW.parent_email,
      'invitation_confirmation',
      'database_trigger',
      false,
      error_message,
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'error_type', 'configuration',
        'config_validation', config_validation
      )
    );
    
    -- Don't fail the transaction, just log the issue
    RETURN NEW;
  END IF;

  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');

  -- Attempt to send email via Edge Function
  BEGIN
    -- Log sending attempt
    PERFORM log_trigger_email_event(
      'sending',
      NEW.parent_email,
      'invitation_confirmation',
      'pg_net',
      true,
      NULL,
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'url', supabase_url || '/functions/v1/send-email'
      )
    );

    -- Make HTTP request to Edge Function
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key,
        'X-Function-Source', 'database_trigger'
      ),
      body := jsonb_build_object(
        'type', 'invitation_confirmation',
        'to', NEW.parent_email,
        'templateData', jsonb_build_object(
          'parentName', COALESCE(NEW.parent_name, 'Parent'),
          'childName', COALESCE(NEW.child_name, 'Child'),
          'submissionDate', to_char(NEW.created_at, 'Month DD, YYYY'),
          'invitationId', NEW.id::text
        )
      )
    ) INTO request_id;

    -- Collect the response
    SELECT net.http_collect_response(request_id, async := false) INTO http_response;

    -- Check response and log result
    IF http_response.status BETWEEN 200 AND 299 THEN
      -- Success
      UPDATE invitation_requests 
      SET confirmation_email_sent_at = NOW() 
      WHERE id = NEW.id;
      
      PERFORM log_trigger_email_event(
        'sent',
        NEW.parent_email,
        'invitation_confirmation',
        'pg_net',
        true,
        NULL,
        jsonb_build_object(
          'invitation_id', NEW.id::text,
          'status_code', http_response.status,
          'response_body', http_response.content
        )
      );
    ELSE
      -- HTTP error
      error_message := 'Edge Function returned error status: ' || http_response.status::text;
      
      PERFORM log_trigger_email_event(
        'failed',
        NEW.parent_email,
        'invitation_confirmation',
        'pg_net',
        false,
        error_message,
        jsonb_build_object(
          'invitation_id', NEW.id::text,
          'status_code', http_response.status,
          'response_body', http_response.content,
          'error_type', 'http_error'
        )
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Network or other error
    error_message := 'Failed to call Edge Function: ' || SQLERRM;
    
    PERFORM log_trigger_email_event(
      'failed',
      NEW.parent_email,
      'invitation_confirmation',
      'pg_net',
      false,
      error_message,
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'sql_error', SQLERRM,
        'sql_state', SQLSTATE,
        'error_type', 'exception',
        'fallback_needed', true
      )
    );
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Upd
ate the send_invitation_email function to handle pg_net response correctly
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text;
  service_key text;
  config_validation json;
  request_id bigint;
  http_response net.http_response_result;
  error_message text;
  event_id uuid;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Log trigger attempt
    event_id := log_trigger_email_event(
      'trigger_attempt',
      NEW.parent_email,
      'invitation_approved',
      'database_trigger',
      true,
      NULL,
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'trigger_event', 'UPDATE',
        'status_change', OLD.status || ' -> ' || NEW.status,
        'timestamp', NOW()
      )
    );

    -- Validate configuration before proceeding
    SELECT validate_email_configuration() INTO config_validation;
    
    IF NOT (config_validation->>'configuration_valid')::boolean THEN
      error_message := 'Email system configuration is invalid';
      
      PERFORM log_trigger_email_event(
        'failed',
        NEW.parent_email,
        'invitation_approved',
        'database_trigger',
        false,
        error_message,
        jsonb_build_object(
          'invitation_id', NEW.id::text,
          'error_type', 'configuration',
          'config_validation', config_validation
        )
      );
      
      -- Don't fail the transaction, just log the issue
      RETURN NEW;
    END IF;

    -- Get configuration values
    supabase_url := get_config_setting('app.supabase_url');
    service_key := get_config_setting('app.service_role_key');

    -- Attempt to send email via Edge Function
    BEGIN
      -- Log sending attempt
      PERFORM log_trigger_email_event(
        'sending',
        NEW.parent_email,
        'invitation_approved',
        'pg_net',
        true,
        NULL,
        jsonb_build_object(
          'invitation_id', NEW.id::text,
          'url', supabase_url || '/functions/v1/send-invitation-approved'
        )
      );

      -- Make HTTP request to Edge Function
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/send-invitation-approved',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key,
          'X-Function-Source', 'database_trigger'
        ),
        body := jsonb_build_object(
          'invitationId', NEW.id::text,
          'parentEmail', NEW.parent_email,
          'parentName', COALESCE(NEW.parent_name, 'Parent'),
          'childName', COALESCE(NEW.child_name, 'Child')
        )
      ) INTO request_id;

      -- Collect the response
      SELECT net.http_collect_response(request_id, async := false) INTO http_response;

      -- Check response and log result
      IF http_response.status BETWEEN 200 AND 299 THEN
        -- Success
        UPDATE invitation_requests 
        SET invitation_email_sent_at = NOW() 
        WHERE id = NEW.id;
        
        PERFORM log_trigger_email_event(
          'sent',
          NEW.parent_email,
          'invitation_approved',
          'pg_net',
          true,
          NULL,
          jsonb_build_object(
            'invitation_id', NEW.id::text,
            'status_code', http_response.status,
            'response_body', http_response.content
          )
        );
      ELSE
        -- HTTP error
        error_message := 'Edge Function returned error status: ' || http_response.status::text;
        
        PERFORM log_trigger_email_event(
          'failed',
          NEW.parent_email,
          'invitation_approved',
          'pg_net',
          false,
          error_message,
          jsonb_build_object(
            'invitation_id', NEW.id::text,
            'status_code', http_response.status,
            'response_body', http_response.content,
            'error_type', 'http_error'
          )
        );
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Network or other error
      error_message := 'Failed to call Edge Function: ' || SQLERRM;
      
      PERFORM log_trigger_email_event(
        'failed',
        NEW.parent_email,
        'invitation_approved',
        'pg_net',
        false,
        error_message,
        jsonb_build_object(
          'invitation_id', NEW.id::text,
          'sql_error', SQLERRM,
          'sql_state', SQLSTATE,
          'error_type', 'exception',
          'fallback_needed', true
        )
      );
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;