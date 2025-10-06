#!/usr/bin/env node

/**
 * Create Remote Admin User Script - Add Email Preview Branch
 * 
 * This script creates an admin user using Supabase's auth API instead of
 * direct database manipulation. This is the safe way to create users.
 * 
 * FOR REMOTE ADD-EMAIL PREVIEW BRANCH ONLY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ADMIN_EMAIL = 'neel@conversiondesigner.co';
const ADMIN_PASSWORD = 'Temporary123';
const ADMIN_DISPLAY_NAME = 'Remote Admin (Add Email Branch)';
const ADMIN_USERNAME = 'remoteadmin';

async function createAdminUser() {
    console.log('🚀 Creating remote admin user for add-email preview branch...');

    // Use remote Supabase preview branch
    const supabaseUrl = 'https://yrudgsfttkqcbqznixzi.supabase.co';
    // Service role key for add-email preview branch
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlydWRnc2Z0dGtxY2Jxem5peHppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYyMzU2NSwiZXhwIjoyMDc1MTk5NTY1fQ.oNV6eOgL4bm6zC0S3ROk8ZGQ9oHaN7ynJ_KgM-V1668';

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        console.log('📧 Creating user with email:', ADMIN_EMAIL);

        // Step 1: Create user using Supabase Auth API
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                display_name: ADMIN_DISPLAY_NAME,
                role: 'admin'
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log('⚠️  User already exists, updating profile...');

                // Get existing user
                const { data: existingUsers } = await supabase.auth.admin.listUsers();
                const existingUser = existingUsers.users.find(u => u.email === ADMIN_EMAIL);

                if (existingUser) {
                    console.log('✅ Found existing user:', existingUser.id);
                    await updateUserProfile(supabase, existingUser.id);
                    return;
                }
            } else {
                throw authError;
            }
        }

        const userId = authData.user.id;
        console.log('✅ User created successfully with ID:', userId);

        // Step 2: Create/update profile with admin role
        await updateUserProfile(supabase, userId);

        console.log('🎉 Admin user setup completed successfully!');
        console.log('');
        console.log('📋 Login Credentials:');
        console.log('   Email:', ADMIN_EMAIL);
        console.log('   Password:', ADMIN_PASSWORD);
        console.log('   Role: admin');
        console.log('   Environment: Remote Add-Email Preview Branch');
        console.log('');
        console.log('🔗 You can now log in to your preview app and approve invitation requests!');

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    }
}

async function updateUserProfile(supabase, userId) {
    console.log('👤 Creating/updating user profile...');

    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: ADMIN_EMAIL,
            display_name: ADMIN_DISPLAY_NAME,
            username: ADMIN_USERNAME,
            bio: 'Remote admin account for testing invitation approvals on add-email preview branch',
            role: 'admin',
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'id'
        });

    if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    console.log('✅ Profile created/updated successfully');
}

// Check if we can connect to the remote Supabase
async function checkEnvironment() {
    try {
        const response = await fetch('https://yrudgsfttkqcbqznixzi.supabase.co/rest/v1/', {
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlydWRnc2Z0dGtxY2Jxem5peHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MjM1NjUsImV4cCI6MjA3NTE5OTU2NX0.w8x14zKW4jKiwOuYVvUhqjsFauxvNTyJozrMZoMztsY'
            }
        });
        if (!response.ok && response.status !== 404) {
            throw new Error('Remote Supabase not responding');
        }
        return true;
    } catch (error) {
        console.error('❌ Cannot connect to remote Supabase preview branch!');
        console.log('');
        console.log('Please check:');
        console.log('1. Your internet connection');
        console.log('2. The preview branch is still active');
        console.log('3. The URL is correct: https://yrudgsfttkqcbqznixzi.supabase.co');
        console.log('');
        process.exit(1);
    }
}

// Main execution
async function main() {
    await checkEnvironment();
    await createAdminUser();
}

main().catch(console.error);