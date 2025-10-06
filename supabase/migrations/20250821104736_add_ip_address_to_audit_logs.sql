-- Add missing ip_address column to audit_logs table
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS ip_address text;

-- Add user_id column as well since it might be referenced
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS user_id uuid;
