-- Create a function to validate service role key format
CREATE OR REPLACE FUNCTION validate_service_role_key(key_to_check text DEFAULT NULL)
RETURNS json AS $$
DECLARE
  service_key text;
  key_length integer;
  is_valid boolean := false;
  validation_result json;
BEGIN
  -- Use provided key or get from configuration
  IF key_to_check IS NOT NULL THEN
    service_key := key_to_check;
  ELSE
    service_key := get_config_setting('app.service_role_key');
  END IF;
  
  -- Validate the key
  IF service_key IS NOT NULL THEN
    key_length := length(service_key);
    is_valid := (
      key_length > 100 AND 
      service_key LIKE 'eyJ%' AND 
      service_key != 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET'
    );
  ELSE
    key_length := 0;
  END IF;
  
  -- Build validation result
  validation_result := json_build_object(
    'key_exists', (service_key IS NOT NULL),
    'key_length', key_length,
    'is_jwt_format', (service_key IS NOT NULL AND service_key LIKE 'eyJ%'),
    'is_placeholder', (service_key = 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET'),
    'is_valid', is_valid,
    'validation_message', CASE 
      WHEN service_key IS NULL THEN 'Service role key not found'
      WHEN service_key = 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET' THEN 'Service role key is still placeholder - needs to be updated'
      WHEN key_length < 100 THEN 'Service role key too short'
      WHEN service_key NOT LIKE 'eyJ%' THEN 'Service role key not in JWT format'
      WHEN is_valid THEN 'Service role key is valid'
      ELSE 'Service role key validation failed'
    END
  );
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on validation function
GRANT EXECUTE ON FUNCTION validate_service_role_key(text) TO service_role;
GRANT EXECUTE ON FUNCTION validate_service_role_key(text) TO authenticated;