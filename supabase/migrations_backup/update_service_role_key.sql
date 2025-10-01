-- Update the service role key in the system configuration
-- This script should be run after obtaining the actual service role key from Supabase dashboard
-- 
-- To get the service role key:
-- 1. Go to Supabase Dashboard > Settings > API
-- 2. Copy the service_role key (starts with 'eyJ...')
-- 3. Replace 'YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE' below with the real key
-- 4. Run this script

-- IMPORTANT: Replace this placeholder with the actual service role key
UPDATE system_configuration 
SET value = 'YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE'
WHERE key = 'app.service_role_key';

-- Verify the update
SELECT 
  key,
  CASE 
    WHEN key = 'app.service_role_key' THEN 'Service key updated (length: ' || length(value) || ')'
    ELSE value
  END as value_info,
  updated_at
FROM system_configuration 
WHERE key IN ('app.supabase_url', 'app.service_role_key')
ORDER BY key;

-- Validate the configuration
SELECT validate_email_configuration();