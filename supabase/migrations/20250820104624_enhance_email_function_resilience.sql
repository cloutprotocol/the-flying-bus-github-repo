-- Enhanced Email Function Resilience
-- This migration improves the database functions to be more resilient to failures
-- and provides better error logging and fallback mechanisms

-- Create a function to log email events for monitoring and debugging
CREATE OR REPLACE FUNCTION log_email_event(
  event_type text,
  invitation_id uuid,
  email_address text,
  success boolean,
  error_message text DEFAULT NULL,
  fallback_used boolean DEFAULT false,
  additional_data jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO email_events (
    event_type,
    invitation_id,
    email_address,
    success,
    error_message,
    fallback_used,
    additional_data,
    created_at
  ) VALUES (
    event_type,
    invitation_id,
    email_address,
    success,
    error_message,
    fallback_used,
    additional_data,
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- If logging fails, don't fail the main operation
  RAISE NOTICE 'Failed to log email event: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a utility function to check email system health
CREATE OR REPLACE FUNCTION check_email_system_health()
RETURNS jsonb AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  pg_net_available boolean;
  health_status jsonb;
BEGIN
  -- Get configuration parameters
  supabase_url := current_setting('app.supabase_url', true);
  service_role_key := current_setting('app.service_role_key', true);
  
  -- Check if pg_net extension is available
  BEGIN
    PERFORM 1 FROM pg_extension WHERE extname = 'pg_net';
    pg_net_available := true;
  EXCEPTION WHEN OTHERS THEN
    pg_net_available := false;
  END;
  
  -- Build health status
  health_status := jsonb_build_object(
    'supabase_url_configured', (supabase_url IS NOT NULL AND supabase_url != ''),
    'service_role_key_configured', (service_role_key IS NOT NULL AND service_role_key != ''),
    'pg_net_available', pg_net_available,
    'timestamp', NOW(),
    'overall_health', 
      CASE 
        WHEN (supabase_url IS NOT NULL AND supabase_url != '') AND 
             (service_role_key IS NOT NULL AND service_role_key != '') AND 
             pg_net_available THEN 'healthy'
        WHEN pg_net_available THEN 'degraded'
        ELSE 'unhealthy'
      END
  );
  
  RETURN health_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION log_email_event(text, uuid, text, boolean, text, boolean, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION check_email_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION check_email_system_health() TO service_role;