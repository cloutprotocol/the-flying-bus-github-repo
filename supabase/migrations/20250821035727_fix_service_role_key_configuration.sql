-- Fix database configuration and service role key setup
-- This migration addresses the core authentication issues preventing email system from working

-- First, let's create a function to securely update the service role key
CREATE OR REPLACE FUNCTION update_service_role_key(new_key text)
RETURNS boolean AS $$
DECLARE
  key_length integer;
BEGIN
  -- Validate the key format (Supabase service role keys are JWT tokens, typically 200+ characters)
  key_length := length(new_key);
  
  IF key_length < 100 THEN
    RAISE EXCEPTION 'Service role key appears to be invalid (too short: % characters)', key_length;
  END IF;
  
  IF new_key NOT LIKE 'eyJ%' THEN
    RAISE EXCEPTION 'Service role key does not appear to be a valid JWT token';
  END IF;
  
  -- Update the service role key in configuration
  UPDATE system_configuration 
  SET value = new_key, updated_at = now()
  WHERE key = 'app.service_role_key';
  
  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update service role key - configuration entry not found';
  END IF;
  
  -- Log the successful update (without exposing the key)
  RAISE NOTICE 'Service role key updated successfully (length: %)', key_length;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service_role only
GRANT EXECUTE ON FUNCTION update_service_role_key(text) TO service_role;