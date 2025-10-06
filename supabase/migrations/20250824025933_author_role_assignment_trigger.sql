-- Migration: Author Role Assignment Trigger
-- Description: Creates a database trigger to automatically assign author role for invitation-based registrations
-- Requirements: 1.1, 4.1, 4.2

-- Create function to assign author role from invitation
CREATE OR REPLACE FUNCTION assign_author_role_from_invitation()
RETURNS TRIGGER AS $$
DECLARE
    invitation_exists BOOLEAN := FALSE;
    audit_context JSONB;
BEGIN
    -- Check if user was created through invitation
    SELECT EXISTS (
        SELECT 1 FROM invitation_tokens 
        WHERE used_by = NEW.id 
        AND used_at IS NOT NULL
    ) INTO invitation_exists;
    
    -- If user was created through invitation, ensure role is set to author
    IF invitation_exists THEN
        -- Only update role if it's not already author
        IF NEW.role != 'author' THEN
            NEW.role = 'author';
            
            -- Create audit context
            audit_context = jsonb_build_object(
                'trigger_name', 'assign_author_role_from_invitation',
                'old_role', COALESCE(OLD.role, 'reader'),
                'new_role', 'author',
                'assignment_method', 'database_trigger',
                'invitation_based', true,
                'user_id', NEW.id,
                'timestamp', NOW()
            );
            
            -- Log the role assignment in audit_logs
            INSERT INTO audit_logs (
                action,
                resource_type,
                resource_id,
                user_email,
                success,
                metadata,
                created_at
            ) VALUES (
                'role_assignment',
                'profile',
                NEW.id::text,
                NEW.email,
                true,
                audit_context,
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the transaction
        INSERT INTO audit_logs (
            action,
            resource_type,
            resource_id,
            user_email,
            success,
            error_message,
            metadata,
            created_at
        ) VALUES (
            'role_assignment_error',
            'profile',
            NEW.id::text,
            NEW.email,
            false,
            SQLERRM,
            jsonb_build_object(
                'trigger_name', 'assign_author_role_from_invitation',
                'error_code', SQLSTATE,
                'timestamp', NOW()
            ),
            NOW()
        );
        
        -- Return NEW to continue with the operation
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
CREATE TRIGGER ensure_invitation_author_role
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_author_role_from_invitation();

-- Add comment to document the trigger
COMMENT ON TRIGGER ensure_invitation_author_role ON profiles IS 
'Automatically assigns author role to users who registered through invitation tokens';

COMMENT ON FUNCTION assign_author_role_from_invitation() IS 
'Trigger function that ensures users who registered via invitation tokens get author role assigned';

-- Create index to optimize invitation token lookups
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_used_by_lookup 
ON invitation_tokens (used_by, used_at) 
WHERE used_by IS NOT NULL AND used_at IS NOT NULL;

-- Add audit log entry for migration
INSERT INTO audit_logs (
    action,
    resource_type,
    resource_id,
    success,
    metadata,
    created_at
) VALUES (
    'migration_applied',
    'database_trigger',
    'assign_author_role_from_invitation',
    true,
    jsonb_build_object(
        'migration_name', '20250823000001_author_role_assignment_trigger',
        'description', 'Created trigger for automatic author role assignment',
        'timestamp', NOW()
    ),
    NOW()
);