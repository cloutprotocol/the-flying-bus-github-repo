-- Add function to update service role key securely
CREATE OR REPLACE FUNCTION update_service_role_key(new_key text)
RETURNS boolean AS $$
DECLARE
  key_length integer;
BEGIN
  -- Validate the key format (basic validation)
  key_length := length(new_key);
  
  IF key_length < 50 THEN
    RAISE EXCEPTION 'Service role key appears to be too short (length: %)', key_length;
  END IF;
  
  IF new_key NOT LIKE 'eyJ%' THEN
    RAISE EXCEPTION 'Service role key does not appear to be a valid JWT token';
  END IF;
  
  -- Update the configuration
  UPDATE system_configuration 
  SET value = new_key, updated_at = now()
  WHERE key = 'app.service_role_key';
  
  IF NOT FOUND THEN
    INSERT INTO system_configuration (key, value, description)
    VALUES ('app.service_role_key', new_key, 'Service role key for authenticated Edge Function calls');
  END IF;
  
  RAISE NOTICE 'Service role key updated successfully (length: %)', key_length;
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to update service role key: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the update function
GRANT EXECUTE ON FUNCTION update_service_role_key(text) TO service_role;

-- Grant necessary permissions for all functions
GRANT EXECUTE ON FUNCTION send_confirmation_email() TO service_role;
GRANT EXECUTE ON FUNCTION send_invitation_email() TO service_role;
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION send_confirmation_email_rpc(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION send_invitation_email_rpc(uuid) TO service_role;
