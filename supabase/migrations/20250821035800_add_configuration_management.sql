-- Add enhanced configuration table with sensitive flag
ALTER TABLE system_configuration 
ADD COLUMN IF NOT EXISTS is_sensitive boolean DEFAULT false;

-- Mark service role key as sensitive
UPDATE system_configuration 
SET is_sensitive = true 
WHERE key = 'app.service_role_key';

-- Create a function to safely display configuration (hiding sensitive values)
CREATE OR REPLACE FUNCTION get_configuration_summary()
RETURNS json AS $$
DECLARE
  config_items json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'key', key,
      'value', CASE 
        WHEN is_sensitive THEN '[HIDDEN - ' || length(value) || ' characters]'
        ELSE value 
      END,
      'description', description,
      'is_sensitive', is_sensitive,
      'updated_at', updated_at
    )
  ) INTO config_items
  FROM system_configuration
  ORDER BY key;
  
  RETURN json_build_object(
    'configuration_items', config_items,
    'validation', validate_email_configuration()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on summary function
GRANT EXECUTE ON FUNCTION get_configuration_summary() TO service_role;
GRANT EXECUTE ON FUNCTION get_configuration_summary() TO authenticated;