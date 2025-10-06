-- Set up database configuration parameters for email system
-- This migration creates a configuration table to store parameters that are referenced
-- by database triggers and functions for sending emails via Edge Functions
-- Note: Using a table-based approach since ALTER DATABASE SET is not permitted in managed Supabase

-- Create a configuration table to store system settings
CREATE TABLE IF NOT EXISTS system_configuration (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on the configuration table for security
ALTER TABLE system_configuration ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow service_role to read/write configuration
CREATE POLICY "Service role can manage configuration" ON system_configuration
  FOR ALL USING (auth.role() = 'service_role');

-- Insert the required configuration parameters
INSERT INTO system_configuration (key, value, description) VALUES
  ('app.supabase_url', 'https://sutvexycbiiarpkugzpv.supabase.co', 'Supabase project URL for Edge Function calls'),
  ('app.service_role_key', 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET', 'Service role key for authenticated Edge Function calls - MUST be updated with real key')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Create an updated_at trigger for the configuration table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_configuration_updated_at
  BEFORE UPDATE ON system_configuration
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the configuration parameters are set
DO $$
DECLARE
  supabase_url text;
  service_key text;
BEGIN
  -- Check if app.supabase_url is set
  SELECT value INTO supabase_url FROM system_configuration WHERE key = 'app.supabase_url';
  IF supabase_url IS NULL THEN
    RAISE EXCEPTION 'app.supabase_url configuration parameter is not set';
  END IF;
  
  -- Check if app.service_role_key is set
  SELECT value INTO service_key FROM system_configuration WHERE key = 'app.service_role_key';
  IF service_key IS NULL THEN
    RAISE EXCEPTION 'app.service_role_key configuration parameter is not set';
  END IF;
  
  -- Log successful configuration
  RAISE NOTICE 'Database configuration parameters set successfully';
  RAISE NOTICE 'Supabase URL: %', supabase_url;
  RAISE NOTICE 'Service role key configured (length: %)', length(service_key);
END $$;

-- Grant necessary permissions for configuration access
-- These permissions ensure that functions can access the configuration parameters
GRANT EXECUTE ON FUNCTION current_setting(text) TO service_role;
GRANT EXECUTE ON FUNCTION current_setting(text, boolean) TO service_role;

-- Create a helper function to safely get configuration with fallback
CREATE OR REPLACE FUNCTION get_config_setting(setting_name text, default_value text DEFAULT NULL)
RETURNS text AS $$
DECLARE
  config_value text;
BEGIN
  -- Try to get the setting from the configuration table
  BEGIN
    SELECT value INTO config_value FROM system_configuration WHERE key = setting_name;
    
    -- If found and not empty, return it
    IF config_value IS NOT NULL AND config_value != '' THEN
      RETURN config_value;
    END IF;
    
    -- If not found or empty, return the default
    RETURN default_value;
  EXCEPTION WHEN OTHERS THEN
    -- If there's any error accessing the setting, return the default
    RETURN default_value;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION get_config_setting(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION get_config_setting(text, text) TO authenticated;

-- Create a function to validate configuration
CREATE OR REPLACE FUNCTION validate_email_configuration()
RETURNS json AS $$
DECLARE
  supabase_url text;
  service_key text;
  result json;
BEGIN
  -- Get configuration values
  supabase_url := get_config_setting('app.supabase_url');
  service_key := get_config_setting('app.service_role_key');
  
  -- Build validation result
  result := json_build_object(
    'supabase_url_configured', (supabase_url IS NOT NULL AND supabase_url != ''),
    'service_key_configured', (service_key IS NOT NULL AND service_key != '' AND service_key != 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET'),
    'supabase_url', CASE WHEN supabase_url IS NOT NULL THEN supabase_url ELSE 'NOT_SET' END,
    'service_key_length', CASE WHEN service_key IS NOT NULL THEN length(service_key) ELSE 0 END,
    'configuration_valid', (
      supabase_url IS NOT NULL AND supabase_url != '' AND
      service_key IS NOT NULL AND service_key != '' AND service_key != 'PLACEHOLDER_SERVICE_ROLE_KEY_NEEDS_TO_BE_SET'
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on validation function
GRANT EXECUTE ON FUNCTION validate_email_configuration() TO service_role;
GRANT EXECUTE ON FUNCTION validate_email_configuration() TO authenticated;

-- Add a comment explaining how to update the service role key
COMMENT ON DATABASE postgres IS 'Email system configuration: Update app.service_role_key with actual service role key from Supabase dashboard';