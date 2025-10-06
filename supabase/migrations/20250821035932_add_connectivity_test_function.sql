-- Create a function to test Edge Function connectivity
CREATE OR REPLACE FUNCTION test_edge_function_connectivity()
RETURNS json AS $$
DECLARE
  supabase_url text;
  service_key text;
  test_url text;
  result json;
BEGIN
  -- Get configuration
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');
  
  -- Validate configuration first
  IF supabase_url IS NULL OR service_key IS NULL OR service_key = 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Configuration not properly set up',
      'validation', validate_email_configuration()
    );
  END IF;
  
  -- Build test URL
  test_url := supabase_url || '/functions/v1/send-email';
  
  -- Return connectivity test info (actual HTTP test would need to be done from Edge Function)
  result := json_build_object(
    'test_url', test_url,
    'configuration_valid', true,
    'message', 'Configuration appears valid - test HTTP call from Edge Function or client',
    'service_key_length', length(service_key)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on connectivity test function
GRANT EXECUTE ON FUNCTION test_edge_function_connectivity() TO service_role;
GRANT EXECUTE ON FUNCTION test_edge_function_connectivity() TO authenticated;