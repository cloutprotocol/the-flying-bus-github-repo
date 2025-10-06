-- Fix the configuration summary function
CREATE OR REPLACE FUNCTION get_configuration_summary()
RETURNS json AS $$
DECLARE
  config_items json;
  validation_result json;
BEGIN
  -- Get configuration items
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
    ) ORDER BY key
  ) INTO config_items
  FROM system_configuration;
  
  -- Get validation result
  validation_result := validate_email_configuration();
  
  RETURN json_build_object(
    'configuration_items', config_items,
    'validation', validation_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;