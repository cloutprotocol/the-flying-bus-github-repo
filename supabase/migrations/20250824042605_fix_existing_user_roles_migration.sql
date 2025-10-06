-- Migration: Fix Existing User Roles
-- Description: Identifies and fixes users who should have author role but currently have reader role
-- Requirements: 4.1, 4.2

-- Create a function to identify users who should have author role based on invitation history
CREATE OR REPLACE FUNCTION identify_users_needing_author_role()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    invitation_email TEXT,
    invitation_status TEXT,
    should_be_author BOOLEAN,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.email as user_email,
        p.role as user_role,
        it.email as invitation_email,
        ir.status as invitation_status,
        CASE 
            WHEN p.role != 'author' AND it.email = p.email AND ir.status = 'approved' THEN true
            ELSE false
        END as should_be_author,
        CASE 
            WHEN p.role != 'author' AND it.email = p.email AND ir.status = 'approved' 
            THEN 'User registered with same email as approved invitation token'
            ELSE 'No role change needed'
        END as reason
    FROM profiles p
    LEFT JOIN invitation_tokens it ON it.email = p.email
    LEFT JOIN invitation_requests ir ON ir.id = it.invitation_request_id
    WHERE p.role != 'admin' -- Don't touch admin users
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to fix user roles with proper audit logging
CREATE OR REPLACE FUNCTION fix_user_role_with_audit(
    target_user_id UUID,
    target_email TEXT,
    old_role TEXT,
    new_role TEXT,
    reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INTEGER;
    audit_context JSONB;
BEGIN
    -- Create audit context
    audit_context = jsonb_build_object(
        'migration_name', 'fix_existing_user_roles_migration',
        'old_role', old_role,
        'new_role', new_role,
        'reason', reason,
        'user_id', target_user_id,
        'timestamp', NOW(),
        'assignment_method', 'migration_fix'
    );
    
    -- Update the user role
    UPDATE profiles 
    SET 
        role = new_role,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Check if update was successful
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Log the role change in audit_logs
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        user_email,
        success,
        metadata,
        created_at
    ) VALUES (
        'role_migration_fix',
        'profile',
        target_user_id::text,
        target_email,
        rows_affected > 0,
        audit_context,
        NOW()
    );
    
    RETURN rows_affected > 0;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
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
            'role_migration_error',
            'profile',
            target_user_id::text,
            target_email,
            false,
            SQLERRM,
            jsonb_build_object(
                'migration_name', 'fix_existing_user_roles_migration',
                'error_code', SQLSTATE,
                'timestamp', NOW(),
                'reason', reason
            ),
            NOW()
        );
        
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-
- Create a function to run the complete migration with validation
CREATE OR REPLACE FUNCTION run_role_migration_with_validation()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    old_role TEXT,
    new_role TEXT,
    success BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    user_record RECORD;
    fix_result BOOLEAN;
BEGIN
    -- Log migration start
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        success,
        metadata,
        created_at
    ) VALUES (
        'migration_started',
        'role_migration',
        'fix_existing_user_roles',
        true,
        jsonb_build_object(
            'migration_name', 'fix_existing_user_roles_migration',
            'timestamp', NOW()
        ),
        NOW()
    );
    
    -- Process each user that needs role fix
    FOR user_record IN 
        SELECT * FROM identify_users_needing_author_role() 
        WHERE should_be_author = true
    LOOP
        -- Fix the user role
        SELECT fix_user_role_with_audit(
            user_record.user_id,
            user_record.user_email,
            user_record.user_role,
            'author',
            user_record.reason
        ) INTO fix_result;
        
        -- Return the result
        RETURN QUERY SELECT 
            user_record.user_id,
            user_record.user_email,
            user_record.user_role,
            'author'::TEXT,
            fix_result,
            user_record.reason;
    END LOOP;
    
    -- Log migration completion
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        success,
        metadata,
        created_at
    ) VALUES (
        'migration_completed',
        'role_migration',
        'fix_existing_user_roles',
        true,
        jsonb_build_object(
            'migration_name', 'fix_existing_user_roles_migration',
            'timestamp', NOW()
        ),
        NOW()
    );
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create validation function to verify migration success
CREATE OR REPLACE FUNCTION validate_role_migration()
RETURNS TABLE (
    total_users INTEGER,
    users_with_correct_roles INTEGER,
    users_needing_fix INTEGER,
    migration_success_rate NUMERIC
) AS $$
DECLARE
    total_count INTEGER;
    correct_count INTEGER;
    needs_fix_count INTEGER;
BEGIN
    -- Count total users (excluding admins)
    SELECT COUNT(*) INTO total_count
    FROM profiles 
    WHERE role != 'admin';
    
    -- Count users with correct roles
    SELECT COUNT(*) INTO correct_count
    FROM identify_users_needing_author_role()
    WHERE should_be_author = false OR user_role = 'author';
    
    -- Count users still needing fix
    SELECT COUNT(*) INTO needs_fix_count
    FROM identify_users_needing_author_role()
    WHERE should_be_author = true;
    
    RETURN QUERY SELECT 
        total_count,
        correct_count,
        needs_fix_count,
        CASE 
            WHEN total_count > 0 THEN ROUND((correct_count::NUMERIC / total_count::NUMERIC) * 100, 2)
            ELSE 0::NUMERIC
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document the functions
COMMENT ON FUNCTION identify_users_needing_author_role() IS 
'Identifies users who should have author role based on invitation history';

COMMENT ON FUNCTION fix_user_role_with_audit(UUID, TEXT, TEXT, TEXT, TEXT) IS 
'Fixes a single user role with comprehensive audit logging';

COMMENT ON FUNCTION run_role_migration_with_validation() IS 
'Runs the complete role migration process with validation and audit logging';

COMMENT ON FUNCTION validate_role_migration() IS 
'Validates the success of the role migration and provides statistics';

-- Log migration creation
INSERT INTO audit_logs (
    action,
    resource_type,
    resource_id,
    success,
    metadata,
    created_at
) VALUES (
    'migration_applied',
    'database_migration',
    'fix_existing_user_roles_migration',
    true,
    jsonb_build_object(
        'migration_name', 'fix_existing_user_roles_migration',
        'description', 'Created functions to identify and fix users with incorrect roles',
        'functions_created', ARRAY['identify_users_needing_author_role', 'fix_user_role_with_audit', 'run_role_migration_with_validation', 'validate_role_migration'],
        'timestamp', NOW()
    ),
    NOW()
);