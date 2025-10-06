-- Enhanced configuration validation function
CREATE OR REPLACE FUNCTION validate_email_configuration()
RETURNS json AS $$
DECLARE
  supabase_url text;
  service_key text;
  key_validation json;
  result json;
BEGIN
  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');
  
  -- Validate service role key
  key_validation := validate_service_role_key(service_key);
  
  -- Build comprehensive validation result
  result := json_build_object(
    'supabase_url_configured', (supabase_url IS NOT NULL AND supabase_url != ''),
    'supabase_url', CASE WHEN supabase_url IS NOT NULL THEN supabase_url ELSE 'NOT_SET' END,
    'service_key_validation', key_validation,
    'configuration_valid', (
      supabase_url IS NOT NULL AND supabase_url != '' AND
      (key_validation->>'is_valid')::boolean = true
    ),
    'next_steps', CASE 
      WHEN supabase_url IS NULL OR supabase_url = '' THEN 'Set Supabase URL in configuration'
      WHEN (key_validation->>'is_valid')::boolean = false THEN 'Update service role key using update_service_role_key() function'
      ELSE 'Configuration is valid'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;