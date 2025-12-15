-- Supabase Local Development Seed Data
-- This file is automatically run after migrations during `supabase db reset`
-- It sets up the local development environment with necessary configuration

-- Set up local development configuration
INSERT INTO system_configuration (key, value, description, is_sensitive) 
VALUES 
  ('app.supabase_url', 'http://127.0.0.1:54321', 'Supabase project URL for Edge Function calls (local development)', false),
  ('app.service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU', 'Service role key for authenticated Edge Function calls (local development)', true)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Note: Admin user creation is handled by a separate script
-- that uses Supabase's auth API instead of direct database manipulation
-- 
-- After running 'supabase db reset', run:
--   npm run create-admin-user
-- 
-- This creates an admin user with:
--   Email: neel@conversiondesigner.co
--   Password: Temporary123
--   Role: admin