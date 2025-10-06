-- Fix audit logging schema issues to prevent database errors
-- This migration ensures audit_logs table handles missing user_agent and ip_address gracefully

-- Ensure audit_logs table has proper structure with all required columns
-- The table should already exist, but we'll add any missing columns

-- Add user_agent column if it doesn't exist (it should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Add ip_address column if it doesn't exist (it should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;
    END IF;
END $$;

-- Add user_id column if it doesn't exist (it should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Ensure all nullable columns have proper defaults
-- Update any existing records that might have issues
UPDATE audit_logs 
SET 
    user_agent = COALESCE(user_agent, 'system/unknown'),
    ip_address = COALESCE(ip_address, 'unknown')
WHERE user_agent IS NULL OR ip_address IS NULL;

-- Create an improved audit logging function that handles missing fields gracefully
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_user_email TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        user_email,
        user_id,
        success,
        error_message,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        p_action,
        p_resource_type,
        p_resource_id,
        p_user_email,
        p_user_id,
        p_success,
        p_error_message,
        COALESCE(p_metadata, '{}'),
        COALESCE(p_ip_address, 'unknown'),
        COALESCE(p_user_agent, 'system/unknown')
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the main operation
        RAISE WARNING 'Failed to log audit event: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simplified audit logging function for common use cases
CREATE OR REPLACE FUNCTION log_audit_simple(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
    RETURN log_audit_event(
        p_action,
        p_resource_type,
        p_resource_id,
        NULL, -- user_email
        NULL, -- user_id
        p_success,
        p_error_message,
        '{}', -- metadata
        'system', -- ip_address
        'system/function' -- user_agent
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;