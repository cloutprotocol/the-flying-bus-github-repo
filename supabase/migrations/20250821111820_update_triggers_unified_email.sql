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
