-- Fix hanging email triggers by making them more robust and non-blocking

-- First, let's drop the existing triggers
DROP TRIGGER IF EXISTS trigger_send_confirmation_email ON invitation_requests;
DROP TRIGGER IF EXISTS trigger_send_invitation_email ON invitation_requests;

-- Create a simpler, non-blocking version of the confirmation email trigger
CREATE OR REPLACE FUNCTION send_confirmation_email_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Simply update the timestamp to indicate that email sending is needed
  -- The client-side code will handle the actual email sending
  NEW.confirmation_email_sent_at = NULL; -- Ensure it's null so client knows to send
  
  -- Log that we need client-side email sending
  INSERT INTO email_events (type, email, template, message_id, error, metadata)
  VALUES (
    'trigger_delegated',
    NEW.parent_email,
    'invitation_confirmation',
    'trigger_' || gen_random_uuid()::text,
    'Delegated to client-side fallback',
    jsonb_build_object(
      'invitation_id', NEW.id::text,
      'method', 'database_trigger_simple',
      'requires_client_fallback', true,
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a simpler, non-blocking version of the invitation email trigger
CREATE OR REPLACE FUNCTION send_invitation_email_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Simply update the timestamp to indicate that email sending is needed
    NEW.invitation_email_sent_at = NULL; -- Ensure it's null so client knows to send
    
    -- Log that we need client-side email sending
    INSERT INTO email_events (type, email, template, message_id, error, metadata)
    VALUES (
      'trigger_delegated',
      NEW.parent_email,
      'invitation_approved',
      'trigger_' || gen_random_uuid()::text,
      'Delegated to client-side fallback',
      jsonb_build_object(
        'invitation_id', NEW.id::text,
        'method', 'database_trigger_simple',
        'requires_client_fallback', true,
        'status_change', COALESCE(OLD.status, 'null') || ' -> ' || NEW.status,
        'timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers with the simpler functions
CREATE TRIGGER trigger_send_confirmation_email
  AFTER INSERT ON invitation_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_confirmation_email_simple();

CREATE TRIGGER trigger_send_invitation_email
  AFTER UPDATE ON invitation_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_invitation_email_simple();
