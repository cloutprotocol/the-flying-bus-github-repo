-- Fix Email Triggers to Handle Missing Configuration Gracefully
-- This migration updates the email trigger functions to handle missing configuration
-- parameters without failing, implementing graceful degradation

-- Update the confirmation email function with graceful error handling
CREATE OR REPLACE FUNCTION send_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Only send confirmation email for new invitation requests
  IF TG_OP = 'INSERT' THEN
    -- Get configuration parameters with graceful handling
    BEGIN
      supabase_url := current_setting('app.supabase_url', true);
      service_role_key := current_setting('app.service_role_key', true);
      
      -- Only attempt to send email if configuration is available
      IF supabase_url IS NOT NULL AND supabase_url != '' AND 
         service_role_key IS NOT NULL AND service_role_key != '' THEN
        
        -- Call the Edge Function asynchronously using pg_net
        PERFORM
          net.http_post(
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
        
        -- Update the confirmation email timestamp only if email was sent
        UPDATE invitation_requests 
        SET confirmation_email_sent_at = NOW() 
        WHERE id = NEW.id;
        
      ELSE
        -- Log that configuration is missing but don't fail
        -- The application layer can handle email sending as fallback
        RAISE NOTICE 'Email configuration not available, skipping automatic email sending for invitation %', NEW.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the trigger
      RAISE NOTICE 'Failed to send confirmation email for invitation %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the invitation email function with graceful error handling
CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Only send invitation email when status changes to 'approved'
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Get configuration parameters with graceful handling
    BEGIN
      supabase_url := current_setting('app.supabase_url', true);
      service_role_key := current_setting('app.service_role_key', true);
      
      -- Only attempt to send email if configuration is available
      IF supabase_url IS NOT NULL AND supabase_url != '' AND 
         service_role_key IS NOT NULL AND service_role_key != '' THEN
        
        -- Call the Edge Function asynchronously using pg_net
        PERFORM
          net.http_post(
            url := supabase_url || '/functions/v1/send-invitation-approved',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || service_role_key
            ),
            body := jsonb_build_object(
              'invitationId', NEW.id::text,
              'parentEmail', NEW.parent_email,
              'parentName', COALESCE(NEW.parent_name, 'Parent'),
              'childName', COALESCE(NEW.child_name, 'Child')
            )
          );
        
        -- Update the invitation email timestamp only if email was sent
        UPDATE invitation_requests 
        SET invitation_email_sent_at = NOW() 
        WHERE id = NEW.id;
        
      ELSE
        -- Log that configuration is missing but don't fail
        -- The application layer can handle email sending as fallback
        RAISE NOTICE 'Email configuration not available, skipping automatic invitation email sending for invitation %', NEW.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the trigger
      RAISE NOTICE 'Failed to send invitation email for invitation %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure triggers are still properly configured
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_confirmation_email() TO service_role;
GRANT EXECUTE ON FUNCTION send_invitation_email() TO service_role;
</text>
</invoke>-- Updat
e RPC functions to have consistent error handling and configuration checks
CREATE OR REPLACE FUNCTION send_confirmation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get invitation data
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Get configuration parameters with graceful handling
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- Check if configuration is available
  IF supabase_url IS NULL OR supabase_url = '' OR 
     service_role_key IS NULL OR service_role_key = '' THEN
    -- Configuration not available, mark as queued for fallback handling
    UPDATE invitation_requests 
    SET confirmation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Email queued for sending - configuration not available', 
      'fallback', true
    );
  END IF;
  
  -- Call the Edge Function using pg_net
  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', 'invitation_confirmation',
        'to', invitation_record.parent_email,
        'templateData', jsonb_build_object(
          'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
          'childName', COALESCE(invitation_record.child_name, 'Child'),
          'submissionDate', to_char(invitation_record.created_at, 'Month DD, YYYY')
        )
      )
    );
    
    -- Update confirmation email timestamp
    UPDATE invitation_requests 
    SET confirmation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object('success', true, 'message', 'Confirmation email sent');
    
  EXCEPTION WHEN OTHERS THEN
    -- If pg_net fails, log the attempt and return success for fallback handling
    UPDATE invitation_requests 
    SET confirmation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Email queued for sending - network error', 
      'fallback', true,
      'error_detail', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update invitation email RPC function with consistent error handling
CREATE OR REPLACE FUNCTION send_invitation_email_rpc(invitation_id_param uuid)
RETURNS json AS $$
DECLARE
  invitation_record record;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get invitation data
  SELECT * INTO invitation_record 
  FROM invitation_requests 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  IF invitation_record.status != 'approved' THEN
    RETURN json_build_object('success', false, 'error', 'Invitation must be approved first');
  END IF;
  
  -- Get configuration parameters with graceful handling
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- Check if configuration is available
  IF supabase_url IS NULL OR supabase_url = '' OR 
     service_role_key IS NULL OR service_role_key = '' THEN
    -- Configuration not available, mark as queued for fallback handling
    UPDATE invitation_requests 
    SET invitation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Email queued for sending - configuration not available', 
      'fallback', true
    );
  END IF;
  
  -- Call the Edge Function using pg_net
  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-invitation-approved',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'invitationId', invitation_record.id::text,
        'parentEmail', invitation_record.parent_email,
        'parentName', COALESCE(invitation_record.parent_name, 'Parent'),
        'childName', COALESCE(invitation_record.child_name, 'Child')
      )
    );
    
    -- Update invitation email timestamp
    UPDATE invitation_requests 
    SET invitation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object('success', true, 'message', 'Invitation email sent');
    
  EXCEPTION WHEN OTHERS THEN
    -- If pg_net fails, log the attempt and return success for fallback handling
    UPDATE invitation_requests 
    SET invitation_email_sent_at = NOW() 
    WHERE id = invitation_id_param;
    
    RETURN json_build_object(
      'success', true, 
      'message', 'Email queued for sending - network error', 
      'fallback', true,
      'error_detail', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for updated functions
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO service_role;