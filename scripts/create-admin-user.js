#!/usr/bin/env node

/**
 * Create Local Admin User Script
 * 
 * This script creates an admin user using Supabase's auth API instead of
 * direct database manipulation. This is the safe way to create users.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ADMIN_EMAIL = 'neel@conversiondesigner.co';
const ADMIN_PASSWORD = 'Temporary123';
const ADMIN_DISPLAY_NAME = 'Local Admin';
const ADMIN_USERNAME = 'localadmin';

async function createAdminUser() {
  console.log('🚀 Creating local development admin user...');

  // Use local Supabase instance
  const supabaseUrl = 'http://127.0.0.1:54321';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

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
    console.log('');
    console.log('🔗 You can now log in to your local app and approve invitation requests!');

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
      bio: 'Local development admin account for testing invitation approvals',
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

// Check if we're running in local development
async function checkEnvironment() {
  try {
    // Test the API endpoint instead of health endpoint
    const response = await fetch('http://127.0.0.1:54321/rest/v1/', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      }
    });
    if (!response.ok && response.status !== 404) {
      throw new Error('Local Supabase not responding');
    }
    return true;
  } catch (error) {
    console.error('❌ Local Supabase is not running!');
    console.log('');
    console.log('Please start local Supabase first:');
    console.log('   supabase start');
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