-- Update Email Triggers to Use system_configuration Table
-- This migration updates the email trigger functions to use the system_configuration table
-- instead of current_setting() for better configuration management and authentication

-- Update the confirmation email function to use system_configuration table
CREATE OR REPLACE FUNCTION send_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  http_response record;
  event_id uuid;
BEGIN
  -- Only send confirmation email for new invitation requests
  IF TG_OP = 'INSERT' THEN
    -- Get configuration parameters from system_configuration table
    BEGIN
      supabase_url := get_config_setting('app.supabase_url');
      service_role_key := get_config_setting('app.service_role_key');
      
      -- Validate configuration before attempting to send email
      IF supabase_url IS NULL OR supabase_url = '' THEN
        RAISE NOTICE 'Supabase URL not configured, skipping confirmation email for invitation %', NEW.id;
        RETURN NEW;
      END IF;
      
      IF service_role_key IS NULL OR service_role_key = '' OR service_role_key = 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET' THEN
        RAISE NOTICE 'Service role key not configured, skipping confirmation email for invitation %', NEW.id;
        RETURN NEW;
      END IF;
      
      -- Log email attempt for debugging
      INSERT INTO email_events (invitation_id, event_type, method, success, metadata)
      VALUES (NEW.id, 'trigger_attempt', 'database_trigger', false, 
              jsonb_build_object('email_type', 'confirmation', 'trigger_op', TG_OP))
      RETURNING id INTO event_id;
      
      -- Call the Edge Function asynchronously using pg_net
      SELECT * INTO http_response FROM net.http_post(
        url := supabase_url || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'type', 'invitation_confirmation',
          'to', NEW.parent_email,
          'templateData', jsonb_build_object(
            'parentName', COALESCE(NEW.parent_name, 'Parent'),
            'childName', COALESCE(NEW.child_name, 'Child'),
            'submissionDate', to_char(NEW.created_at, 'Month DD, YYYY')
          )
        )
      );
      
      -- Check if the HTTP request was successful
      IF http_response.status_code BETWEEN 200 AND 299 THEN
        -- Update the confirmation email timestamp on success
        UPDATE invitation_requests 
        SET confirmation_email_sent_at = NOW() 
        WHERE id = NEW.id;
        
        -- Log successful email sending
        UPDATE email_events 
        SET success = true, metadata = metadata || jsonb_build_object('status_code', http_response.status_code)
        WHERE id = event_id;
        
        RAISE NOTICE 'Confirmation email sent successfully for invitation %', NEW.id;
      ELSE
        -- Log failed email attempt with status code
        UPDATE email_events 
        SET error_message = 'HTTP request failed with status: ' || http_response.status_code,
            metadata = metadata || jsonb_build_object('status_code', http_response.status_code, 'response', http_response.content)
        WHERE id = event_id;
        
        RAISE NOTICE 'Failed to send confirmation email for invitation %, HTTP status: %', NEW.id, http_response.status_code;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error details for debugging
      UPDATE email_events 
      SET error_message = 'Database trigger error: ' || SQLERRM,
          metadata = metadata || jsonb_build_object('sqlstate', SQLSTATE)
      WHERE id = event_id;
      
      RAISE NOTICE 'Exception in confirmation email trigger for invitation %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;