-- Simplify email triggers to be more reliable
-- Instead of calling pg_net directly, just update timestamps and log events
-- The client-side fallback will handle actual email sending

-- Create a simplified confirmation email trigger
CREATE OR REPLACE FUNCTION send_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
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

  -- Update timestamp immediately to indicate trigger fired
  UPDATE invitation_requests 
  SET confirmation_email_sent_at = NOW() 
  WHERE id = NEW.id;

  -- Log that we're relying on client-side fallback
  PERFORM log_trigger_email_event(
    'delegated_to_client',
    NEW.parent_email,
    'invitation_confirmation',
    'database_trigger',
    true,
    'Trigger updated timestamp, client fallback will handle email sending',
    jsonb_build_object(
      'invitation_id', NEW.id::text,
      'timestamp_updated', true,
      'requires_client_fallback', true
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simplified invitation email trigger
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER AS $$
DECLARE
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

    -- Update timestamp immediately to indicate trigger fired
    UPDATE invitation_requests 
    SET invitation_email_sent_at = NOW() 
    WHERE id = NEW.id;

    -- Log that we're relying on client-side fallback
    PERFORM log_trigger_email_event(
      'delegated_to_client',
      NEW.parent_email,
      'invitation_approved',
      'database_trigger',
      true,
      'Trigger updated timestamp, client fallback will handle email sending',
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'timestamp_updated', true,
        'requires_client_fallback', true
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
