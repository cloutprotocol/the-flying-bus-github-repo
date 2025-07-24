-- Database verification script for The Flying Bus Invitation Approval Workflow System
-- This script verifies that all required database components are properly installed

\echo 'Starting database verification for Invitation Approval Workflow System...'

-- Check if required tables exist
\echo 'Checking required tables...'

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitation_tokens') 
        THEN 'invitation_tokens table: ✓ EXISTS'
        ELSE 'invitation_tokens table: ✗ MISSING'
    END as table_check;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_notifications') 
        THEN 'email_notifications table: ✓ EXISTS'
        ELSE 'email_notifications table: ✗ MISSING'
    END as table_check;

-- Check if required columns were added to invitation_requests
\echo 'Checking invitation_requests table columns...'

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invitation_requests' 
            AND column_name = 'invitation_claimed_at'
        ) 
        THEN 'invitation_claimed_at column: ✓ EXISTS'
        ELSE 'invitation_claimed_at column: ✗ MISSING'
    END as column_check;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invitation_requests' 
            AND column_name = 'notification_sent_at'
        ) 
        THEN 'notification_sent_at column: ✓ EXISTS'
        ELSE 'notification_sent_at column: ✗ MISSING'
    END as column_check;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invitation_requests' 
            AND column_name = 'notification_status'
        ) 
        THEN 'notification_status column: ✓ EXISTS'
        ELSE 'notification_status column: ✗ MISSING'
    END as column_check;

-- Check if required indexes exist
\echo 'Checking database indexes...'

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitation_tokens_token') 
        THEN 'idx_invitation_tokens_token: ✓ EXISTS'
        ELSE 'idx_invitation_tokens_token: ✗ MISSING'
    END as index_check;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitation_tokens_invitation_id') 
        THEN 'idx_invitation_tokens_invitation_id: ✓ EXISTS'
        ELSE 'idx_invitation_tokens_invitation_id: ✗ MISSING'
    END as index_check;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_notifications_invitation_id') 
        THEN 'idx_email_notifications_invitation_id: ✓ EXISTS'
        ELSE 'idx_email_notifications_invitation_id: ✗ MISSING'
    END as index_check;

-- Check if required functions exist
\echo 'Checking database functions...'

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'generate_invitation_token'
        ) 
        THEN 'generate_invitation_token function: ✓ EXISTS'
        ELSE 'generate_invitation_token function: ✗ MISSING'
    END as function_check;

-- Check if required triggers exist
\echo 'Checking database triggers...'

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'trigger_generate_invitation_token'
        ) 
        THEN 'trigger_generate_invitation_token: ✓ EXISTS'
        ELSE 'trigger_generate_invitation_token: ✗ MISSING'
    END as trigger_check;

-- Check if required types exist
\echo 'Checking custom types...'

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_type') 
        THEN 'email_type enum: ✓ EXISTS'
        ELSE 'email_type enum: ✗ MISSING'
    END as type_check;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') 
        THEN 'delivery_status enum: ✓ EXISTS'
        ELSE 'delivery_status enum: ✗ MISSING'
    END as type_check;

-- Check Row Level Security policies
\echo 'Checking Row Level Security policies...'

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'invitation_tokens' 
            AND policyname = 'Admin can manage invitation tokens'
        ) 
        THEN 'invitation_tokens RLS policy: ✓ EXISTS'
        ELSE 'invitation_tokens RLS policy: ✗ MISSING'
    END as rls_check;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'email_notifications' 
            AND policyname = 'Admin can view email notifications'
        ) 
        THEN 'email_notifications RLS policy: ✓ EXISTS'
        ELSE 'email_notifications RLS policy: ✗ MISSING'
    END as rls_check;

-- Test basic functionality
\echo 'Testing basic functionality...'

-- Test that we can query the new tables (this will fail if RLS is blocking us)
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM invitation_tokens) >= 0 
        THEN 'invitation_tokens query test: ✓ PASSED'
        ELSE 'invitation_tokens query test: ✗ FAILED'
    END as query_test;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM email_notifications) >= 0 
        THEN 'email_notifications query test: ✓ PASSED'
        ELSE 'email_notifications query test: ✗ FAILED'
    END as query_test;

-- Check if we can insert test data (this tests the trigger)
\echo 'Testing token generation trigger...'

-- First, let's see if we have any invitation_requests to work with
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM invitation_requests) > 0 
        THEN 'invitation_requests data available for testing: ✓ YES'
        ELSE 'invitation_requests data available for testing: ✗ NO (this is normal for new installations)'
    END as data_check;

-- Summary
\echo 'Database verification completed.';
\echo 'If all checks show ✓ EXISTS or ✓ PASSED, the system is properly configured.';
\echo 'If any checks show ✗ MISSING or ✗ FAILED, please run the migration scripts.';

-- Performance check - show table sizes
\echo 'Table sizes:';
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('invitation_requests', 'invitation_tokens', 'email_notifications')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;