-- Fix log_email_event function to match existing table structure
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
    id,
    type,
    email,
    template,
    message_id,
    error,
    metadata,
    timestamp
  ) VALUES (
    gen_random_uuid(),
    event_type,
    email_address,
    CASE 
      WHEN event_type LIKE '%confirmation%' THEN 'invitation_confirmation'
      WHEN event_type LIKE '%invitation%' THEN 'invitation_approved'
      ELSE 'unknown'
    END,
    invitation_id::text,
    error_message,
    jsonb_build_object(
      'success', success,
      'fallback_used', fallback_used,
      'invitation_id', invitation_id,
      'additional_data', additional_data
    ),
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- If logging fails, don't fail the main operation
  RAISE NOTICE 'Failed to log email event: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;