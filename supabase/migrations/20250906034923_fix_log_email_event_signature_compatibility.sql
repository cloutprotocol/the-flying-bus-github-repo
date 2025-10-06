-- Fix log_email_event function signature compatibility
-- This migration creates an overloaded version of log_email_event that accepts
-- the 6-parameter signature used by newer migrations

-- Create overloaded version that accepts 6 parameters and returns UUID
CREATE OR REPLACE FUNCTION log_email_event(
  p_status TEXT,
  p_email TEXT,
  p_type TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
  uuid_reference_id UUID;
BEGIN
  -- Generate a UUID for this event
  event_id := gen_random_uuid();
  
  -- Convert reference_id to UUID if it's not null and not empty
  IF p_reference_id IS NOT NULL AND p_reference_id != '' THEN
    BEGIN
      uuid_reference_id := p_reference_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      uuid_reference_id := NULL;
    END;
  ELSE
    uuid_reference_id := NULL;
  END IF;

  -- Call the existing 7-parameter version (which returns void)
  PERFORM log_email_event(
    p_type,                    -- event_type
    uuid_reference_id,         -- invitation_id
    p_email,                   -- email_address
    (p_status = 'sent'),       -- success (true if status is 'sent')
    p_error_message,           -- error_message
    false,                     -- fallback_used (default to false)
    p_metadata                 -- additional_data
  );
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- Add comment
COMMENT ON FUNCTION log_email_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) IS 'Overloaded version of log_email_event for 6-parameter compatibility, returns UUID';

-- Test the overloaded function
DO $$
DECLARE
  test_event_id UUID;
BEGIN
  SELECT log_email_event(
    'migration',
    'system',
    'signature_compatibility',
    NULL,
    NULL,
    jsonb_build_object(
      'migration', '20250906000003_fix_log_email_event_signature_compatibility',
      'description', 'Added 6-parameter overload for log_email_event function',
      'timestamp', NOW()
    )
  ) INTO test_event_id;
  
  RAISE NOTICE 'log_email_event signature compatibility fix completed successfully. Event ID: %', test_event_id;
END $$;