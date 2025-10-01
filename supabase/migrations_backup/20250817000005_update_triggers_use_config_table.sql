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
  eveuuid;
BEGIN
  -- Only send confirmatioests
  IF TG_OP = 'INSERT' THEN
    -- Geable
    BEGIN
      supabase_url := get_config_setting('app.supabase_url');
      _key');
      
      -- Validate configuration before attempting to seail
      IF supabase_url IS NULL OR supabase_url = '' THEN
        RAISE NOTICW.id;
        RETURN NEW;
      F;
      
      IF service_role_key IS NULL OR service_role_key = '' OR service_role_key = 'PLACEHOLDER_SERVICE_ROLE_KET' THEN
        RAISE NOTICEW.id;
        RETURW;
      END IF;
      
      -- Log email attempt for debugging
      INSERT INTO email_events (invitation_id, event_type, method, stadata)
      VALUES (NEW.id, 'trigger_attempt', 'database_trigger', false, 
      
      RETURNING id INTO event_id;
      
      -- Call the Edge Function asynchronously using pg_ne
      SELECT * INTO http_response FROMt(
        url := supabase_url || '/functions/v1
        headers := jsonb_build_object(
          
          'Authorization', 'Bearer y
        ),
        body := jsonb_build_object(
          'type', 'invitation_confirmation',
          'to', NEW.parent_email,
          'templateData', jsonb_build_object(
            'parentName', COALESCE(NEW.parent_name, 'Parent'),
           
         D, YYYY')
          )
        )
      );
      
      -- Check if the HTTP request was successful
      IF http_response.status_code 9 THEN
        -- Update the confirmation email timests
        UPDATE invitation_
        
        WHERE id = NEW.id;
        
        -- Log successful email sending
        UPDATE email_events 
        SET success = true, metadata = me
        vent_id;
        
        RAid;
      ELSE
        -- Log failed email 
        UPDATE email_events 
        SET error_message = 'HTTP request failed with status: ' || http_response.status_code,
            metadata = metadata || jsonb_build_object('status_code', http_response.status_code, 'responntent)
        WHERE id = event_id;
        
        RAISE NOTICE 'Failed to send confirmation email for invitation %, HTTP status: %', NEW.id, http_response.status_code;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error details for debugging
      UPDATE email_events 
      SET error_message = 'Database trigger error: ' || SQLERRM,
          metadata = metadata || jsonb_build_object('sqlstate', SQLSTATE)
      WHERE id = event_id;
      
      
    END;
  END IF;
  
  ;
END;
$$ LNER;


CREATE OR REPLACE FUNCTION send_invitation_email()
RETURNS TRIGGER AS $$
DECLARE
  supab text;
  service_role_key txt;
  http_response record;
  event_id uuid;
BEGIN
  -- Only send invitation email when status changes to 'approved'
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Get configuration parameters from system_configuration table
    BEGIN
      supabase_url := get_config_setting('app.supabase_url');
      service_role_key := get_config_setting('app.service_role_key');
      
      -- Validate configuration before attempting to send email
      IF supabase_url IS NULL OR supabase_url = '' THEN
        RAISE NOTICE 'Supabase URL not configured, skipping invitation email for invitation %', NEW.id;
        RETURN NEW;
      END IF;
      
      IF service_role_key IS NULL OR service_role_key = '' OR service_role_key = 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET' THEN
        RAISE NOTICE 'Service role key not configured, skipping invitation email for invitation %', NEW.id;
        RETURN NEW;
      END IF;
      
      -- Log email attempt for debugging
      INSERT INTO email_events (invitation_id, event_type, method, success, metadata)
      VALUES (NEW.id, 'trigger_attempt', 'database_trigger', false, 
              jsonb_build_object('email_type', 'invitation', 'trigger_op', TG_OP, 'status_change', OLD.status || ' -> ' || NEW.status))
      nt_id;
      
      -- Call the Edge Function asynchronously using t
      SELECT * INTO http_response FROM net.http_post(
        url := supabase_url || '/funct,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          key
        ),
        body := jsonb_build_object(
          'invitationId', NEW.id::text,
          'parentEmail', NEW.parent_email,
          'parentName', COALESCE(NEW.parent_name, 'Paren),
         d')
        )
      );
      
      -- Check if the HTTP request was successful
      IF http_response.status_code BETWEEN 200 AND 299 THEN
        -- Update the invitation ems
        UPDATE invitation_requests 
        SET invitation_emaOW() 
        EW.id;
        
        -- Log successful eming
        UPDATE email_events 
        SET success = true, metadata = metadata || jsonb_build_object('status_code', http_response.statode)
        WHERE id = event_id;
        
        RAISE NOTICE 'Invitation email sent successfully for invitation %', NEW.id;
      ELSE
        -- Log failed email attempt with status code
        UPDATE email_events 
        SET error_message = 'HTTP request failed with status: ' || http_response.status_code,
            metadata = metadata || jsonb_build_object('status_code', http_response.status_code, 'response', http_response.content)
        WHERE id = event_id;
        
        ;
      END IF;
      
    EX
      -- Log error details forg
      UPDATE email_events 
      SET error_message = M,
          metadata = metadata || jsonb_build_object('sqlstate', E)
      WHERE id = event_id;
      
      RAISE NOTICE 'Exception in invita SQLERRM;
    END;
  END IF;
  
  RETURN ;
END;
$$ LANGUAGE pER;

-- Update RPC functions to use systeme
d)
RETURNS json AS $$
DECLARE
  invitation_recor;
  supabext;
  service_role_key text;
  http_response record;
  event_id uuid;
BEGIN
  -- Get invitatdata
  SEL
  FROM invitation_reques 
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
  );
  END IF;
  
  -- Get able
  
  service_role_key := get_config_setting('app.service_role_key');
  
  -- Validate configuration
  THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Supabase URL ,
      'fallback_required
    );
  END IF;
  
  IF servN
  t(
      'success', false, 
      'error', 'Service role nfigured',
      'fallback_requiredue
    );
  END IF;
  
  -- Log mpt
  data)
  VALUES (invitationalse, 
          jsonb_build_object('email_type', 'confirmation', 'function', 'send_conf
  RETURNING id INTO event_id;
  
  -- Call the Edge Function u
  IN
    SELECT * INTO http_response FROM nett(
      u,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' |le_key
      ),
      body := jsonb_build_object(
        ,
        'to', invitation_record.p,
        'templateData', jsonb_build_object(
          'parentName', COALESCE(invitation_r),
          'childName', COALESCE(invitation_ld'),
          'submissionDate', to_char(invitation_record.created_at, 'Month D
        )
      )
    );
    
    --essful
    
      -- Update confirmation email timestamp
      UPDATE invitation_requests 
      SET confirmation_email_sent_at = NOW() 
      WHERE id = invitation_id_pam;
      
      -- Update event log
      
      SET success = true,de)
      WHERE id = event_id;
      
      RETURN json_build_ob
    EL
      -- Update event log with failure
      UPts 
      SET error_message = 'HTTP reques
          metadata = metad)
      WHERE id = event_id;
      
      RETURN json_build_obt(
       
        'error', 'HTTP request _code,
        'fallback_required
      );
    END IF;
    
  EXCEPTION
    eption
    UPDATE email_events 
    SET error_message = 'RPC function ,
        metadata = metadE)
    WHERE id = event_id;
    
    RETURN json_build_ob
    
      'error', 'Network or au,
      'fallback_requiredtrue
    );
  END;
END;
$$ LANINER;

-- Update invitation email RPC functition table

RETURNS json AS $$
DECLARE
  invitation_recor
  supab;
  service_role_key text;
  http_response reco
  event_id uuid;
BEGIN
  -- Get invitation data
  SELord 
  FROM invitation_reques
  WHERE id = invitation_id_param;
  
  IF NOT FOUND THEN
  
  END IF;
  
  IF inviEN
  ');
  END IF;
  
  -- Get able
  l');
  service_role_key := get_config_setting('app.service_role_key');
  
  -- Validate configuration
  THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Supabase URL red',
      'fallback_required
    );
  END IF;
  
  IF servHEN
  t(
      'success', false, 
      'error', 'Service role d',
      'fallback_requiredue
    );
  END IF;
  
  -- Log t
  )
  VALUES (invitation 
          jsonb_build_object('email_type', 'invitation', 'function', 'send_invitapc'))
  RETURNING id INTO event_id;
  
  -- Call the Edge Function ut
  GIN
    SELECT * INTO http_response FROM netpost(
      u
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' |
      ),
      body := jsonb_build_object(
        
        'parentEmail', invitationemail,
        'parentName', COALESCE(invitation_record.pa,
        'childName', COALESCE(invitation_record.child_ld')
      )
    );
    
    --
     THEN
      -- Update invitation email timestamp
      UPDATE invitation_requests 
      SET invitation_email_sent_at = NOW() 
      WHERE id = invitation_id_paam;
      
      -- Update event log
       
      SET success = true,de)
      WHERE id = event_id;
      
      RETURN json_build_obfully');
    ELSE
      -- Update event log with failure
      UPs 
      SET error_message = 'HTTP requese,
          metadata = metad)
      WHERE id = event_id;
      
      RETURN json_build_ob
      , 
        'error', 'HTTP request code,
        'fallback_required
      );
    END IF;
    
  EXCEPTION
    n
    UPDATE email_events 
    SET error_message = 'RPC function 
        metadata = metadATE)
    WHERE id = event_id;
    
    RETURN json_build_ob(
    
      'error', 'Network or auRM,
      'fallback_required
    );
  END;
END;
$$ LANEFINER;

-- Ensure triggers are properly confiured
;
CREATE TRIGGER trigger_send_confirmation_eil
  AFTER INSERT ON invitation_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_confirmation_();

DROP TRIGGER IF EXISTS trigger_send_invitatios;

  AFTER UPDATE ON invitation_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_invitation_em);

-- Grant necessary permissions

GRANT EXECUTE ON FUNCTION send;
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO autheed;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO authed;
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO service_role;

-- Add function to update service role key securely

RETURNS boolean AS $$
DECLARE
  key_length integer;
BEGIN
  -- Validate the key)
  key;
  
  IF key_length < 50 THEN
  
  END IF;
  
  IF new_
  oken';
  END IF;
  
  -- Updaon
  ion 
  SET value = new_key, update
  WHERE key = 'app.service_rol;
  
  IF NOT FOUND THEN
  
    VALUES ('app.se');
  END IF;
  
  RAISE N
  
  
EXCEPTION WHENERS THEN
  , SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the upn
ce_role;

-- Add comment explaining the changes
nt';
COMMENT ON FUNCTION send_invitation_e
COMMENT ON FUNCTION send_confirmation_email_rpc(uuid) IS 'Updated to use system_configuration table with proper error handling and logging';
COMMENT ON FUNCTION send_invitation_email_rpc(uuid) IS 'Updated to use system_configuration table with proper error handling and logging';