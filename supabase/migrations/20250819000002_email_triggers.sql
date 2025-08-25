-- Email Triggers for Server-Side Email Sending
-- This migration creates database triggers that automatically send emails
-- when invitation requests are created or approved

-- Create a function to send confirmation email via Edge Function
CREATE OR REPLACE FUNCTION send_confirmation_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send confirmation email for new invitation requests
  IF TG_OP = 'INSERT' THEN
    -- Call the Edge Function asynchronously using pg_net
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
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
    
    -- Update the confirmation email timestamp
    UPDATE invitation_requests 
    SET confirmation_email_sent_at = NOW() 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to send invitation email when approved
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send invitation email when status changes to 'approved'
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Call the Edge Function asynchronously using pg_net
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-invitation-approved',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'invitationId', NEW.id::text,
          'parentEmail', NEW.parent_email,
          'parentName', COALESCE(NEW.parent_name, 'Parent'),
          'childName', COALESCE(NEW.child_name, 'Child')
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

-- Create triggers
DROP TRIGGER IF EXISTS trigger_send_confirmation_email ON invitation_requests;
CREATE TRIGGER trigger_send_confirmation_email
  AFTER INSERT ON invitation_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_confirmation_email();

DROP TRIGGER IF EXISTS trigger_send_invitation_email ON invitation_requests;
CREATE TRIGGER trigger_send_invitation_email
  AFTER UPDATE ON invitation_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_invitation_email();

-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Set up configuration for the Edge Function URLs
-- These will need to be set via Supabase dashboard or CLI
-- ALTER DATABASE postgres SET app.supabase_url = 'https://sutvexycbiiarpkugzpv.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'your_service_role_key_here';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_confirmation_email() TO service_role;
GRANT EXECUTE ON FUNCTION send_invitation_email() TO service_role;